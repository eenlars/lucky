/**
 * Multi-step agent loop implementation with tool orchestration and memory management.
 *
 * This module implements the core execution loop for autonomous agents that can:
 * - Execute multiple tools in sequence based on AI-driven decisions
 * - Track and validate tool outputs with self-checking
 * - Generate learnings and update memory after execution
 * - Handle errors gracefully with fallback mechanisms
 * - Provide detailed execution traces for debugging
 *
 * The loop continues until either:
 * - The AI decides to terminate (goal achieved)
 * - Maximum rounds are reached
 * - An unrecoverable error occurs
 */

import { quickSummaryNull } from "@core/messages/api/genObject"
import { getFinalOutputNodeInvocation } from "@core/messages/api/processResponse"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import { responseToAgentSteps } from "@core/messages/api/vercel/responseToAgentSteps"
import { selectToolStrategyV3 } from "@core/messages/pipeline/selectTool/selectToolStrategyV3"
import { generateSummaryFromUnknownData } from "@core/messages/summaries/createSummary"
import { makeLearning } from "@core/prompts/makeLearning"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { emitAgentToolEnd, emitAgentToolStart } from "@core/utils/observability/agentEvents"
import { type MultiStepLoopContext, toolUsageToString } from "./utils"

/**
 * Executes a multi-step agent loop with tool orchestration and memory updates.
 *
 * @param context - Execution context containing node configuration, tools, and state
 * @returns Processed response with execution trace, debug info, and memory updates
 *
 * @remarks
 * Core execution flow:
 * 1. **Strategy Selection**: AI decides next action (tool or terminate)
 * 2. **Tool Execution**: Runs selected tool with generated parameters
 * 3. **Validation**: Checks tool output against expected results
 * 4. **Memory Update**: Generates learnings from execution
 * 5. **Loop Control**: Continues until termination or max rounds
 *
 * Memory management:
 * - Tracks execution costs throughout the loop
 * - Generates learnings after completion
 * - Updates node memory with new insights
 * - Handles memory persistence failures gracefully
 *
 * Error handling:
 * - Continues execution after tool failures
 * - Provides fallback summaries on errors
 * - Ensures terminal steps for downstream processing
 * - Logs detailed error information for debugging
 */
export async function runMultiStepLoopV3Helper(context: MultiStepLoopContext): Promise<{
  processedResponse: ProcessedResponse
  debugPrompts: string[]
  updatedMemory: Record<string, string>
}> {
  const { ctx, tools, agentSteps, maxRounds, verbose, addCost, setUpdatedMemory, getTotalCost } = context

  const identityPrompt = `
        How you should act: ${ctx.nodeConfig.systemPrompt}
        You are a node within a workflow helping with the main goal: ${ctx.mainWorkflowGoal}
        You are agent ${ctx.nodeConfig.nodeId}
        this is your memory: ${ctx.nodeMemory ? JSON.stringify(ctx.nodeMemory) : "none"}
        `

  // todo-memoryleak: agentSteps array grows unbounded in long-running processes
  // potential fix: implement circular buffer or periodic cleanup of old steps
  const debugPrompts: string[] = []
  for (let round = 0; round < maxRounds; round++) {
    const { strategyResult: strategy, debugPrompt } = await selectToolStrategyV3({
      tools,
      identityPrompt,
      agentSteps: agentSteps,
      roundsLeft: maxRounds - round,
      systemMessage: ctx.nodeConfig.systemPrompt,
      gatewayModelId: ctx.nodeConfig.gatewayModelId,
    })

    debugPrompts.push(llmify(debugPrompt))

    // Track cost from strategy selection
    addCost(strategy.usdCost)

    const isLastRound = round === maxRounds - 1

    // base case: terminate the loop
    // handles both explicit termination and max rounds reached
    if (strategy.type === "terminate" || isLastRound) {
      agentSteps.push({
        type: "reasoning",
        return: strategy.reasoning,
      })

      // check if we have any actionable outputs before termination
      // prevents empty responses when agent only performs reasoning
      const hasActionableOutputs = agentSteps.some(
        log => log.type === "tool" || log.type === "text" || log.type === "terminate",
      )

      if (!hasActionableOutputs) {
        // agent reasoned but produced no output - create explicit "no action" result
        // ensures downstream consumers always receive some output
        agentSteps.push({
          type: "text",
          return: `No action taken based on analysis: ${strategy.reasoning}`,
        })
      }

      const summary = await quickSummaryNull(
        `
            Show the results of all the work that was done, and what you produced. ${toolUsageToString(agentSteps)}
            do it in plain english. show what tools you used, what you produced. max 200 characters. use specific details, but not too specific.
            for example: if you just handled a lot of files, you can say who, what, where, when, why, how. don't talk about only one file.
            `,
        2,
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
        mainWorkflowGoal: ctx.mainWorkflowGoal ?? "Complete the workflow task",
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
          learnings: learningResult.agentStep.type === "learning" ? learningResult.agentStep.return : "",
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

    // strategy must be to use a tool now
    // track mutation expectations for next iteration's strategy
    const mutationMarker = strategy.expectsMutation ? " [EXPECTS_MUTATION]" : ""
    agentSteps.push({
      type: "reasoning",
      return: `${strategy.reasoning} ${strategy.plan} ${strategy.check}${mutationMarker}`,
    })

    const selected = strategy.toolName

    // Log tool selection in multi-step loop
    if (verbose) {
      lgg.log(
        `[InvocationPipeline] Multi-step round ${round + 1}: Selected tool "${String(selected)}" with plan: ${strategy.plan}`,
      )
    }

    // Emit tool.start event
    const toolStartTime = Date.now()
    emitAgentToolStart(ctx.nodeConfig.nodeId, selected, { plan: strategy.plan })

    // execute the tool call
    const {
      data: toolUseResponse,
      success,
      error,
      usdCost,
    } = await sendAI({
      model: ctx.nodeConfig.gatewayModelId,
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

    const toolDuration = Date.now() - toolStartTime

    // Log multi-step tool call results
    if (verbose) {
      lgg.log(`[InvocationPipeline] Multi-step round ${round + 1}: Tool call success: ${success}`)
      if (!success) {
        lgg.error(`[InvocationPipeline] Multi-step round ${round + 1}: Tool call failed: ${error}`)
      }
    }

    addCost(usdCost ?? 0)

    if (!success) {
      // Emit tool.end event with error
      emitAgentToolEnd(ctx.nodeConfig.nodeId, selected, toolDuration, undefined, error ?? "tool execution failed")

      agentSteps.push({
        type: "error",
        return: error ?? "tool execution failed",
      })
      continue
    }

    // Emit tool.end event with success
    emitAgentToolEnd(ctx.nodeConfig.nodeId, selected, toolDuration)

    const { agentSteps: processedAgentSteps, usdCost: processedUsdCost } = responseToAgentSteps({
      response: toolUseResponse,
      modelUsed: ctx.nodeConfig.gatewayModelId,
      nodeId: ctx.nodeConfig.nodeId,
      originatedFrom: `tool_used:${selected}:with_plan:${strategy.plan}`,
    })

    // Immediately summarize each tool step as we append it
    for (const step of processedAgentSteps) {
      if (step.type === "tool") {
        try {
          const { summary, usdCost } = await generateSummaryFromUnknownData(step.return, "1-2 sentences")
          if (summary) step.summary = summary
          addCost(usdCost ?? 0)
        } catch {
          // ignore summary errors; keep original return
        }
      }
      agentSteps.push(step)
    }

    addCost(processedUsdCost)

    // self-check validation
    // validates tool output against expected results defined in strategy
    if (strategy.check && success) {
      const lastOutput = agentSteps[agentSteps.length - 1]
      const outputContent = String(lastOutput?.return || "")

      // robust validation - check for key indicators from the check string
      // extracts keywords/numbers and verifies their presence in output
      const checkKeywords = strategy.check.toLowerCase().match(/\d+|\w+/g) || []
      const hasExpectedContent = checkKeywords.some((keyword: string) => outputContent.toLowerCase().includes(keyword))

      if (!hasExpectedContent) {
        agentSteps.push({
          type: "error",
          return: `Self-check failed: expected "${strategy.check}", but output doesn't contain expected indicators.`,
        })
      }
    }
  }

  // fallback path: loop completed without explicit termination
  // ensures proper cleanup and terminal step for downstream consumers
  const fallbackSummary = await quickSummaryNull(
    `
            Show the results of all the work that was done, and what you produced. ${toolUsageToString(agentSteps)}
            do it in plain english. show what tools you used, what you produced. max 200 characters. use specific details, but not too specific.
            for example: if you just handled a lot of files, you can say who, what, where, when, why, how. don't talk about only one file.
            `,
    2,
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
    mainWorkflowGoal: ctx.mainWorkflowGoal ?? "Complete the workflow task",
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
      learnings: fallbackLearning.agentStep.type === "learning" ? fallbackLearning.agentStep.return : "",
    },
    debugPrompts,
    updatedMemory: fallbackLearning.updatedMemory,
  }
}
