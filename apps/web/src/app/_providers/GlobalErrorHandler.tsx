"use client"

import { initGlobalErrorHandlers } from "@/lib/global-error-handler"
import { useEffect } from "react"

/**
 * Provider component that initializes global error handlers
 * Must be a client component to access window events
 * Handlers are guarded against duplicate registration
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    initGlobalErrorHandlers()
    // No cleanup - handlers are global and should persist for app lifetime
  }, [])

  return null
}
