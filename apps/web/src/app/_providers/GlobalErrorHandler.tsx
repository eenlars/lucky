"use client"

import { initGlobalErrorHandlers } from "@/lib/global-error-handler"
import { useEffect } from "react"

/**
 * Provider component that initializes global error handlers
 * Must be a client component to access window events
 */
export function GlobalErrorHandler() {
  useEffect(() => {
    initGlobalErrorHandlers()
  }, [])

  return null
}
