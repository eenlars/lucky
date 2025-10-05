import { toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"

/**
 * Result from run mode handler
 */
export interface RunModeResult {
  success: boolean
  error?: string
  output?: string
}

/**
 * Client-side wrapper for server-side DSL validation
 */
async function loadFromDSLClient(dslConfig: any) {
  const response = await fetch("/api/workflow/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow: dslConfig, mode: "dsl" }),
  })
  const result = await response.json()
  if (!result.isValid) {
    throw new Error(result.errors?.[0] || "Invalid workflow configuration")
  }
  return result.config
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
 * @returns Result containing the workflow execution output
 */
export async function executeRunMode(
  prompt: string,
  exportToJSON: () => string,
  onProgress?: (log: string) => void,
): Promise<RunModeResult> {
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
    const cfg = await loadFromDSLClient(cfgMaybe)

    await new Promise(resolve => setTimeout(resolve, 200))
    onProgress?.("Sending request to workflow API...")
    const response = await fetch("/api/workflow/invoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dslConfig: cfg,
        evalInput: {
          type: "text",
          question: prompt,
          answer: "",
          goal: "Workflow run",
          workflowId: "adhoc-ui-promptbar",
        },
      }),
    })

    onProgress?.("Processing response...")
    const result = await response.json()

    if (result?.success) {
      const first = result?.data?.[0]
      const output = first?.queueRunResult?.finalWorkflowOutput ?? first?.finalWorkflowOutputs
      onProgress?.("✅ Workflow completed successfully!")
      onProgress?.(`Result: ${output || "No response"}`)
      return {
        success: true,
        output: output || "No response",
      }
    }
    const errorMsg = result?.error || "Unknown error"
    onProgress?.(`❌ Error: ${errorMsg}`)
    return {
      success: false,
      error: errorMsg,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Workflow execution failed"
    onProgress?.(`❌ Error: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
