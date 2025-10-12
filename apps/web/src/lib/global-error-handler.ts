"use client"

import { logException } from "./error-logger"

// Track if handlers are already registered to prevent duplicates
let handlersRegistered = false

// Handler functions defined once
const errorHandler = (event: ErrorEvent) => {
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
}

const rejectionHandler = (event: PromiseRejectionEvent) => {
  logException(event.reason, {
    message: `Unhandled promise rejection: ${event.reason?.message ?? event.reason}`,
    error: event.reason,
    severity: "error",
  })
}

/**
 * Set up global error handlers for uncaught errors and unhandled promise rejections
 * Call this once at app startup
 * Guarded against multiple registrations to prevent duplicate logging (e.g., React Strict Mode)
 */
export function initGlobalErrorHandlers() {
  if (typeof window === "undefined") return
  if (handlersRegistered) return

  // Handle uncaught errors
  window.addEventListener("error", errorHandler)

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", rejectionHandler)

  handlersRegistered = true
}

/**
 * Clean up global error handlers (useful for testing or unmounting)
 */
export function cleanupGlobalErrorHandlers() {
  if (typeof window === "undefined") return
  if (!handlersRegistered) return

  window.removeEventListener("error", errorHandler)
  window.removeEventListener("unhandledrejection", rejectionHandler)

  handlersRegistered = false
}
