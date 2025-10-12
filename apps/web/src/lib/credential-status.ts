"use client"

import { logException } from "@/lib/error-logger"
import type {
  CredentialStatus as CoreCredentialStatus,
  FeatureStatus as CoreFeatureStatus,
  SystemHealth as CoreSystemHealth,
  CredentialName,
  FeatureName,
} from "@lucky/core/utils/config/credential-status"
import { useEffect, useState } from "react"

/**
 * Re-export core types (web app uses same structure).
 */
export type CredentialStatus = CoreCredentialStatus
export type FeatureStatus = CoreFeatureStatus
export type SystemHealth = CoreSystemHealth
export type { CredentialName, FeatureName }

/**
 * Hook to get system health status.
 */
export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHealth() {
      try {
        setLoading(true)
        const response = await fetch("/api/health/credentials")

        if (!response.ok) {
          throw new Error(`Failed to fetch health status: ${response.statusText}`)
        }

        const data = await response.json()
        setHealth(data)
        setError(null)
      } catch (err) {
        logException(err, {
          location: "/lib/credential-status",
          env: typeof window !== "undefined" && window.location.hostname === "localhost" ? "development" : "production",
        })
        setError(err instanceof Error ? err.message : "Unknown error")
        setHealth(null)
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [])

  return { health, loading, error }
}

/**
 * Hook to get all credential statuses.
 */
export function useCredentialStatus() {
  const [credentials, setCredentials] = useState<CredentialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCredentials() {
      try {
        setLoading(true)
        const response = await fetch("/api/health/credentials/all")

        if (!response.ok) {
          throw new Error(`Failed to fetch credentials: ${response.statusText}`)
        }

        const data = await response.json()
        setCredentials(data)
        setError(null)
      } catch (err) {
        logException(err, {
          location: "/lib/credential-status",
          env: typeof window !== "undefined" && window.location.hostname === "localhost" ? "development" : "production",
        })
        setError(err instanceof Error ? err.message : "Unknown error")
        setCredentials([])
      } finally {
        setLoading(false)
      }
    }

    fetchCredentials()
  }, [])

  return { credentials, loading, error }
}

/**
 * Hook to get all feature statuses.
 */
export function useFeatureStatus() {
  const [features, setFeatures] = useState<FeatureStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeatures() {
      try {
        setLoading(true)
        const response = await fetch("/api/health/features")

        if (!response.ok) {
          throw new Error(`Failed to fetch features: ${response.statusText}`)
        }

        const data = await response.json()
        setFeatures(data)
        setError(null)
      } catch (err) {
        logException(err, {
          location: "/lib/credential-status",
          env: typeof window !== "undefined" && window.location.hostname === "localhost" ? "development" : "production",
        })
        setError(err instanceof Error ? err.message : "Unknown error")
        setFeatures([])
      } finally {
        setLoading(false)
      }
    }

    fetchFeatures()
  }, [])

  return { features, loading, error }
}

/**
 * Get user-friendly feature name.
 */
export function getFeatureDisplayName(feature: FeatureName): string {
  const names: Record<FeatureName, string> = {
    persistence: "Database Persistence",
    evolution: "Evolution Tracking",
    ai_models: "AI Models",
    search: "Web Search",
    memory: "Enhanced Memory",
  }
  return names[feature]
}

/**
 * Get user-friendly credential name.
 */
export function getCredentialDisplayName(credential: CredentialName): string {
  const names: Record<CredentialName, string> = {
    SUPABASE_ANON_KEY: "Supabase Anonymous Key",
    OPENROUTER_API_KEY: "OpenRouter API Key",
    OPENAI_API_KEY: "OpenAI API Key",
    GOOGLE_API_KEY: "Google API Key",
    SERPAPI_API_KEY: "SerpAPI Key",
    MEM0_API_KEY: "Mem0 API Key",
    TAVILY_API_KEY: "Tavily API Key",
    GROQ_API_KEY: "Groq API Key",
  }
  return names[credential]
}
