import { logException } from "@/lib/error-logger"
import { toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import type { JsonRpcInvokeResponse } from "@lucky/shared/contracts/invoke"
import type { z } from "zod"

/**
 * Result from run mode handler
 */
export interface RunModeResult {
  success: boolean
  error?: string
  output?: string
  errorCode?: number // JSON-RPC error code
  errorData?: unknown // Additional error data
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
  const result = (await response.json()) as z.infer<typeof JsonRpcInvokeResponse>

  if ("error" in result) {
    // JSON-RPC error response
    const errorData = result.error.data as any
    throw new Error(errorData?.errors?.[0] || result.error.message || "Invalid workflow configuration")
  }

  // JSON-RPC success response
  const output = result.result.output as any
  if (!output.isValid) {
    throw new Error(output.errors?.[0] || "Invalid workflow configuration")
  }
  return output.config
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
  onProgress?: (log: string) => void,
  onComplete?: (finalMessage: string) => void,
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
    const result = (await response.json()) as z.infer<typeof JsonRpcInvokeResponse>

    if ("result" in result) {
      // JSON-RPC success response
      const output = result.result.output
      const finalOutput = typeof output === "string" ? output : JSON.stringify(output)

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
    // JSON-RPC error response
    const errorMsg = result.error.message
    onProgress?.(`❌ Error: ${errorMsg}`)
    return {
      success: false,
      error: errorMsg,
      errorCode: result.error.code,
      errorData: result.error.data,
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
