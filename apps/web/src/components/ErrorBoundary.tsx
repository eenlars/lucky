"use client"

import { Button } from "@/components/ui/button"
import React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent error={this.state.error} reset={() => this.setState({ hasError: false, error: null })} />
        )
      }

      return (
        <DefaultErrorFallback error={this.state.error} reset={() => this.setState({ hasError: false, error: null })} />
      )
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We encountered an unexpected error. This has been logged and we'll look into it.
            </p>
          </div>
          <details className="w-full">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Error details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs text-left font-mono text-red-600 dark:text-red-400 overflow-auto max-h-40">
              {error.message}
              {error.stack && <pre className="mt-2 text-gray-600 dark:text-gray-500 text-xs">{error.stack}</pre>}
            </div>
          </details>
          <div className="flex gap-3 w-full">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/"
              }}
              variant="outline"
              className="flex-1"
            >
              Go home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
