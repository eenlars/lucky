"use client"

import { ProviderOverviewSkeleton } from "@/components/providers/provider-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROVIDER_CONFIGS } from "@/lib/providers/provider-utils"
import type { LuckyProvider } from "@lucky/shared"
import { AlertCircle, ArrowRight, CheckCircle2, Key } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type ProviderStatus = "configured" | "partial" | "unconfigured"

interface ProviderCardData {
  provider: LuckyProvider
  status: ProviderStatus
  enabledModels: number
  hasApiKey: boolean
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [configuredCount, setConfiguredCount] = useState(0)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setIsLoading(true)
    try {
      // Load all env keys
      const keysResponse = await fetch("/api/user/env-keys")
      const keysData = keysResponse.ok ? await keysResponse.json() : { keys: [] }
      const keyNames = new Set(keysData.keys.map((k: { name: string }) => k.name))

      // Load all provider settings
      const settingsResponse = await fetch("/api/user/provider-settings")
      const settingsData = settingsResponse.ok ? await settingsResponse.json() : { settings: [] }
      const settingsMap = new Map<string, { provider: string; enabledModels: string[] }>(
        settingsData.settings.map((s: { provider: string; enabledModels: string[] }) => [s.provider, s]),
      )

      const providerData: ProviderCardData[] = (Object.keys(PROVIDER_CONFIGS) as LuckyProvider[]).map(provider => {
        const config = PROVIDER_CONFIGS[provider]
        const hasApiKey = keyNames.has(config.apiKeyName)
        const settings = settingsMap.get(provider)
        const enabledModels = settings?.enabledModels?.length ?? 0

        let status: ProviderStatus = "unconfigured"
        if (hasApiKey && enabledModels > 0) {
          status = "configured"
        } else if (hasApiKey) {
          status = "partial"
        }

        return {
          provider,
          status,
          enabledModels,
          hasApiKey,
        }
      })

      setProviders(providerData)
      setConfiguredCount(providerData.filter(p => p.status === "configured").length)
    } catch (error) {
      console.error("Failed to load providers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: ProviderStatus) => {
    switch (status) {
      case "configured":
        return <CheckCircle2 className="size-5 text-green-500" />
      case "partial":
        return <AlertCircle className="size-5 text-yellow-500" />
      case "unconfigured":
        return <AlertCircle className="size-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case "configured":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="size-3 mr-1" />
            Ready
          </Badge>
        )
      case "partial":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="size-3 mr-1" />
            Incomplete
          </Badge>
        )
      case "unconfigured":
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Not Configured
          </Badge>
        )
    }
  }

  if (isLoading) {
    return <ProviderOverviewSkeleton />
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">AI Providers</h1>
        <p className="text-sm text-muted-foreground">
          Configure your API keys and manage model access for each provider
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="size-4" />
              Configured Providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {configuredCount} / {providers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {configuredCount === providers.length
                ? "All providers ready"
                : `${providers.length - configuredCount} remaining`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Key className="size-4" />
              Active Models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{providers.reduce((sum, p) => sum + p.enabledModels, 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Enabled across all providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              Security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">AES-256</div>
            <p className="text-xs text-muted-foreground mt-1">All API keys encrypted</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {providers.map(providerData => {
          const config = PROVIDER_CONFIGS[providerData.provider]
          const Icon = config.icon
          const isDisabled = config.disabled
          return (
            <Card
              key={providerData.provider}
              className={`transition-shadow ${isDisabled ? "opacity-60" : "hover:shadow-md"}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className="size-8 shrink-0 text-sidebar-primary" />
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{config.description}</CardDescription>
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusIcon(providerData.status)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {isDisabled ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Disabled
                      </Badge>
                    ) : (
                      getStatusBadge(providerData.status)
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Enabled Models</span>
                    <span className="text-sm font-medium">{providerData.enabledModels}</span>
                  </div>

                  {providerData.status === "partial" && !isDisabled && (
                    <div className="flex items-start gap-2 p-2 rounded bg-yellow-50 border border-yellow-200">
                      <AlertCircle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-yellow-700">API key configured but no models enabled</p>
                    </div>
                  )}

                  <div className="pt-2">
                    {isDisabled ? (
                      <Button variant="outline" size="sm" className="w-full" disabled>
                        <Key className="size-4 mr-2" />
                        Currently Unavailable
                      </Button>
                    ) : (
                      <Link href={`/providers/${config.slug}`}>
                        <Button variant="outline" size="sm" className="w-full group">
                          {providerData.status === "unconfigured" ? (
                            <>
                              <Key className="size-4 mr-2" />
                              Configure Provider
                            </>
                          ) : (
                            <>
                              <Key className="size-4 mr-2" />
                              Manage Settings
                            </>
                          )}
                          <ArrowRight className="size-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Help Card */}
      {configuredCount === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted mb-2">
                <Key className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Get Started with AI Providers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure at least one provider to start using AI models in your workflows. Each provider requires an
                  API key and model selection.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/providers/openai">
                  <Button variant="outline">Configure OpenAI</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
