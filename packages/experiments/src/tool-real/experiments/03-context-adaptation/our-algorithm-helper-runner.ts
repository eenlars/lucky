/**
 * multiToolOurAlgorithmRunner.ts - Integrate core MultiStep our-algorithm strategy into the context-adaptation experiment
 *
 * Uses the core runMultiStepLoopV3Helper with the experiment's adaptive tools to evaluate
 * adaptive behavior under hidden tool constraints. Mirrors the core pipeline setup used in
 * MultiStep3.integration.test while remaining self-contained for this experiment.
 */

import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { runMultiStepLoopV3Helper } from "@core/messages/pipeline/agentStepLoop/MultiStepLoopV3"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import type { ModelName } from "@core/utils/spending/models.types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@examples/settings/constants"
import type { ToolSet } from "ai"

import { adaptiveTools } from "../../shared/tools/adaptive/adaptiveTools"
import type { ToolExecution } from "../02-sequential-chains/types"

export interface OurAlgorithmRunResult {
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
function buildNodeSystemPrompt(baseSystemPrompt: string | undefined, _userTask: string): string {
  // For fair comparison with baseline, use the provided system prompt as-is.
  // Fall back to a minimal default if none provided.
  return baseSystemPrompt?.trim() || "You are a helpful assistant with tools. Use them to complete the user's request."
}

/**
 * Run the MultiStep our-algorithm loop against a provided ToolSet (defaults to adaptive tools).
 * We mock the minimal workflow context required by the helper.
 */
export async function runMultiToolOurAlgorithm(
  model: ModelName,
  userTask: string,
  tools: ToolSet = adaptiveTools,
  baseSystemPrompt?: string,
  initialMemory: Record<string, string> = {},
): Promise<OurAlgorithmRunResult> {
  const nodeId = "context-adapt-our-algorithm-node"
  const workflowInvocationId = `our-algorithm-adapt-${Date.now()}`
  const workflowVersionId = "our-algorithm-adapt-version"
  const nodeSystemPrompt = buildNodeSystemPrompt(baseSystemPrompt, userTask)

  const workflowMessageIncoming = new WorkflowMessage({
    fromNodeId: "start",
    toNodeId: nodeId,
    seq: 1,
    payload: {
      kind: "sequential" as const,
      berichten: [
        {
          type: "text",
          text: userTask,
        },
      ],
    },
    wfInvId: workflowInvocationId,
    originInvocationId: null,
    skipDatabasePersistence: true,
  })

  // Minimal mock for the helper – mirrors MultiStep3.integration.test
  const nodeConfig: WorkflowNodeConfig = {
    nodeId,
    description: "Context adaptation experiment node (our-algorithm)",
    systemPrompt: nodeSystemPrompt,
    modelName: model,
    mcpTools: [],
    codeTools: [],
    handOffs: ["end"],
    memory: initialMemory,
  }

  const ctx: NodeInvocationCallContext = {
    // InvocationContext fields
    workflowId: "wf-prompt-test",
    workflowVersionId,
    workflowInvocationId,
    workflowFiles: [],
    expectedOutputType: undefined,
    mainWorkflowGoal: userTask,

    // NodeInvocationCallContext fields
    startTime: new Date().toISOString(),
    workflowMessageIncoming,
    nodeConfig,
    nodeMemory: initialMemory,
    workflowConfig: undefined,
    skipDatabasePersistence: true,
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
  if (processedResponse.agentSteps && Array.isArray(processedResponse.agentSteps)) {
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
    (processedResponse as any).summary || (processedResponse as any).content || (processedResponse as any).message || ""

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
    const userTask = "Fetch 5 objects with the query 'item' and combine results."
    const systemPrompt =
      "You are a helpful assistant with tools. If a tool fails, retry with adjusted parameters to reach the requested item count."

    console.log("[our-algorithm demo] starting...")
    const result = await runMultiToolOurAlgorithm(model, userTask, adaptiveTools, systemPrompt)
    console.log(
      "[our-algorithm demo] tool calls:",
      result.toolExecutions.map(t => ({
        name: t.toolName,
        args: t.inputData,
      })),
    )
    console.log("[our-algorithm demo] final:", {
      success: result.success,
      cost: result.totalCostUsd,
      text: result.finalResponse?.slice(0, 160),
    })
  }

  demo().catch(e => {
    console.error("[our-algorithm demo] error:", e)
    process.exit(1)
  })
}
