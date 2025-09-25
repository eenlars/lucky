import { quickSummaryNull } from "@core/messages/api/genObject"
import { getFinalOutputNodeInvocation, processResponseVercel } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
  type ProcessedResponse,
} from "@core/messages/api/vercel/processResponse.types"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import { selectToolStrategyV2 } from "@core/messages/pipeline/selectTool/selectToolStrategyV2"
import { makeLearning } from "@core/prompts/makeLearning"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { toolUsageToString, type MultiStepLoopContext } from "./utils"

export async function runMultiStepLoopV2Helper(context: MultiStepLoopContext): Promise<ProcessedResponse> {
  const { ctx, tools, agentSteps, maxRounds, verbose, addCost, setUpdatedMemory, getTotalCost } = context

  const userMessage = extractTextFromPayload(ctx.workflowMessageIncoming.payload)

  const identityPrompt = `
        How you should act: ${ctx.nodeConfig.systemPrompt}
        You are a node within a workflow helping with the main goal: ${ctx.mainWorkflowGoal}
        this is your memory: ${ctx.nodeMemory ? JSON.stringify(ctx.nodeMemory) : "none"}
        incoming_input: ${userMessage || "<no user input provided>"}
        `

  // todo-memoryleak: agentSteps array grows unbounded in long-running processes
  for (let round = 0; round < maxRounds; round++) {
    const strategy = await selectToolStrategyV2({
      tools,
      identityPrompt,
      agentSteps: agentSteps,
      roundsLeft: maxRounds - round,
      systemMessage: ctx.nodeConfig.systemPrompt,
      model: ctx.nodeConfig.modelName,
    })

    // Track cost from strategy selection
    addCost(strategy.usdCost)

    const isLastRound = round === maxRounds - 1

    // base case: terminate the loop.
    if (strategy.type === "terminate" || isLastRound) {
      agentSteps.push({
        type: "reasoning",
        return: strategy.reasoning,
      })

      // Check if we have any actionable outputs before termination
      const hasActionableOutputs = agentSteps.some(
        (log) => log.type === "tool" || log.type === "text" || log.type === "terminate"
      )

      if (!hasActionableOutputs) {
        // Agent reasoned but produced no output - create explicit "no action" result
        agentSteps.push({
          type: "text",
          return: "No action taken based on analysis: " + strategy.reasoning,
        })
      }

      const summary = await quickSummaryNull(
        `
            Show the results of all the work that was done, and what you produced. ${toolUsageToString(agentSteps)}
            do it in plain english. show what tools you used, what you produced. max 200 characters. use specific details, but not too specific.
            for example: if you just handled a lot of files, you can say who, what, where, when, why, how. don't talk about only one file.
            `,
        2
      )

      if (!summary) {
        return {
          nodeId: ctx.nodeConfig.nodeId,
          type: "error",
          message: "i had an error processing my findings after 2 retries.",
          agentSteps,
          cost: getTotalCost(),
        }
      }

      const finalOutput = getFinalOutputNodeInvocation(agentSteps)

      const learningResult = await makeLearning({
        toolLogs: toolUsageToString(agentSteps),
        nodeSystemPrompt: ctx.nodeConfig.systemPrompt,
        currentMemory: ctx.nodeMemory ?? {},
        mainWorkflowGoal: ctx.mainWorkflowGoal,
      })

      if (learningResult.agentStep.type !== "error") {
        // Store the memory updates
        setUpdatedMemory(learningResult.updatedMemory)
      } else {
        lgg.error("learningResult", learningResult.agentStep.return)
      }

      agentSteps.push(learningResult.agentStep)

      agentSteps.push({
        type: "terminate",
        return: finalOutput,
        summary: summary,
      })

      // makeLearning doesn't return a cost, so no additional cost to add
      const cost = 0

      return {
        nodeId: ctx.nodeConfig.nodeId,
        type: "tool",
        agentSteps,
        cost,
        summary: summary ?? "an error occurred. no summary found.",
        learnings: learningResult.agentStep.type === "learning" ? (learningResult.agentStep.return as string) : "",
      }
    }

    if (strategy.type === "error") {
      agentSteps.push({
        type: "error",
        return: strategy.reasoning,
      })
      continue
    }

    // strategy must be to use a tool now.
    agentSteps.push({
      type: "reasoning",
      return: strategy.reasoning + " " + strategy.plan,
    })

    const selected = strategy.toolName

    // Log tool selection in multi-step loop
    if (verbose) {
      lgg.log(
        `[InvocationPipeline] Multi-step round ${round + 1}: Selected tool "${String(selected)}" with plan: ${strategy.plan}`
      )
    }

    const {
      data: toolUseResponse,
      success,
      error,
      usdCost,
    } = await sendAI({
      model: ctx.nodeConfig.modelName,
      mode: "tool",
      debug: true,
      messages: [
        {
          role: "system",
          content: identityPrompt,
        },
        {
          role: "user",
          content: strategy.plan,
        },
      ],
      opts: {
        tools: { [selected]: tools[selected] },
        toolChoice: { type: "tool", toolName: selected },
        maxSteps: 1,
        // if the tool input is incorrect, it should not repair.
        repair: false,
      },
    })

    // Log multi-step tool call results
    if (verbose) {
      lgg.log(`[InvocationPipeline] Multi-step round ${round + 1}: Tool call success: ${success}`)
      if (!success) {
        lgg.error(`[InvocationPipeline] Multi-step round ${round + 1}: Tool call failed: ${error}`)
      }
    }

    addCost(usdCost ?? 0)

    if (!success) {
      agentSteps.push({
        type: "error",
        return: error ?? "tool execution failed",
      })
      continue
    }

    const processed = processResponseVercel({
      response: toolUseResponse,
      modelUsed: ctx.nodeConfig.modelName,
      nodeId: ctx.nodeConfig.nodeId,
    })

    // we need this, it helps parse the json output of the tool.
    if (isToolProcessed(processed)) {
      agentSteps.push(...processed.agentSteps)
    } else if (isTextProcessed(processed)) {
      agentSteps.push({
        type: "text",
        return: processed.content,
      })
    } else if (isErrorProcessed(processed)) {
      const details = processed.details ? " details:" + truncater(JSON.stringify(processed.details), 100) : ""
      agentSteps.push({
        type: "error",
        return: processed.message + details,
      })
    } else {
      agentSteps.push({
        type: "text",
        return: "unknown type of output: " + JSON.stringify(processed),
      })
    }
  }

  return {
    nodeId: ctx.nodeConfig.nodeId,
    type: "tool",
    agentSteps,
    cost: getTotalCost(),
    summary: getFinalOutputNodeInvocation(agentSteps) ?? "no summary found",
  }
}
