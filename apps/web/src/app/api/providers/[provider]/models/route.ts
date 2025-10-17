import { alrighty } from "@/lib/api/server"
import { handleBody, isHandleBodyError } from "@/lib/api/server"
import { getModelsByProvider } from "@lucky/models"
import { isUIVisibleModel } from "@lucky/models/pricing/model-lookup"
import { type EnrichedModelInfo, providerNameSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// Cache models for 5 minutes to avoid excessive API calls
const CACHE_DURATION_MS = 5 * 60 * 1000
const modelCache = new Map<
  string,
  {
    models: string[] | EnrichedModelInfo[]
    timestamp: number
  }
>()

// POST /api/providers/[provider]/models
// Fetches available models from the provider's API and enriches with catalog metadata
// Body: { apiKey: string, includeMetadata?: boolean }
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params

  const body = await handleBody("providers/[provider]/models", req)
  if (isHandleBodyError(body)) return body

  const validationResult = providerNameSchema.safeParse(provider)

  if (!validationResult.success) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  const validatedProvider = validationResult.data
  const includeMetadata = body.includeMetadata ?? true

  // Check cache
  const cacheKey = `${validatedProvider}:${body.apiKey.substring(0, 10)}:${includeMetadata}`
  const cached = modelCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return alrighty("providers/[provider]/models", { models: cached.models })
  }

  try {
    let modelIds: string[]

    switch (validatedProvider) {
      case "openai":
        modelIds = await fetchOpenAIModels(body.apiKey)
        break
      case "groq":
        modelIds = await fetchGroqModels(body.apiKey)
        break
      case "openrouter":
        modelIds = await fetchOpenRouterModels(body.apiKey)
        break
      default:
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    // Enrich with metadata from MODEL_CATALOG if requested
    let result: string[] | EnrichedModelInfo[]
    if (includeMetadata) {
      const catalogModels = getModelsByProvider(validatedProvider)
      // Create map with both formats: with and without provider prefix
      const catalogMap = new Map<string, (typeof catalogModels)[0]>()
      for (const model of catalogModels) {
        catalogMap.set(model.model, model)
        // Also map without prefix for OpenRouter/Groq format matching
        const withoutPrefix = model.model.replace(/^[^#]+#/, "")
        catalogMap.set(withoutPrefix, model)
      }
      const isDevelopment = process.env.NODE_ENV === "development"

      // In development: show all models from catalog
      // In production: only show models that are UI-visible (not disabled)
      result = modelIds
        .map(modelId => {
          const catalogEntry = catalogMap.get(modelId)
          // In development, show all; in production, hide UI-hidden models
          if (catalogEntry && (isDevelopment || isUIVisibleModel(catalogEntry, process.env.NODE_ENV))) {
            return {
              id: catalogEntry.id,
              name: catalogEntry.model,
              contextLength: catalogEntry.contextLength,
              supportsTools: catalogEntry.supportsTools,
              supportsVision: catalogEntry.supportsVision,
              supportsReasoning: catalogEntry.supportsReasoning,
              supportsAudio: catalogEntry.supportsAudio,
              supportsVideo: catalogEntry.supportsVideo,
              inputCostPer1M: catalogEntry.input,
              outputCostPer1M: catalogEntry.output,
              speed: catalogEntry.speed,
              intelligence: catalogEntry.intelligence,
            }
          }
          // Don't return models not in catalog (or disabled models in production)
          return null
        })
        .filter(Boolean) as EnrichedModelInfo[]
    } else {
      result = modelIds
    }

    // Cache the result
    modelCache.set(cacheKey, {
      models: result,
      timestamp: Date.now(),
    })

    return alrighty("providers/[provider]/models", { models: result })
  } catch (error) {
    console.error(`Error fetching models for ${provider}:`, error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch models",
      },
      { status: 500 },
    )
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || "Failed to fetch OpenAI models")
  }

  const data = await response.json()

  // Filter to only GPT models and sort by ID
  const models = data.data
    .filter((model: { id: string }) => {
      const id = model.id
      return (
        id.startsWith("gpt-") ||
        id.startsWith("o1") ||
        id.startsWith("o3") ||
        id.includes("chatgpt") ||
        id.includes("gpt4")
      )
    })
    .map((model: { id: string }) => model.id)
    .sort()

  return models
}

async function fetchGroqModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || "Failed to fetch Groq models")
  }

  const data = await response.json()

  // Extract model IDs and sort
  const models = data.data.map((model: { id: string }) => model.id).sort()

  return models
}

async function fetchOpenRouterModels(apiKey: string): Promise<string[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || "Failed to fetch OpenRouter models")
  }

  const data = await response.json()

  // Extract model IDs and sort
  const models = data.data.map((model: { id: string }) => model.id).sort()

  return models
}
