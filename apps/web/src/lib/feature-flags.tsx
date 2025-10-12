/**
 * UI Feature Flags
 *
 * Controls experimental/development features in the UI.
 *
 * Rules:
 * - localhost: All flags enabled (dev can test everything)
 * - production: Flags disabled (stable experience)
 */

import { useEffect, useState } from "react"
import type { ReactNode } from "react"

/** Check if we're running on localhost (client-side only) */
function isLocalhost(): boolean {
  if (typeof window === "undefined") return false
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
}

/**
 * Feature flags - set to true to enable on localhost
 */
const FEATURE_FLAGS = {
  /** Enable MCP tools functionality */
  MCP_TOOLS: true,

  /** Toggle to disable tool use in workflow execution */
  DISABLE_TOOLS_TOGGLE: true,

  /** Toggle to disable evolution/learning */
  DISABLE_EVOLUTION_TOGGLE: true,

  /** Show advanced workflow settings */
  ADVANCED_SETTINGS: true,
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS

/**
 * Check if a feature is enabled
 * Returns true only if on localhost AND flag is true
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return isLocalhost() && FEATURE_FLAGS[flag]
}

/**
 * Hook for React components
 * Defers localhost check until after mount to avoid SSR/CSR hydration mismatch
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // During SSR and initial render, return false
  // After mount, check if we're on localhost
  if (!isClient) return false
  return isFeatureEnabled(flag)
}

/**
 * Feature flag wrapper component
 * Only renders children if feature is enabled (localhost + flag is true)
 */
export function FeatureFlag({
  name,
  children,
  fallback = null,
}: {
  name: FeatureFlagKey
  children: ReactNode
  fallback?: ReactNode
}) {
  const enabled = useFeatureFlag(name)
  return enabled ? <>{children}</> : <>{fallback}</>
}
