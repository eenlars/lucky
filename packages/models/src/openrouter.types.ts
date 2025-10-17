/**
 * OpenRouter API Types
 * Type definitions for the OpenRouter API response
 */

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  pricing: {
    prompt: string
    completion: string
    image?: string
    request?: string
  }
  context_length: number
  architecture?: {
    modality?: string
    tokenizer?: string
    instruct_type?: string | null
  }
  top_provider?: {
    context_length?: number
    max_completion_tokens?: number
    is_moderated?: boolean
  }
  per_request_limits?: {
    prompt_tokens?: string
    completion_tokens?: string
  }
  supported_parameters?: string[]
}

export interface OpenRouterResponse {
  data: OpenRouterModel[]
}
