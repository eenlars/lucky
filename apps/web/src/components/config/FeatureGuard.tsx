"use client"

import type { FeatureName } from "@/lib/credential-status"
import { getCredentialDisplayName, getFeatureDisplayName, useFeatureStatus } from "@/lib/credential-status"
import { AlertCircle, Lock } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

interface FeatureGuardProps {
  feature: FeatureName
  children: ReactNode
  fallback?: ReactNode
  showUpgradePrompt?: boolean
}

/**
 * Wrapper component that conditionally renders content based on feature availability.
 * Shows upgrade prompt or custom fallback when feature is unavailable.
 */
export function FeatureGuard({ feature, children, fallback, showUpgradePrompt = true }: FeatureGuardProps) {
  const { features, loading, error } = useFeatureStatus()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    )
  }

  // Handle loading errors
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-900">Failed to load feature status</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const featureStatus = features.find(f => f.feature === feature)

  if (!featureStatus) {
    return <div className="text-red-600 p-4">Error: Unknown feature &quot;{feature}&quot;</div>
  }

  // Feature is available - render children
  if (featureStatus.available) {
    return <>{children}</>
  }

  // Feature unavailable with fallback mode
  if (featureStatus.fallbackAvailable) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900">Using fallback mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                {featureStatus.description} is running with limited functionality. Configure{" "}
                {featureStatus.credentials.map(getCredentialDisplayName).join(" and ")} to enable full features.
              </p>
              {showUpgradePrompt && (
                <Link
                  href="/settings"
                  className="text-sm font-medium text-blue-700 hover:text-blue-800 underline mt-2 inline-block"
                >
                  Configure in Settings →
                </Link>
              )}
            </div>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Feature unavailable without fallback - show prompt or custom fallback
  if (fallback) {
    return <>{fallback}</>
  }

  if (!showUpgradePrompt) {
    return null
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{getFeatureDisplayName(feature)} Unavailable</h3>
      <p className="text-sm text-gray-600 mb-4 max-w-md mx-auto">{featureStatus.description}</p>
      <div className="bg-white rounded-md p-4 mb-4 inline-block text-left">
        <p className="text-sm font-medium text-gray-900 mb-2">Required credentials:</p>
        <ul className="text-sm text-gray-600 space-y-1">
          {featureStatus.credentials.map(cred => (
            <li key={cred} className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 bg-gray-400 rounded-full" />
              <span>{getCredentialDisplayName(cred)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Configure Credentials
        </Link>
      </div>
    </div>
  )
}

/**
 * Inline feature requirement indicator.
 */
export function FeatureRequirement({ feature }: { feature: FeatureName }) {
  const { features, loading } = useFeatureStatus()

  if (loading) return null

  const featureStatus = features.find(f => f.feature === feature)
  if (!featureStatus || featureStatus.available) return null

  return (
    <div className="inline-flex items-center space-x-1 text-xs text-gray-500">
      <Lock className="h-3 w-3" />
      <span>Requires {featureStatus.credentials.map(getCredentialDisplayName).join(", ")}</span>
    </div>
  )
}
