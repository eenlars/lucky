/**
 * multiToolV3Runner.ts - Integrate core MultiStep v3 strategy into the context-adaptation experiment
 *
 * Uses the core runMultiStepLoopV3Helper with the experiment's adaptive tools to evaluate
 * adaptive behavior under hidden tool constraints. Mirrors the core pipeline setup used in
 * MultiStep3.integration.test while remaining self-contained for this experiment.
 */

import type { ToolSet } from "ai"
import { WorkflowMessage } from "../../../../../../core/src/messages/WorkflowMessage"
import type { NodeInvocationCallContext } from "../../../../../../core/src/node/InvocationPipeline"
import { runMultiStepLoopV3Helper } from "../../../../../../core/src/node/strategies/MultiStepLoopV3"
import type { ModelName } from "../../../../../../core/src/utils/spending/models.types"
import { CONFIG } from "../../../../../../runtime/settings/constants"

import { adaptiveTools } from "../../shared/tools/adaptive/adaptiveTools"
import type { ToolExecution } from "../02-sequential-chains/types"

export interface V3RunResult {
  toolExecutions: ToolExecution[]
  finalResponse: string
  success: boolean
  totalCostUsd: number
  debugPrompts: string[]
  updatedMemory?: Record<string, string> | null
  learnings?: string
  toolUsageOutputs?: any[]
}

/**
 * Compose a strong system prompt that includes the experimental condition and the user task.
 */
function buildNodeSystemPrompt(
  baseSystemPrompt: string | undefined,
  _userTask: string
): string {
  // For fair comparison with baseline, use the provided system prompt as-is.
  // Fall back to a minimal default if none provided.
  return (
    baseSystemPrompt?.trim() ||
    "You are a helpful assistant with tools. Use them to complete the user's request."
  )
}

/**
 * Run the MultiStep v3 loop against a provided ToolSet (defaults to adaptive tools).
 * We mock the minimal workflow context required by the helper.
 */
export async function runMultiToolV3(
  model: ModelName,
  userTask: string,
  tools: ToolSet = adaptiveTools,
  baseSystemPrompt?: string,
  initialMemory: Record<string, string> = {}
): Promise<V3RunResult> {
  const nodeId = "context-adapt-v3-node"
  const workflowInvocationId = `v3-adapt-${Date.now()}`
  const workflowVersionId = "v3-adapt-version"
  const nodeSystemPrompt = buildNodeSystemPrompt(baseSystemPrompt, userTask)

  const workflowMessageIncoming = new WorkflowMessage({
    fromNodeId: "start",
    toNodeId: nodeId,
    seq: 1,
    payload: {
      kind: "sequential" as const,
      prompt: userTask,
    },
    wfInvId: workflowInvocationId,
    originInvocationId: null,
    skipDatabasePersistence: true,
  })

  // Minimal mock for the helper – mirrors MultiStep3.integration.test
  const ctx: NodeInvocationCallContext = {
    nodeId,
    workflowMessageIncoming,
    workflowInvocationId,
    startTime: new Date().toISOString(),
    handOffs: ["end"],
    nodeDescription: "Context adaptation experiment node (v3)",
    nodeSystemPrompt,
    replyMessage: null,
    workflowVersionId,
    // Provide the concrete user goal here so the strategy sees the exact request
    mainWorkflowGoal: userTask,
    model,
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "wf-prompt-test",
    nodeMemory: initialMemory,
    skipDatabasePersistence: true,
    workflowConfig: undefined,
    toolStrategyOverride: "v3",
  }

  // Mutable state for the helper
  const toolUsage: any[] = []
  let totalCost = 0
  let _updatedMemory: Record<string, string> | null = null

  const { processedResponse, debugPrompts } = await runMultiStepLoopV3Helper({
    ctx,
    tools,
    agentSteps: toolUsage,
    model,
    maxRounds: CONFIG.tools.experimentalMultiStepLoopMaxRounds,
    verbose: CONFIG.logging.override.Tools ?? false,
    addCost: (c: number) => {
      totalCost += c || 0
    },
    setUpdatedMemory: (m: Record<string, string>) => {
      _updatedMemory = m
    },
    getTotalCost: () => totalCost,
  })

  // Extract tool executions in a format consistent with the baseline sequential runner
  const execs: ToolExecution[] = []
  let executionIndex = 0
  if (
    processedResponse.agentSteps &&
    Array.isArray(processedResponse.agentSteps)
  ) {
    for (const out of processedResponse.agentSteps as any[]) {
      if (out?.type === "tool") {
        execs.push({
          toolName: String(out.name || "unknown"),
          timestamp: Date.now(),
          inputData: (out.args ?? {}) as Record<string, unknown>,
          outputData: out.return,
          executionIndex: executionIndex++,
        })
      }
    }
  }

  const finalResponse =
    (processedResponse as any).summary ||
    (processedResponse as any).content ||
    (processedResponse as any).message ||
    ""

  const success = processedResponse.type !== "error"

  return {
    toolExecutions: execs,
    finalResponse,
    success,
    totalCostUsd: totalCost,
    debugPrompts,
    updatedMemory: _updatedMemory,
    learnings: (processedResponse as any)?.learnings,
    toolUsageOutputs: processedResponse.agentSteps,
  }
}

// Quick self-test when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = async () => {
    const model =
      CONFIG.models.provider === "openrouter"
        ? ("openai/gpt-4.1-mini" as ModelName)
        : ("gpt-4.1-mini" as unknown as ModelName)
    const userTask =
      "Fetch 5 objects with the query 'item' and combine results."
    const systemPrompt =
      "You are a helpful assistant with tools. If a tool fails, retry with adjusted parameters to reach the requested item count."

    console.log("[v3 demo] starting...")
    const result = await runMultiToolV3(
      model,
      userTask,
      adaptiveTools,
      systemPrompt
    )
    console.log(
      "[v3 demo] tool calls:",
      result.toolExecutions.map((t) => ({
        name: t.toolName,
        args: t.inputData,
      }))
    )
    console.log("[v3 demo] final:", {
      success: result.success,
      cost: result.totalCostUsd,
      text: result.finalResponse?.slice(0, 160),
    })
  }

  demo().catch((e) => {
    console.error("[v3 demo] error:", e)
    process.exit(1)
  })
}
