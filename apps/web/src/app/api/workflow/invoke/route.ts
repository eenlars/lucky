import { readFile } from "node:fs/promises"
import { authenticateRequest } from "@/lib/auth/principal"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { createSecretResolver } from "@/lib/lockbox/secretResolver"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import {
  FALLBACK_PROVIDER_KEYS,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "@/lib/workflow/provider-validation"
import { getExecutionContext, withExecutionContext } from "@lucky/core/context/executionContext"
import { invokeWorkflow } from "@lucky/core/workflow/runner/invokeWorkflow"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { isNir } from "@lucky/shared/utils/common/isNir"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json({ error: "Invalid invocation input" }, { status: 400 })
    }

    // Check if we already have execution context (from upstream caller like /api/v1/invoke)
    const existingContext = getExecutionContext()

    if (existingContext) {
      // Context already set, just invoke
      const result = await invokeWorkflow(input)

      if (!result.success) {
        console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }

      return NextResponse.json(result, { status: 200 })
    }

    // No context set, this is a direct call - authenticate and create context
    const principal = await authenticateRequest(req)
    if (!principal) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log("[workflow/invoke] Principal auth_method:", principal.auth_method)
    console.log("[workflow/invoke] Principal clerk_id:", principal.clerk_id)

    const secrets = createSecretResolver(principal.clerk_id)

    // Extract workflow config to determine required providers
    let workflowConfig: WorkflowConfig | null = null
    try {
      if (input.dslConfig) {
        workflowConfig = input.dslConfig
      } else if (input.filename) {
        const fileContent = await readFile(input.filename, "utf-8")
        workflowConfig = JSON.parse(fileContent)
      } else if (input.workflowVersionId) {
        const loadResult = await loadWorkflowConfig(input.workflowVersionId)
        if (loadResult.success && loadResult.config) {
          workflowConfig = loadResult.config
        }
      }
    } catch (error) {
      console.warn("[workflow/invoke] Failed to load workflow config for provider extraction:", error)
    }

    // Extract providers required by this workflow for targeted validation
    const requiredProviderKeys = workflowConfig
      ? getRequiredProviderKeys(workflowConfig, "workflow/invoke")
      : [...FALLBACK_PROVIDER_KEYS]

    // Pre-fetch required provider keys (only those actually needed by this workflow)
    const apiKeys = await secrets.getAll(requiredProviderKeys)

    // Validate all required keys are present for session-based auth
    if (principal.auth_method === "session") {
      const missingKeys = validateProviderKeys(requiredProviderKeys, apiKeys)

      if (!isNir(missingKeys)) {
        console.error("[workflow/invoke] Missing required API keys:", missingKeys)
        return NextResponse.json(
          {
            error: "Missing API Keys",
            message: `This workflow requires API keys that aren't configured: ${missingKeys.join(", ")}`,
            missingKeys,
            action: "Go to Settings > Provider Settings to add your API keys",
          },
          { status: 400 },
        )
      }
    }

    const result = await withExecutionContext({ principal, secrets, apiKeys }, async () => {
      return invokeWorkflow(input)
    })

    if (!result.success) {
      console.error("[/api/workflow/invoke] Workflow invocation failed:", result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[/api/workflow/invoke] Unexpected error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error"
    const errorStack = error instanceof Error ? error.stack : undefined
    if (errorStack) {
      console.error("[/api/workflow/invoke] Stack trace:", errorStack)
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
