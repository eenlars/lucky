/**
 * Centralized service for checking credential configuration status.
 * Maps credentials to features and provides actionable guidance.
 */

import { envi } from "@core/utils/env.mjs"
import type { CredentialName } from "./credential-errors"

// Re-export for consumers
export type { CredentialName } from "./credential-errors"

export type FeatureName = "persistence" | "evolution" | "ai_models" | "search" | "memory"

export interface CredentialStatus {
  credential: CredentialName
  configured: boolean
  value?: string
  features: FeatureName[]
  required: boolean
  description: string
}

export interface FeatureStatus {
  feature: FeatureName
  available: boolean
  credentials: CredentialName[]
  fallbackAvailable: boolean
  description: string
}

/**
 * Feature to credential mapping.
 * Defines which credentials enable which features.
 */
const FEATURE_CREDENTIALS: Record<FeatureName, CredentialName[]> = {
  persistence: ["SUPABASE_PROJECT_ID", "SUPABASE_ANON_KEY"],
  evolution: ["SUPABASE_PROJECT_ID", "SUPABASE_ANON_KEY"],
  ai_models: ["OPENROUTER_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY"],
  search: ["TAVILY_API_KEY", "SERPAPI_API_KEY"],
  memory: ["MEM0_API_KEY"],
}

/**
 * Credentials that are absolutely required for app to function.
 */
const REQUIRED_CREDENTIALS: CredentialName[] = ["OPENAI_API_KEY", "GOOGLE_API_KEY", "SERPAPI_API_KEY"]

/**
 * Features that have in-memory fallbacks.
 */
const FEATURES_WITH_FALLBACK: FeatureName[] = ["persistence", "evolution", "memory"]

/**
 * Check if a credential is configured.
 */
function isCredentialConfigured(credential: CredentialName): boolean {
  const value = getCredentialValue(credential)
  return !!value && value.length > 0 && !value.startsWith("test-")
}

/**
 * Get credential value (returns undefined if not set).
 */
function getCredentialValue(credential: CredentialName): string | undefined | null {
  switch (credential) {
    case "SUPABASE_PROJECT_ID":
      return envi.SUPABASE_PROJECT_ID ?? envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID
    case "SUPABASE_ANON_KEY":
      return envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY
    case "OPENROUTER_API_KEY":
      return envi.OPENROUTER_API_KEY
    case "OPENAI_API_KEY":
      return envi.OPENAI_API_KEY
    case "GOOGLE_API_KEY":
      return envi.GOOGLE_API_KEY
    case "SERPAPI_API_KEY":
      return envi.SERPAPI_API_KEY
    case "MEM0_API_KEY":
      return envi.MEM0_API_KEY
    case "TAVILY_API_KEY":
      return envi.TAVILY_API_KEY
    case "GROQ_API_KEY":
      return envi.GROQ_API_KEY
    default:
      return undefined
  }
}

/**
 * Get all credentials used by a feature.
 */
export function getFeatureCredentials(feature: FeatureName): CredentialName[] {
  return FEATURE_CREDENTIALS[feature] || []
}

/**
 * Check if a feature is available based on credential configuration.
 */
export function isFeatureAvailable(feature: FeatureName): boolean {
  const credentials = getFeatureCredentials(feature)

  // If feature has no credential requirements, it's always available
  if (credentials.length === 0) {
    return true
  }

  // For AI models, at least one provider should be configured
  if (feature === "ai_models") {
    return credentials.some(isCredentialConfigured)
  }

  // For search, at least one search provider should be configured
  if (feature === "search") {
    return credentials.some(isCredentialConfigured)
  }

  // For other features, all credentials must be configured
  return credentials.every(isCredentialConfigured)
}

/**
 * Get status of a specific credential.
 */
export function getCredentialStatus(credential: CredentialName): CredentialStatus {
  const configured = isCredentialConfigured(credential)
  const value = configured ? getCredentialValue(credential) : undefined
  const features = (Object.entries(FEATURE_CREDENTIALS) as [FeatureName, CredentialName[]][])
    .filter(([_, creds]) => creds.includes(credential))
    .map(([feature]) => feature)

  const descriptions: Record<CredentialName, string> = {
    SUPABASE_PROJECT_ID: "Database persistence and evolution tracking",
    SUPABASE_ANON_KEY: "Database persistence and evolution tracking",
    OPENROUTER_API_KEY: "Access to multiple AI models via OpenRouter",
    OPENAI_API_KEY: "Access to OpenAI GPT models",
    GOOGLE_API_KEY: "Access to Google Gemini models",
    SERPAPI_API_KEY: "Search functionality",
    MEM0_API_KEY: "Enhanced memory and context features",
    TAVILY_API_KEY: "Advanced search capabilities",
    GROQ_API_KEY: "Access to Groq AI models",
  }

  return {
    credential,
    configured,
    value: configured ? maskCredential(value!) : undefined,
    features,
    required: REQUIRED_CREDENTIALS.includes(credential),
    description: descriptions[credential],
  }
}

/**
 * Get status of a specific feature.
 */
export function getFeatureStatus(feature: FeatureName): FeatureStatus {
  const credentials = getFeatureCredentials(feature)
  const available = isFeatureAvailable(feature)
  const fallbackAvailable = FEATURES_WITH_FALLBACK.includes(feature)

  const descriptions: Record<FeatureName, string> = {
    persistence: "Store workflow runs, traces, and evolution data in database",
    evolution: "Track genetic programming runs and generational improvements",
    ai_models: "Execute workflows using AI language models",
    search: "Search the web and retrieve information",
    memory: "Enhanced context and memory management across workflow runs",
  }

  return {
    feature,
    available,
    credentials,
    fallbackAvailable,
    description: descriptions[feature],
  }
}

/**
 * Get status of all credentials.
 */
export function getAllCredentialStatus(): CredentialStatus[] {
  const allCredentials: CredentialName[] = [
    "SUPABASE_PROJECT_ID",
    "SUPABASE_ANON_KEY",
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_API_KEY",
    "SERPAPI_API_KEY",
    "MEM0_API_KEY",
    "TAVILY_API_KEY",
    "GROQ_API_KEY",
  ]

  return allCredentials.map(getCredentialStatus)
}

/**
 * Get status of all features.
 */
export function getAllFeatureStatus(): FeatureStatus[] {
  const allFeatures: FeatureName[] = ["persistence", "evolution", "ai_models", "search", "memory"]

  return allFeatures.map(getFeatureStatus)
}

/**
 * Get missing required credentials.
 */
export function getMissingRequiredCredentials(): CredentialName[] {
  return REQUIRED_CREDENTIALS.filter(cred => !isCredentialConfigured(cred))
}

/**
 * Check if all required credentials are configured.
 */
export function hasRequiredCredentials(): boolean {
  return getMissingRequiredCredentials().length === 0
}

/**
 * Get features that are unavailable due to missing credentials.
 */
export function getUnavailableFeatures(): FeatureStatus[] {
  return getAllFeatureStatus().filter(status => !status.available && !status.fallbackAvailable)
}

/**
 * Mask credential value for display (show first 4 and last 4 chars).
 */
function maskCredential(value: string | null | undefined): string {
  if (!value || value.length < 12) {
    return "***"
  }

  const first = value.slice(0, 4)
  const last = value.slice(-4)
  const masked = "*".repeat(Math.min(value.length - 8, 20))

  return `${first}${masked}${last}`
}

/**
 * Check if in-memory fallback mode is enabled.
 */
export function isUsingMockPersistence(): boolean {
  return process.env.USE_MOCK_PERSISTENCE === "true"
}

/**
 * Get overall system health based on credential configuration.
 */
export interface SystemHealth {
  healthy: boolean
  missingRequired: CredentialName[]
  unavailableFeatures: FeatureName[]
  warnings: string[]
}

export function getSystemHealth(): SystemHealth {
  const missingRequired = getMissingRequiredCredentials()
  const unavailableFeatures = getUnavailableFeatures().map(f => f.feature)
  const warnings: string[] = []

  // Check for common issues
  if (!isFeatureAvailable("persistence") && !isUsingMockPersistence()) {
    warnings.push("Database not configured. Using in-memory storage - data will be lost on restart.")
  }

  if (!isFeatureAvailable("ai_models")) {
    warnings.push("No AI model providers configured. Core functionality will not work.")
  }

  const healthy = missingRequired.length === 0 && unavailableFeatures.length === 0

  return {
    healthy,
    missingRequired,
    unavailableFeatures,
    warnings,
  }
}
