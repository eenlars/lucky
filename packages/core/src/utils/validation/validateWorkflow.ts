import { truncater } from "@utils/common/llmify"
import { verifyWorkflowConfig } from "@utils/validation/workflow"
import type { VerificationResult } from "@utils/validation/workflow/verify.types"
import { lgg } from "@logger"
import { getSettings, getLogging } from "@utils/config/runtimeConfig"
import { repairWorkflow } from "@workflow/actions/repair/repairWorkflow"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

const MAX_RETRIES = getSettings().improvement.flags.maxRetriesForWorkflowRepair

/**
 * Validates and optionally repairs a workflow configuration with customizable behavior.
 * @param initialConfig - The workflow config to validate/repair.
 * @param options - Customization: maxRetries (default MAX_RETRIES), onFail ('throw' or 'returnNull', default 'throw').
 * @returns { finalConfig: WorkflowConfig | null, cost: number } - Repaired config or null on failure, with total cost.
 */
export async function validateAndRepairWorkflow(
  initialConfig: WorkflowConfig,
  options: { maxRetries?: number; onFail?: "throw" | "returnNull" } = {}
): Promise<{ finalConfig: WorkflowConfig | null; cost: number }> {
  const { maxRetries = MAX_RETRIES, onFail = "throw" } = options
  let finalConfig = { ...initialConfig }
  let currentCost = 0
  let retryCount = 0
  let verificationResult: VerificationResult | undefined

  while (retryCount < maxRetries) {
    try {
      verificationResult = await verifyWorkflowConfig(finalConfig, {
        throwOnError: false,
        verbose: false,
      })

      if (verificationResult.isValid) {
        lgg.log("✅ Workflow is ready to go!")
        return { finalConfig, cost: currentCost }
      }

      lgg.log(
        `⚠️ Repair attempt ${retryCount + 1}/${maxRetries}... ${truncater(JSON.stringify(verificationResult.errors, null, 2), 200)}`
      )

      // Repair if validation failed
      const { data, usdCost: enhancementCost } = await repairWorkflow(
        finalConfig,
        verificationResult
      )

      if (data) {
        finalConfig = { ...finalConfig, nodes: data.nodes }
      }

      currentCost += enhancementCost ?? 0
      retryCount++
    } catch (error) {
      if (getLogging().API) {
        lgg.error(
          "❌ Error in workflow validation and repair:",
          error,
          JSON.stringify(finalConfig, null, 2)
        )
      }

      if (onFail === "returnNull") {
        lgg.warn("Workflow repair failed, returning null as per onFail option.")
        return { finalConfig: null, cost: currentCost }
      } else {
        throw error
      }
    }
  }

  // After max retries
  if (onFail === "returnNull") {
    return { finalConfig: null, cost: currentCost }
  } else {
    throw new Error(
      `Workflow repair failed after ${maxRetries} attempts. Please check the workflow configuration. ${verificationResult ? JSON.stringify(verificationResult.errors, null, 2) : ""}`
    )
  }
}
