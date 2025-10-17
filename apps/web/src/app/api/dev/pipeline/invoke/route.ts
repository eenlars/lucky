import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { InvocationPipeline } from "@core/messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import { ToolManager } from "@core/node/toolManager"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import type { WorkflowNodeConfig } from "@lucky/shared"
import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Types for the API
interface PipelineTestRequest {
  systemPrompt: string
  provider: string
  modelName: string
  maxSteps?: number
  codeTools: string[]
  mcpTools: string[]
  message: string
  toolStrategy: "v2" | "v3"
  mainGoal?: string
}

export async function POST(request: Request) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not available in production" }, { status: 403 })
    }

    // Check auth
    const { isAuthenticated, userId } = await auth()
    if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

    const body = (await request.json()) as PipelineTestRequest

    // Validate required fields
    if (!body.systemPrompt || !body.provider || !body.modelName || !body.message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startTime = Date.now()
    const invocationId = globalThis.crypto.randomUUID()
    const nodeId = `test-pipeline-${Date.now()}`

    // Build full model identifier: provider#model
    // Check if modelName already includes provider prefix (from catalog)
    // If it does, use it as-is; otherwise add the prefix
    const fullModelId = body.modelName.includes("#") ? body.modelName : `${body.provider}#${body.modelName}`

    // Build node config - cast to any to bypass tool name enums for dev testing
    const nodeConfig = {
      nodeId,
      description: "Pipeline test node",
      systemPrompt: body.systemPrompt,
      modelName: fullModelId,
      mcpTools: body.mcpTools,
      codeTools: body.codeTools,
      handOffs: ["end"], // Pipeline needs at least one handoff target
      memory: null,
      maxSteps: body.maxSteps,
    } as WorkflowNodeConfig

    // Simple execution context for dev testing
    // Uses server environment variables for API keys
    const devApiKeys: Record<string, string> = {}
    if (process.env.OPENAI_API_KEY) devApiKeys.OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (process.env.OPENROUTER_API_KEY) devApiKeys.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (process.env.GROQ_API_KEY) devApiKeys.GROQ_API_KEY = process.env.GROQ_API_KEY
    if (process.env.ANTHROPIC_API_KEY) devApiKeys.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

    const result = await withExecutionContext(
      {
        principal: {
          clerk_id: userId,
          scopes: [],
          auth_method: "session" as const,
        },
        secrets: {
          get: async () => undefined,
          getAll: async () => ({}),
        },
        apiKeys: devApiKeys,
      },
      async () => {
        // Create tool manager with all required arguments
        // workflowVersionId doesn't matter for dev testing
        const toolManager = new ToolManager(nodeId, body.mcpTools as any, body.codeTools as any, "dev-test-version")

        // Build proper payload structure (sequential payload with text content)
        const payload = {
          kind: "sequential" as const,
          berichten: [
            {
              type: "text" as const,
              text: body.message,
            },
          ],
        }

        // Create WorkflowMessage instance
        const workflowMessageIncoming = new WorkflowMessage({
          originInvocationId: invocationId,
          fromNodeId: "test-user",
          toNodeId: nodeId,
          seq: 1,
          payload,
          wfInvId: invocationId,
          skipDatabasePersistence: true,
        })

        // Build context - cast to NodeInvocationCallContext for dev testing
        const ctx = {
          nodeConfig,
          workflowMessageIncoming,
          mainWorkflowGoal: body.mainGoal || "Pipeline test execution",
          invocationId,
          nodeMemory: {},
          toolStrategyOverride: body.toolStrategy,
          startTime: new Date().toISOString(),
          workflowVersionId: "dev-test",
          workflowId: "dev-test-workflow",
          workflowInvocationId: invocationId,
          skipDatabasePersistence: true,
        } as NodeInvocationCallContext

        // Create and execute pipeline
        // Pipeline requires 3-step execution: prepare -> execute -> process
        const pipeline = new InvocationPipeline(ctx, toolManager, true)
        await pipeline.prepare()
        await pipeline.execute()
        const result = await pipeline.process()

        return result
      },
    )

    const executionTime = Date.now() - startTime

    // Check if pipeline execution succeeded
    const hasError = !!result.error
    const success = !hasError

    // If pipeline failed, return error response
    if (hasError) {
      // Ensure error is a string
      const errorMessage =
        typeof result.error === "string"
          ? result.error
          : typeof result.error === "object" && result.error !== null
            ? JSON.stringify(result.error)
            : "Pipeline execution failed"

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          result: {
            content: result.nodeInvocationFinalOutput,
            agentSteps: result.agentSteps || [],
            cost: result.usdCost || 0,
            timeMs: executionTime,
          },
        },
        { status: 500 },
      )
    }

    // Pipeline succeeded
    return NextResponse.json({
      success: true,
      result: {
        content: result.nodeInvocationFinalOutput,
        agentSteps: result.agentSteps || [],
        cost: result.usdCost || 0,
        timeMs: executionTime,
      },
    })
  } catch (error) {
    console.error("Pipeline test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
