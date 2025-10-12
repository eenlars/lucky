"use client"

import { logException } from "./error-logger"

/**
 * Set up global error handlers for uncaught errors and unhandled promise rejections
 * Call this once at app startup
 */
export function initGlobalErrorHandlers() {
  if (typeof window === "undefined") return

  // Handle uncaught errors
  window.addEventListener("error", event => {
    logException(event.error ?? event.message, {
      message: `Uncaught error: ${event.message}`,
      error: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      severity: "error",
    })
  })

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", event => {
    logException(event.reason, {
      message: `Unhandled promise rejection: ${event.reason?.message ?? event.reason}`,
      error: event.reason,
      severity: "error",
    })
  })
}
