/**
 * sequentialRunner.ts - Modified runner for sequential tool execution tracking
 * Tracks execution order, timestamps, and data flow between tools
 */
import { processResponseVercel } from "@lucky/core/messages/api/processResponse"
import { sendAI } from "@lucky/core/messages/api/sendAI/sendAI"
import { lgg } from "@lucky/core/utils/logging/Logger"
import type { ModelName } from "@lucky/core/utils/spending/models.types"
import type { ModelMessage, ToolSet } from "ai"
import type { SequentialRunResult, ToolExecution } from "./types"

export async function runSequentialTools(
  model: ModelName,
  userContent: string,
  tools: ToolSet,
  systemPrompt?: string,
  maxSteps?: number,
): Promise<SequentialRunResult> {
  const overallStart = Date.now()
  const messages: ModelMessage[] = [
    {
      role: "system",
      content:
        systemPrompt ||
        [
          "You are an evaluation agent. Your only job is to complete the user's request by calling the provided tools.",
          "Rules:",
          "- Do not narrate steps. Do not guess values you could obtain via a tool.",
          "- Use each relevant tool exactly once when needed. Do not call extra tools.",
          "- Maintain strict data flow: pass the previous tool's output as the next tool's input parameter.",
          "- Stop calling tools when the task is complete; then return the final answer only.",
        ].join("\n"),
    },
    { role: "user", content: userContent },
  ]

  const toolExecutions: ToolExecution[] = []
  let executionIndex = 0
  let finalResponse = ""
  let success = false
  let totalCostUsd = 0

  try {
    const resp = await sendAI({
      mode: "tool",
      messages,
      model,
      opts: {
        tools,
        toolChoice: "auto",
        maxSteps: maxSteps ?? 6,
        reasoning: false,
        // Let the model use multiple steps; default maxSteps from config will apply
      },
    })

    if (!resp.success) {
      lgg.error(`sendAI failed: ${resp.error}`)
      finalResponse = `Execution error: ${resp.error}`
      const totalDurationMs = Date.now() - overallStart
      return {
        messages,
        toolExecutions,
        finalResponse,
        success: false,
        totalDurationMs,
        totalCostUsd: resp.usdCost ?? 0,
      }
    }

    // Normalize via core response processor to capture step tool args/returns
    const processed = processResponseVercel({
      response: resp.data,
      modelUsed: model,
      nodeId: "sequential-runner",
    })

    // Capture session cost from sendAI
    totalCostUsd = resp.usdCost ?? 0

    if (processed.type === "tool" && processed.agentSteps) {
      for (const out of processed.agentSteps) {
        const kind = (out as any).type
        if (kind === "tool") {
          const name = (out as any).name as string
          const args = ((out as any).args ?? {}) as Record<string, unknown>
          const ret = (out as any).return
          toolExecutions.push({
            toolName: name,
            timestamp: Date.now(),
            inputData: args,
            outputData: ret,
            executionIndex: executionIndex++,
          })
        }
      }
    }

    // Final text (best-effort)
    finalResponse = (resp.data as any)?.text || ""
    success = true
    if (finalResponse) {
      messages.push({ role: "assistant", content: finalResponse })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    lgg.error("Error in runSequentialTools:", errorMessage)
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        finalResponse = "Rate limit exceeded. Please try again later."
      } else if (error.message.includes("API key")) {
        finalResponse = "API authentication error. Please check your API key."
      } else {
        finalResponse = `Execution error: ${errorMessage}`
      }
    } else {
      finalResponse = "Unknown error occurred during execution"
    }
  }

  const totalDurationMs = Date.now() - overallStart
  return {
    messages,
    toolExecutions,
    finalResponse,
    success,
    totalDurationMs,
    totalCostUsd,
  }
}
