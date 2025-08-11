import { quickSummaryNull } from "@core/messages/api/genObject"
import { getFinalOutputNodeInvocation } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { type ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import { responseToAgentSteps } from "@core/messages/api/vercel/responseToAgentSteps"
import { selectToolStrategyV3 } from "@core/messages/pipeline/selectTool/selectToolStrategyV3"
import { makeLearning } from "@core/prompts/makeLearning"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { toolUsageToString, type MultiStepLoopContext } from "./utils"

export async function runMultiStepLoopV3Helper(
  context: MultiStepLoopContext
): Promise<{
  processedResponse: ProcessedResponse
  debugPrompts: string[]
  updatedMemory: Record<string, string>
}> {
  const {
    ctx,
    tools,
    agentSteps,
    maxRounds,
    verbose,
    addCost,
    setUpdatedMemory,
    getTotalCost,
  } = context

  const identityPrompt = `
        How you should act: ${ctx.nodeConfig.systemPrompt}
        You are a node within a workflow helping with the main goal: ${ctx.mainWorkflowGoal}
        this is your memory: ${ctx.nodeMemory ? JSON.stringify(ctx.nodeMemory) : "none"}
        `

  // todo-memoryleak: agentSteps array grows unbounded in long-running processes
  const debugPrompts: string[] = []
  for (let round = 0; round < maxRounds; round++) {
    const { strategyResult: strategy, debugPrompt } =
      await selectToolStrategyV3({
        tools,
        identityPrompt,
        agentSteps: agentSteps,
        roundsLeft: maxRounds - round,
        systemMessage: ctx.nodeConfig.systemPrompt,
        model: ctx.nodeConfig.modelName,
      })

    debugPrompts.push(llmify(debugPrompt))

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
        (log) =>
          log.type === "tool" || log.type === "text" || log.type === "terminate"
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
          processedResponse: {
            nodeId: ctx.nodeConfig.nodeId,
            type: "error",
            message: "i had an error processing my findings after 2 retries.",
            agentSteps,
            cost: getTotalCost(),
          },
          debugPrompts: [debugPrompt],
          updatedMemory: ctx.nodeMemory ?? {},
        }
      }

      const finalOutput = getFinalOutputNodeInvocation(agentSteps)

      const learningResult = await makeLearning({
        toolLogs: toolUsageToString(agentSteps),
        nodeSystemPrompt: ctx.nodeConfig.systemPrompt,
        currentMemory: ctx.nodeMemory ?? {},
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
        return: finalOutput ?? summary ?? "",
        summary: summary,
      })

      // makeLearning doesn't return a cost, so no additional cost to add
      const cost = 0

      return {
        processedResponse: {
          nodeId: ctx.nodeConfig.nodeId,
          type: "tool",
          agentSteps,
          cost,
          summary: summary ?? "an error occurred. no summary found.",
          learnings:
            learningResult.agentStep.type === "learning"
              ? learningResult.agentStep.return
              : "",
        },
        debugPrompts,
        updatedMemory: learningResult.updatedMemory,
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
    const mutationMarker = strategy.expectsMutation ? " [EXPECTS_MUTATION]" : ""
    agentSteps.push({
      type: "reasoning",
      return:
        strategy.reasoning +
        " " +
        strategy.plan +
        " " +
        strategy.check +
        mutationMarker,
    })

    const selected = strategy.toolName

    // Log tool selection in multi-step loop
    if (verbose) {
      lgg.log(
        `[InvocationPipeline] Multi-step round ${round + 1}: Selected tool "${String(selected)}" with plan: ${strategy.plan}`
      )
    }

    // execute the tool call
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
      agentSteps.push({
        type: "error",
        return: error ?? "tool execution failed",
      })
      continue
    }

    const { agentSteps: processedAgentSteps, usdCost: processedUsdCost } =
      responseToAgentSteps({
        response: toolUseResponse,
        modelUsed: ctx.nodeConfig.modelName,
        nodeId: ctx.nodeConfig.nodeId,
      })

    agentSteps.push(...processedAgentSteps)

    addCost(processedUsdCost)

    // SELF-CHECK VALIDATION
    if (strategy.check && success) {
      const lastOutput = agentSteps[agentSteps.length - 1]
      const outputContent = String(lastOutput?.return || "")

      // More robust validation - check for key indicators from the check string
      const checkKeywords = strategy.check.toLowerCase().match(/\d+|\w+/g) || []
      const hasExpectedContent = checkKeywords.some((keyword) =>
        outputContent.toLowerCase().includes(keyword)
      )

      if (!hasExpectedContent) {
        agentSteps.push({
          type: "error",
          return: `Self-check failed: expected "${strategy.check}", but output doesn't contain expected indicators.`,
        })
      }
    }
  }

  // If we reached here, the loop completed without hitting the early termination return.
  // We still want to guarantee a terminal step for downstream consumers.
  const fallbackSummary = await quickSummaryNull(
    `
            Show the results of all the work that was done, and what you produced. ${toolUsageToString(agentSteps)}
            do it in plain english. show what tools you used, what you produced. max 200 characters. use specific details, but not too specific.
            for example: if you just handled a lot of files, you can say who, what, where, when, why, how. don't talk about only one file.
            `,
    2
  )

  if (!fallbackSummary) {
    return {
      processedResponse: {
        nodeId: ctx.nodeConfig.nodeId,
        type: "error",
        message: "i had an error processing my findings after 2 retries.",
        agentSteps,
        cost: getTotalCost(),
      },
      debugPrompts,
      updatedMemory: ctx.nodeMemory ?? {},
    }
  }

  const fallbackFinalOutput = getFinalOutputNodeInvocation(agentSteps)

  const fallbackLearning = await makeLearning({
    toolLogs: toolUsageToString(agentSteps),
    nodeSystemPrompt: ctx.nodeConfig.systemPrompt,
    currentMemory: ctx.nodeMemory ?? {},
  })

  if (fallbackLearning.agentStep.type !== "error") {
    setUpdatedMemory(fallbackLearning.updatedMemory)
  } else {
    lgg.error("learningResult", fallbackLearning.agentStep.return)
  }

  agentSteps.push(fallbackLearning.agentStep)

  agentSteps.push({
    type: "terminate",
    return: fallbackFinalOutput ?? fallbackSummary ?? "",
    summary: fallbackSummary,
  })

  return {
    processedResponse: {
      nodeId: ctx.nodeConfig.nodeId,
      type: "tool",
      agentSteps,
      cost: getTotalCost(),
      summary: fallbackSummary ?? "an error occurred. no summary found.",
      learnings:
        fallbackLearning.agentStep.type === "learning"
          ? fallbackLearning.agentStep.return
          : "",
    },
    debugPrompts,
    updatedMemory: fallbackLearning.updatedMemory,
  }
}
