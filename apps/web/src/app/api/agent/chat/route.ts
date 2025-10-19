import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { requireAuthWithApiKey } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { getProviderKeyName } from "@lucky/core/workflow/provider-extraction"
import { createLLMRegistry } from "@lucky/models"
import {
  type LanguageModel,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

// Request validation schema
// Note: Using looser validation to accommodate AI SDK's UIMessage type
const ChatRequestSchema = z.object({
  messages: z
    .array(z.any()) // AI SDK's UIMessage has complex discriminated union types
    .min(1, "At least one message is required")
    .max(100, "Too many messages in conversation")
    .refine(
      msgs => {
        // Basic validation: each message should have id, role, and parts
        return msgs.every(
          msg =>
            msg &&
            typeof msg === "object" &&
            typeof msg.id === "string" &&
            typeof msg.role === "string" &&
            Array.isArray(msg.parts),
        )
      },
      { message: "Invalid message format" },
    ),
  nodeId: z.string().min(1, "nodeId cannot be empty").max(200),
  modelName: z.string().max(200).optional(),
  systemPrompt: z.string().max(10000, "System prompt is too long").optional(),
})

// Sanitize system prompt to prevent common injection patterns
function sanitizeSystemPrompt(prompt: string): string {
  return prompt
    .replace(/ignore\s+previous\s+instructions?/gi, "")
    .replace(/disregard\s+(all\s+)?previous/gi, "")
    .replace(/forget\s+everything/gi, "")
    .trim()
}

// Map technical errors to user-friendly messages with provider-specific guidance
function getUserFriendlyError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  // Check for missing API key errors with provider detection
  if (errorMessage.includes("API key") || errorMessage.includes("apiKey") || errorMessage.includes("Authentication")) {
    // Try to extract provider name from error message
    let provider = "AI provider"
    if (errorMessage.toLowerCase().includes("openai")) provider = "OpenAI"
    else if (errorMessage.toLowerCase().includes("openrouter")) provider = "OpenRouter"
    else if (errorMessage.toLowerCase().includes("groq")) provider = "Groq"
    else if (errorMessage.toLowerCase().includes("anthropic")) provider = "Anthropic"

    return `${provider} API key not configured. Please add it in Settings → Providers.`
  }

  // Model not found or unavailable
  if (errorMessage.includes("not found") || errorMessage.includes("Not found") || errorMessage.includes("404")) {
    return "Selected model is not available. Try a different model or check your provider settings."
  }

  // Rate limiting
  if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
    return "Too many requests. Please wait a moment and try again."
  }

  // Quota/credits issues
  if (errorMessage.includes("quota") || errorMessage.includes("insufficient") || errorMessage.includes("402")) {
    return "AI service quota exceeded or insufficient credits. Please check your provider account."
  }

  // Access/permission issues
  if (errorMessage.includes("403") || errorMessage.includes("Access denied") || errorMessage.includes("forbidden")) {
    return "Access denied. The model may not be available for your account."
  }

  // Timeout issues
  if (errorMessage.includes("timeout") || errorMessage.includes("timed out") || errorMessage.includes("408")) {
    return "Request timed out. Please try again with a shorter prompt."
  }

  // Service unavailable
  if (
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("unavailable")
  ) {
    return "AI service is temporarily unavailable. Please try again in a moment."
  }

  return "Failed to process your request. Please try again or contact support if the issue persists."
}

/**
 * POST /api/agent/chat
 * Streaming chat endpoint for agent dialog testing
 *
 * Request body:
 * - messages: UIMessage[] - Chat history
 * - nodeId: string - Agent node ID
 * - modelName?: string - Override model (format: "provider/model" or "tier:name")
 * - systemPrompt?: string - System prompt for the agent
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Require authentication
    const authResult = await requireAuthWithApiKey(request)
    if (authResult instanceof NextResponse) return authResult
    const principal = authResult
    const clerkId = principal.clerk_id
    const secrets = createSecretResolver(clerkId)

    // Parse request body with error handling
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    // Validate request body with Zod
    const validationResult = ChatRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]
      return NextResponse.json(
        {
          error: firstError?.message || "Invalid request data",
          field: firstError?.path.join("."),
        },
        { status: 400 },
      )
    }

    const { messages, nodeId, modelName, systemPrompt } = validationResult.data

    // TODO: Add authorization check - verify user owns this nodeId
    // const hasAccess = await verifyNodeAccess(principal.clerk_id, nodeId)
    // if (!hasAccess) {
    //   return NextResponse.json({ error: "Unauthorized access to this agent" }, { status: 403 })
    // }

    // Log request for debugging
    console.log(`[Agent Chat] Starting stream for node=${nodeId}, model=${modelName || "default"}`)

    // Validate that modelName is provided
    if (!modelName) {
      return NextResponse.json({ error: "Model name is required", field: "modelName" }, { status: 400 })
    }

    // Fetch user's enabled models to use as allowlist and gather required provider keys
    const supabase = await createRLSClient()
    const { data: providerSettings } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider, enabled_models, is_enabled")
      .eq("clerk_id", clerkId)
      .eq("is_enabled", true)

    const allowlist: string[] = []
    const providerIds = new Set<string>()
    if (providerSettings) {
      for (const row of providerSettings) {
        const enabledModels = Array.isArray(row.enabled_models)
          ? row.enabled_models.filter((m): m is string => typeof m === "string")
          : []
        allowlist.push(...enabledModels)
        if (typeof row.provider === "string" && row.provider.length > 0) {
          providerIds.add(row.provider)
        }
      }
    }

    const requiredProviderKeys = Array.from(providerIds).map(provider => getProviderKeyName(provider))

    const providerApiKeys =
      requiredProviderKeys.length > 0 ? await secrets.getAll(requiredProviderKeys, "environment-variables") : undefined

    // Create registry with user's API keys as fallback
    // Keep env fallback for new users with no provider settings
    // Forward all provider BYOK keys (including Anthropic and others)
    const fallbackKeys: Record<string, string | undefined> = {}

    // Add all keys from providerApiKeys if available
    if (providerApiKeys) {
      for (const [key, value] of Object.entries(providerApiKeys)) {
        if (value && typeof value === "string") {
          // Convert API key names back to provider names (e.g., OPENAI_API_KEY -> openai)
          const providerName = key.replace(/_API_KEY$/, "").toLowerCase()
          fallbackKeys[providerName] = value
        }
      }
    }

    // Add env fallbacks for any missing providers (for new users or shared flow)
    if (!fallbackKeys.openai) fallbackKeys.openai = process.env.OPENAI_API_KEY
    if (!fallbackKeys.groq) fallbackKeys.groq = process.env.GROQ_API_KEY
    if (!fallbackKeys.openrouter) fallbackKeys.openrouter = process.env.OPENROUTER_API_KEY

    const llmRegistry = createLLMRegistry({
      fallbackKeys,
    })

    const userModels = llmRegistry.forUser({
      mode: "shared",
      userId: clerkId,
      models: allowlist,
    })

    // Execute the chat invocation within the execution context
    return withExecutionContext({ principal, secrets, apiKeys: providerApiKeys, userModels }, async () => {
      // Create user-specific models instance with allowed models list
      let model: LanguageModel
      let resolvedModelId: string
      try {
        const userModels = llmRegistry.forUser({
          mode: "shared", // Using fallback keys from registry
          userId: clerkId,
          models: allowlist.length > 0 ? allowlist : ["openai#gpt-4o-mini"], // Fallback to a default model
        })

        // Get the model directly by name
        model = userModels.model(modelName)
        resolvedModelId = modelName
      } catch (error) {
        console.error("[Agent Chat] Failed to load model:", error)
        const userError = getUserFriendlyError(error)
        return NextResponse.json(
          {
            error: userError,
            details:
              process.env.NODE_ENV === "development"
                ? error instanceof Error
                  ? error.message
                  : String(error)
                : undefined,
            modelName: process.env.NODE_ENV === "development" ? modelName : undefined,
          },
          { status: 500 },
        )
      }

      // Sanitize and prepare system prompt
      const basePrompt = "You are a helpful AI assistant. Be concise and clear in your responses."
      const finalSystemPrompt = systemPrompt ? sanitizeSystemPrompt(systemPrompt) : basePrompt

      // Log custom system prompts for audit
      if (systemPrompt && systemPrompt !== basePrompt) {
        console.log(`[Agent Chat] Custom system prompt used for node=${nodeId}`)
      }

      // Create streaming response with transient status updates
      return createUIMessageStreamResponse({
        stream: createUIMessageStream({
          execute: async ({ writer }) => {
            writer.write({
              type: "data-status",
              data: { message: "Generating response..." },
              transient: true,
            })

            const result = streamText({
              model,
              system: finalSystemPrompt,
              messages: convertToModelMessages(messages),
              onFinish: ({ finishReason, usage, text }) => {
                const duration = Date.now() - startTime
                console.log(
                  `[Agent Chat] Stream completed for node=${nodeId} in ${duration}ms, tokens=${usage?.totalTokens || 0}, reason=${finishReason}, model=${resolvedModelId}`,
                )
                console.log(`[Agent Chat] Final text length: ${text.length} chars`)
                console.log(`[Agent Chat] Text preview: ${text.substring(0, 100)}...`)

                // Check for suspicious zero-token completions
                if (usage?.totalTokens === 0 || text.length === 0) {
                  console.error(
                    "[Agent Chat] SUSPICIOUS: Stream completed with 0 tokens/text. Possible quota/payment issue.",
                  )
                }
              },
              onError: error => {
                console.error(`[Agent Chat] Streaming error for node=${nodeId}:`, error)
                console.error("[Agent Chat] Error details:", JSON.stringify(error, null, 2))
              },
            })

            const uiStream = result.toUIMessageStream()
            let chunkCount = 0
            let textChunkCount = 0

            try {
              for await (const chunk of uiStream) {
                chunkCount++
                if (chunk.type === "text-delta") {
                  textChunkCount++
                }
                writer.write(chunk)
              }
            } catch (streamError) {
              console.error("[Agent Chat] Error during stream iteration:", streamError)
              throw streamError
            }

            console.log(`[Agent Chat] Total chunks written: ${chunkCount}, text chunks: ${textChunkCount}`)

            // Warning if no text was streamed - log but don't send custom error chunk (breaks AI SDK validation)
            if (textChunkCount === 0) {
              console.error(
                "[Agent Chat] WARNING: No text chunks received! Check model quota/credits or API key permissions.",
              )
            }

            writer.write({ type: "finish" })
          },
        }),
      })
    })
  } catch (error) {
    logException(error, {
      location: "/api/agent/chat",
    })
    const duration = Date.now() - startTime
    console.error(`[Agent Chat] Error after ${duration}ms:`, error)

    // Don't return JSON during streaming - if we're here, streaming hasn't started
    const userError = getUserFriendlyError(error)
    return NextResponse.json(
      {
        error: userError,
        details:
          process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
