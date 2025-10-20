"use client"

import { useModelPreferencesStore } from "@/features/provider-llm-setup/store/model-preferences-store"
import { useEffect } from "react"

/**
 * Background provider health check component.
 *
 * Validates that enabled providers have valid API keys in the lockbox.
 * Runs once on mount for authenticated users only.
 *
 * Flow:
 * 1. Calls existing loadPreferences() from Zustand store
 * 2. Fetches provider settings from /api/user/model-preferences
 * 3. Cross-validates with lockbox.user_secrets to verify API keys exist
 * 4. Updates store with metadata.apiKeyConfigured status for each provider
 *
 * Non-blocking: Errors are logged but don't affect user experience.
 * This ensures the app always has fresh provider health status.
 */
export function ProviderHealthCheck() {
  const loadPreferences = useModelPreferencesStore(state => state.loadPreferences)

  useEffect(() => {
    loadPreferences().catch(error => {
      // Log errors for debugging but don't surface to user
      // This is a background check that shouldn't block the app
      console.error("[ProviderHealthCheck] Failed to load provider status:", error)
    })
  }, [loadPreferences])

  return null
}
