/**
 * Analytics and tracking utilities for measuring feature impact
 */

export type AnalyticsEvent =
  | "demo_auto_started"
  | "demo_auto_success"
  | "demo_auto_error"
  | "demo_manual_started"
  | "demo_manual_success"
  | "demo_manual_error"
  | "first_visit"
  | "treatment_assigned"
  | "control_assigned"
  | "api_key_setup_clicked"
  | "create_workflow_clicked"

interface EventMetadata {
  [key: string]: string | number | boolean | undefined
}

/**
 * Track an analytics event
 * In production, this would send to your analytics service (Mixpanel, Amplitude, etc.)
 * For now, we log to console and localStorage for measurement
 */
export function trackEvent(event: AnalyticsEvent, metadata?: EventMetadata) {
  const timestamp = new Date().toISOString()
  const eventData = {
    event,
    timestamp,
    ...metadata,
  }

  // Console log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", eventData)
  }

  // Store in localStorage for measurement (temporary approach)
  if (typeof window !== "undefined") {
    try {
      const storageKey = "analytics_events"
      const existing = localStorage.getItem(storageKey)
      const events = existing ? JSON.parse(existing) : []

      events.push(eventData)

      // Keep only last 100 events to avoid storage bloat
      const trimmed = events.slice(-100)
      localStorage.setItem(storageKey, JSON.stringify(trimmed))
    } catch (err) {
      console.error("Failed to store analytics event:", err)
    }
  }

  // TODO: Send to real analytics service
  // Example: mixpanel.track(event, metadata)
}

/**
 * Track timing metrics (e.g., time-to-first-success)
 */
export function trackTiming(metric: string, durationMs: number, metadata?: EventMetadata) {
  trackEvent(metric as AnalyticsEvent, {
    duration_ms: durationMs,
    duration_s: Math.round(durationMs / 1000),
    ...metadata,
  })
}

/**
 * Get all tracked events (for measurement analysis)
 */
export function getTrackedEvents(): Array<{ event: string; timestamp: string; [key: string]: unknown }> {
  if (typeof window === "undefined") return []

  try {
    const storageKey = "analytics_events"
    const existing = localStorage.getItem(storageKey)
    return existing ? JSON.parse(existing) : []
  } catch (err) {
    console.error("Failed to retrieve analytics events:", err)
    return []
  }
}

/**
 * Clear all tracked events (for testing)
 */
export function clearTrackedEvents() {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem("analytics_events")
  } catch (err) {
    console.error("Failed to clear analytics events:", err)
  }
}

/**
 * Calculate time-to-first-success from events
 */
export function calculateTimeToFirstSuccess(): number | null {
  const events = getTrackedEvents()

  const firstVisit = events.find(e => e.event === "first_visit")
  const firstSuccess = events.find(e => e.event === "demo_auto_success" || e.event === "demo_manual_success")

  if (!firstVisit || !firstSuccess) return null

  const start = new Date(firstVisit.timestamp).getTime()
  const end = new Date(firstSuccess.timestamp).getTime()

  return end - start
}

/**
 * Calculate success rate from events
 */
export function calculateSuccessRate(): { successes: number; failures: number; rate: number } | null {
  const events = getTrackedEvents()

  const successes = events.filter(e => e.event === "demo_auto_success" || e.event === "demo_manual_success").length

  const failures = events.filter(e => e.event === "demo_auto_error" || e.event === "demo_manual_error").length

  if (successes + failures === 0) return null

  return {
    successes,
    failures,
    rate: successes / (successes + failures),
  }
}
