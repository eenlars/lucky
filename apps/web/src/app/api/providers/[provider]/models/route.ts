import { getModelsByProvider } from "@lucky/models"
import type { EnrichedModelInfo, LuckyProvider } from "@lucky/shared"
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
  const body = await req.json()
  const apiKey = body.apiKey
  const includeMetadata = body.includeMetadata ?? true

  // Validate provider
  const validProviders: LuckyProvider[] = ["openai", "openrouter", "groq"]
  if (!validProviders.includes(provider as LuckyProvider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 })
  }

  // Check cache
  const cacheKey = `${provider}:${apiKey.substring(0, 10)}:${includeMetadata}`
  const cached = modelCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json({ models: cached.models })
  }

  try {
    let modelIds: string[]

    switch (provider) {
      case "openai":
        modelIds = await fetchOpenAIModels(apiKey)
        break
      case "groq":
        modelIds = await fetchGroqModels(apiKey)
        break
      case "openrouter":
        modelIds = await fetchOpenRouterModels(apiKey)
        break
      default:
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    // Enrich with metadata from MODEL_CATALOG if requested
    let result: string[] | EnrichedModelInfo[]
    if (includeMetadata) {
      const catalogModels = getModelsByProvider(provider)
      const catalogMap = new Map(catalogModels.map(m => [m.model, m]))

      result = modelIds
        .map(modelId => {
          const catalogEntry = catalogMap.get(modelId)
          if (catalogEntry) {
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
          // Fallback for models not in catalog
          return {
            id: `${provider}/${modelId}`,
            name: modelId,
            contextLength: 0,
            supportsTools: false,
            supportsVision: false,
            supportsReasoning: false,
            supportsAudio: false,
            supportsVideo: false,
            inputCostPer1M: 0,
            outputCostPer1M: 0,
            speed: "medium" as const,
            intelligence: 5,
          }
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

    return NextResponse.json({ models: result })
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
