"use client"

import { getCredentialDisplayName, useSystemHealth } from "@/lib/credential-status"
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

/**
 * Banner component that shows credential/configuration warnings.
 * Only displays when there are issues to report.
 */
export function CredentialStatusBanner() {
  const { health, loading } = useSystemHealth()
  const [dismissed, setDismissed] = useState(false)

  if (loading || !health || dismissed) return null

  // Don't show banner if system is healthy
  if (health.healthy && health.warnings.length === 0) return null

  const hasCriticalIssues = health.missingRequired.length > 0 || health.unavailableFeatures.length > 0
  const severity = hasCriticalIssues ? "error" : "warning"

  return (
    <div
      className={`relative border-b ${
        severity === "error"
          ? "bg-red-50 border-red-200 text-red-900"
          : "bg-yellow-50 border-yellow-200 text-yellow-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-0.5">
              {severity === "error" ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              {health.missingRequired.length > 0 && (
                <div>
                  <p className="font-medium text-sm">Required credentials missing</p>
                  <p className="text-sm mt-1">
                    The following credentials are required for the application to function:{" "}
                    {health.missingRequired.map(getCredentialDisplayName).join(", ")}
                  </p>
                </div>
              )}

              {health.unavailableFeatures.length > 0 && (
                <div>
                  <p className="font-medium text-sm">Some features unavailable</p>
                  <p className="text-sm mt-1">
                    Configure additional credentials to enable: {health.unavailableFeatures.join(", ")}
                  </p>
                </div>
              )}

              {health.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{warning}</p>
                </div>
              ))}

              <div className="mt-2">
                <Link
                  href="/settings"
                  className={`text-sm font-medium underline ${
                    severity === "error" ? "text-red-700 hover:text-red-800" : "text-yellow-700 hover:text-yellow-800"
                  }`}
                >
                  Configure credentials in Settings →
                </Link>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className={`flex-shrink-0 ml-4 p-1 rounded hover:bg-opacity-20 ${
              severity === "error" ? "hover:bg-red-200" : "hover:bg-yellow-200"
            }`}
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact banner for specific pages showing only critical issues.
 */
export function CompactCredentialBanner() {
  const { health, loading } = useSystemHealth()

  if (loading || !health) return null
  if (health.healthy) return null
  if (health.missingRequired.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <p className="text-sm text-red-900">
          Required credentials missing.{" "}
          <Link href="/settings" className="underline font-medium">
            Configure now
          </Link>
        </p>
      </div>
    </div>
  )
}

/**
 * Success indicator when all credentials are configured.
 */
export function CredentialHealthIndicator() {
  const { health, loading } = useSystemHealth()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        <span>Checking configuration...</span>
      </div>
    )
  }

  if (!health) return null

  if (health.healthy && health.warnings.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-green-700 text-sm">
        <CheckCircle className="h-4 w-4" />
        <span>All systems configured</span>
      </div>
    )
  }

  const issueCount = health.missingRequired.length + health.unavailableFeatures.length + health.warnings.length

  return (
    <div className="flex items-center space-x-2 text-yellow-700 text-sm">
      <AlertTriangle className="h-4 w-4" />
      <span>
        {issueCount} configuration {issueCount === 1 ? "issue" : "issues"}
      </span>
    </div>
  )
}
