/**
 * Feature flags for gradual rollout and A/B testing
 */

export const FEATURE_FLAGS = {
  /**
   * Auto-run demo workflow on first visit
   * When enabled, new users see a demo automatically execute on homepage load
   * Rollout: 0% → 25% → 100% based on metrics
   */
  AUTO_RUN_FIRST_DEMO: typeof window !== "undefined" ? process.env.NEXT_PUBLIC_AUTO_RUN_DEMO === "true" : false,
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}

/**
 * For A/B testing: randomly assign user to treatment group
 * @param percentage - Percentage of users to include (0-100)
 */
export function isInTreatmentGroup(percentage: number): boolean {
  if (typeof window === "undefined") return false

  // Use localStorage to persist assignment
  const storageKey = "ab_test_assignment"
  const existing = localStorage.getItem(storageKey)

  if (existing !== null) {
    return existing === "treatment"
  }

  const inTreatment = Math.random() * 100 < percentage
  localStorage.setItem(storageKey, inTreatment ? "treatment" : "control")

  return inTreatment
}
