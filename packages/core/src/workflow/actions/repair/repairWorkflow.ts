import { getModels } from "@/config"
import { lgg } from "@/logger"
import { sendAI } from "@/messages/api/sendAI"
import type { RS } from "@/utils/types"
import type { VerificationResult } from "@/utils/validation/workflow/verify.types"
import { WorkflowRepairPrompts } from "@workflow/actions/repair/repairWorkflow.p"
import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@workflow/schema/workflow.types"

/**
 * when a workflow contains errors,
 * this function attempts to fix the errors.
 */
export async function repairWorkflow(
  config: WorkflowConfig,
  verificationResult: VerificationResult
): Promise<
  RS<{
    nodes: WorkflowNodeConfig[]
    summary?: string
  }>
> {
  // if workflow is valid with no warnings, no enhancement needed
  if (verificationResult.isValid) {
    return {
      success: true,
      error: undefined,
      data: {
        nodes: config.nodes,
      },
      usdCost: 0,
    }
  }

  // build enhancement prompt
  const verificationSummary = [
    ...verificationResult.errors.map((error) => `ERROR: ${error}`),
  ].join("\n")

  const { data, success, error, usdCost } = await sendAI({
    messages: WorkflowRepairPrompts.repairWorkflowPrompt(
      config,
      verificationSummary
    ),
    model: getModels().medium,
    mode: "structured",
    schema: WorkflowRepairPrompts.expectedOutput,
  })

  if (!success) {
    lgg.error("❌ Failed to repair workflow:", error)
    throw new Error(`Workflow repair failed: ${error}`)
  }

  if (!data) {
    lgg.error("❌ Failed to repair workflow: no data returned")
    throw new Error("Workflow repair failed: no data returned")
  }

  lgg.log(`✅ Workflow repair completed, changes: ${data.summary}`)

  return {
    success: true,
    error: undefined,
    data: {
      nodes: data.nodes as WorkflowNodeConfig[],
      summary: data.summary,
    },
    usdCost,
  }
}
