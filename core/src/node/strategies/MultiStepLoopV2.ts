import { quickSummaryNull } from "@core/messages/api/genObject"
import {
  getFinalOutputNodeInvocation,
  processVercelResponse,
} from "@core/messages/api/processResponse"
import {
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
  type ProcessedResponse,
} from "@core/messages/api/processResponse.types"
import { sendAI } from "@core/messages/api/sendAI"
import { extractPromptFromPayload } from "@core/messages/MessagePayload"
import { makeLearning } from "@core/prompts/makeLearning"
import { selectToolStrategyV2 } from "@core/tools/any/selectToolStrategyV2"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { getDefaultModels } from "@runtime/settings/models"
import type { CoreMessage } from "ai"
import { toolUsageToString, type MultiStepLoopContext } from "./utils"

export async function runMultiStepLoopV2Helper(
  context: MultiStepLoopContext
): Promise<ProcessedResponse> {
  const {
    ctx,
    tools,
    toolUsage,
    maxRounds,
    verbose,
    addCost,
    setUpdatedMemory,
    getTotalCost,
  } = context

  const userMessage = extractPromptFromPayload(
    ctx.workflowMessageIncoming.payload
  )

  const currentMessages: CoreMessage[] = [
    {
      role: "system",
      content: `
        How you should act: ${ctx.nodeSystemPrompt}
        You are a node within a workflow helping with the main goal: ${ctx.mainWorkflowGoal}
        this is your memory: ${ctx.nodeMemory ? JSON.stringify(ctx.nodeMemory) : "none"}
        `,
    },
    {
      role: "user",
      content: userMessage,
    },
  ]

  // todo-memoryleak: toolUsage array grows unbounded in long-running processes
  for (let round = 0; round < maxRounds; round++) {
    const strategy = await selectToolStrategyV2({
      tools,
      messages: currentMessages,
      nodeLogs: toolUsage,
      roundsLeft: maxRounds - round,
      systemMessage: ctx.nodeSystemPrompt,
      model: ctx.model,
    })

    // Track cost from strategy selection
    addCost(strategy.usdCost)

    const isLastRound = round === maxRounds - 1

    // base case: terminate the loop.
    if (strategy.type === "terminate" || isLastRound) {
      toolUsage.push({
        type: "reasoning",
        return: strategy.reasoning,
      })

      // Check if we have any actionable outputs before termination
      const hasActionableOutputs = toolUsage.some(
        (log) =>
          log.type === "tool" || log.type === "text" || log.type === "terminate"
      )

      if (!hasActionableOutputs) {
        // Agent reasoned but produced no output - create explicit "no action" result
        toolUsage.push({
          type: "text",
          return: "No action taken based on analysis: " + strategy.reasoning,
        })
      }

      const summary = await quickSummaryNull(
        `
            Show the results of all the work that was done, and what you produced. ${toolUsageToString(toolUsage)}
            do it in plain english. show what tools you used, what you produced. max 200 characters. use specific details, but not too specific.
            for example: if you just handled a lot of files, you can say who, what, where, when, why, how. don't talk about only one file.
            `,
        2
      )

      if (!summary) {
        return {
          nodeId: ctx.nodeId,
          type: "error",
          message: "i had an error processing my findings after 2 retries.",
          toolUsage: { outputs: toolUsage, totalCost: getTotalCost() },
          cost: getTotalCost(),
        }
      }

      const finalOutput = getFinalOutputNodeInvocation(toolUsage)

      const learningResult = await makeLearning({
        toolLogs: toolUsageToString(toolUsage),
        nodeSystemPrompt: ctx.nodeSystemPrompt,
        currentMemory: ctx.nodeMemory ?? {},
      })

      if (learningResult.learning.type !== "error") {
        // Store the memory updates
        setUpdatedMemory(learningResult.updatedMemory)
      } else {
        lgg.error("learningResult", learningResult)
      }

      toolUsage.push(learningResult.learning)

      toolUsage.push({
        type: "terminate",
        return: finalOutput,
        summary: summary,
      })

      // makeLearning doesn't return a cost, so no additional cost to add
      const cost = 0

      return {
        nodeId: ctx.nodeId,
        type: "tool",
        toolUsage: { outputs: toolUsage, totalCost: getTotalCost() },
        cost,
        summary: summary ?? "an error occurred. no summary found.",
        learnings: learningResult.learning.return,
      }
    }

    if (strategy.type === "error") {
      toolUsage.push({
        type: "error",
        return: strategy.reasoning,
      })
      continue
    }

    // strategy must be to use a tool now.
    toolUsage.push({
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
      model: ctx.model,
      mode: "tool",
      debug: true,
      messages: [
        ...currentMessages,
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
      lgg.log(
        `[InvocationPipeline] Multi-step round ${round + 1}: Tool call success: ${success}`
      )
      if (!success) {
        lgg.error(
          `[InvocationPipeline] Multi-step round ${round + 1}: Tool call failed: ${error}`
        )
      }
    }

    addCost(usdCost ?? 0)

    if (!success) {
      toolUsage.push({
        type: "error",
        return: error ?? "tool execution failed",
      })
      continue
    }

    const processed = await processVercelResponse({
      response: toolUseResponse,
      model: getDefaultModels().medium,
      nodeId: ctx.nodeId,
    })

    // we need this, it helps parse the json output of the tool.
    if (isToolProcessed(processed)) {
      toolUsage.push(...processed.toolUsage.outputs)
    } else if (isTextProcessed(processed)) {
      toolUsage.push({
        type: "text",
        return: processed.content,
      })
    } else if (isErrorProcessed(processed)) {
      const details = processed.details
        ? " details:" + truncater(JSON.stringify(processed.details), 100)
        : ""
      toolUsage.push({
        type: "error",
        return: processed.message + details,
      })
    } else {
      toolUsage.push({
        type: "text",
        return: "unknown type of output: " + JSON.stringify(processed),
      })
    }
  }

  return {
    nodeId: ctx.nodeId,
    type: "tool",
    toolUsage: { outputs: toolUsage, totalCost: getTotalCost() },
    cost: getTotalCost(),
    summary: getFinalOutputNodeInvocation(toolUsage) ?? "no summary found",
  }
}
