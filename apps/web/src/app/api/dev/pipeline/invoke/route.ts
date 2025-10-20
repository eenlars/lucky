import { auth } from "@clerk/nextjs/server"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { InvocationPipeline } from "@core/messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import { ToolManager } from "@core/node/toolManager"
import { createWorkflowInvocation, createWorkflowVersion } from "@core/utils/persistence/workflow/registerWorkflow"
import { createPersistence } from "@lucky/adapter-supabase"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { withObservationContext } from "@lucky/core/context/observationContext"
import { AgentObserver } from "@lucky/core/utils/observability/AgentObserver"
import { ObserverRegistry } from "@lucky/core/utils/observability/ObserverRegistry"
import { type WorkflowNodeConfig, genShortId } from "@lucky/shared"
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
  toolStrategy: "v2" | "v3" | "auto"
  mainGoal?: string
  randomId?: string
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
    const workflowVersionId = `wf_dev_test_${Date.now()}`
    const workflowId = "dev-test-workflow"

    // Build full model identifier: provider#model
    // Check if modelName already includes provider prefix (from catalog)
    // If it does, use it as-is; otherwise add the prefix
    const fullModelId = body.modelName.includes("#") ? body.modelName : `${body.provider}#${body.modelName}`

    // Simple execution context for dev testing
    // Uses server environment variables for API keys
    const devApiKeys: Record<string, string> = {}
    if (process.env.OPENAI_API_KEY) devApiKeys.OPENAI_API_KEY = process.env.OPENAI_API_KEY
    if (process.env.OPENROUTER_API_KEY) devApiKeys.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    if (process.env.GROQ_API_KEY) devApiKeys.GROQ_API_KEY = process.env.GROQ_API_KEY
    if (process.env.ANTHROPIC_API_KEY) devApiKeys.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

    // Validate that the required provider API key is available
    const requiredProviderKey = `${body.provider.toUpperCase()}_API_KEY`
    if (!devApiKeys[requiredProviderKey]) {
      return NextResponse.json(
        {
          success: false,
          error: `Provider "${body.provider}" is not configured. Missing ${requiredProviderKey} in environment variables.`,
        },
        { status: 400 },
      )
    }

    // Create persistence adapter for database tracking
    const persistence = createPersistence()

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

    // Create observer for real-time streaming
    // Use client-provided randomId if available so the UI can connect SSE first
    const randomId = body.randomId && body.randomId.length > 0 ? body.randomId : genShortId()
    const observer = new AgentObserver()
    ObserverRegistry.getInstance().register(randomId, observer)

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
        return withObservationContext({ randomId, observer }, async () => {
          // Create workflow version record for tracking
          await persistence.ensureWorkflowExists(workflowId, "Dev pipeline testing")
          await createWorkflowVersion({
            persistence,
            workflowVersionId,
            workflowId,
            commitMessage: `Dev test: ${body.systemPrompt.substring(0, 50)}...`,
            workflowConfig: {
              nodes: [
                {
                  nodeId,
                  systemPrompt: body.systemPrompt,
                  modelName: fullModelId,
                  codeTools: body.codeTools,
                  mcpTools: body.mcpTools,
                },
              ],
            },
          })

          // Create workflow invocation record for observability
          await createWorkflowInvocation({
            persistence,
            workflowInvocationId: invocationId,
            workflowVersionId,
            metadata: {
              provider: body.provider,
              model: body.modelName,
            },
            workflowInput: body.message,
          })

          // Create tool manager
          const toolManager = new ToolManager(nodeId, body.mcpTools as any, body.codeTools as any, workflowVersionId)

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
            workflowVersionId,
            workflowId,
            workflowInvocationId: invocationId,
          } as NodeInvocationCallContext

          // Create and execute pipeline
          // Pipeline requires 3-step execution: prepare -> execute -> process
          const pipeline = new InvocationPipeline(ctx, toolManager, true)
          await pipeline.prepare()
          await pipeline.execute()
          const result = await pipeline.process()

          return result
        })
      },
    )

    // Dispose observer after execution
    setTimeout(
      () => {
        observer.dispose()
        ObserverRegistry.getInstance().dispose(randomId)
      },
      5 * 60 * 1000,
    )

    const executionTime = Date.now() - startTime

    // Check if pipeline execution succeeded
    const hasError = !!result.error

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
      randomId, // Include randomId for SSE streaming
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
