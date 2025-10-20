import { post } from "@/lib/api/api-client"
import { logException } from "@/lib/error-logger"
import { toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"

export type WorkflowRunResult =
  | {
      success: true
      output: string
    }
  | {
      success: false
      error: string
      errors?: string[]
    }

/**
 * Run Mode Handler: Execute workflow with user-provided input.
 *
 * Takes a user input prompt and executes the current workflow with it.
 * This mode runs the workflow as-is without modifying its structure.
 *
 * @param prompt - User input to execute the workflow with
 * @param exportToJSON - Function to export current workflow as JSON
 * @param onProgress - Optional callback for progress logging
 * @param onComplete - Optional callback when workflow completes with final message
 * @returns Result containing the workflow execution output
 */
export async function executeRunMode(
  prompt: string,
  exportToJSON: () => string,
  workflowId?: string,
  onProgress?: (log: string) => void,
  onComplete?: (finalMessage: string) => void,
): Promise<WorkflowRunResult> {
  try {
    onProgress?.("Starting workflow execution...")
    await new Promise(resolve => setTimeout(resolve, 300))

    onProgress?.("Exporting workflow configuration...")
    const json = exportToJSON()
    const parsed = JSON.parse(json)
    const cfgMaybe = toWorkflowConfig(parsed)

    if (!cfgMaybe) {
      onProgress?.("❌ Error: Invalid workflow configuration")
      return {
        success: false,
        error: "Invalid workflow configuration",
      }
    }

    await new Promise(resolve => setTimeout(resolve, 200))
    onProgress?.("Validating workflow configuration...")

    const { error, data } = await post("workflow/verify", {
      workflow: cfgMaybe,
      mode: "dsl",
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (!data?.isValid && data?.errors && data.errors.length > 0) {
      return {
        success: false,
        error: "Workflow validation failed",
        errors: data.errors,
      }
    }

    await new Promise(resolve => setTimeout(resolve, 200))
    onProgress?.("That workflow looks good...")

    const nodes = cfgMaybe.nodes
    const response = await post("v1/openrouter", {
      prompt: prompt,
      dslConfig: {
        nodes,
        entryNodeId: cfgMaybe.entryNodeId || nodes[0]?.nodeId || "",
      },
      workflowId,
    })

    onProgress?.("Processing response...")

    if (response.success) {
      // Success response - response.data.output contains the full workflow result
      const workflowResult = response.data.output

      // Extract the actual output value from the workflow result
      let finalOutput: string
      if (typeof workflowResult === "string") {
        finalOutput = workflowResult
      } else if (workflowResult && typeof workflowResult === "object" && "output" in workflowResult) {
        finalOutput =
          typeof workflowResult.output === "string" ? workflowResult.output : JSON.stringify(workflowResult.output)
      } else {
        finalOutput = JSON.stringify(workflowResult)
      }

      onProgress?.("✅ Workflow completed successfully!")
      onProgress?.(`Result: ${finalOutput}`)

      // Always call onComplete callback on success, even with empty output
      if (onComplete) {
        onComplete(finalOutput)
      }

      return {
        success: true,
        output: finalOutput,
      }
    }
    // Error response
    const errorMsg = response.error.message
    onProgress?.(`❌ Error: ${errorMsg}`)
    return {
      success: false,
      error: errorMsg,
    }
  } catch (error) {
    logException(error, {
      location: typeof window !== "undefined" ? window.location.pathname : "unknown",
    })
    const errorMessage = error instanceof Error ? error.message : "Workflow execution failed"
    onProgress?.(`❌ Error: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
