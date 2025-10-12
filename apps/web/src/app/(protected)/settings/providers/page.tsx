"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROVIDER_CONFIGS } from "@/lib/providers/provider-utils"
import type { LuckyProvider } from "@lucky/shared"
import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

interface ProviderCardData {
  provider: LuckyProvider
  hasApiKey: boolean
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setIsLoading(true)
    try {
      const keysResponse = await fetch("/api/user/env-keys")
      const keysData = keysResponse.ok ? await keysResponse.json() : { keys: [] }
      const keyNames = new Set(keysData.keys.map((k: { name: string }) => k.name))

      const providerData: ProviderCardData[] = (Object.keys(PROVIDER_CONFIGS) as LuckyProvider[]).map(provider => {
        const config = PROVIDER_CONFIGS[provider]
        const hasApiKey = keyNames.has(config.apiKeyName)

        return {
          provider,
          hasApiKey,
        }
      })

      setProviders(providerData)
    } catch (error) {
      console.error("Failed to load providers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">Providers</h1>
          <p className="text-sm text-muted-foreground">Configure your API keys for each provider</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-10 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Providers</h1>
        <p className="text-sm text-muted-foreground">Configure your API keys for each provider</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="flex items-center gap-3">
                  {config.logo ? (
                    <Image
                      src={config.logo}
                      alt={`${config.name} logo`}
                      width={32}
                      height={32}
                      className="size-8 object-contain"
                    />
                  ) : Icon ? (
                    <Icon className="size-8 text-sidebar-primary" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">{config.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isDisabled ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Currently Unavailable
                  </Button>
                ) : (
                  <Link href={`/settings/providers/${config.slug}`}>
                    <Button variant="outline" size="sm" className="w-full group">
                      {providerData.hasApiKey ? "Manage" : "Configure"}
                      <ArrowRight className="size-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
