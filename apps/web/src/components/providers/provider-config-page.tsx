"use client"

import { ModelGrid } from "@/components/providers/model-selection/ModelGrid"
import { ProviderConfigSkeleton } from "@/components/providers/provider-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/features/react-flow-visualization/components/ui/input"
import { Label } from "@/features/react-flow-visualization/components/ui/label"
import { PROVIDER_CONFIGS, testConnection, validateApiKey } from "@/lib/providers/provider-utils"
import { useModelPreferencesStore } from "@/stores/model-preferences-store"
import type { EnrichedModelInfo, LuckyProvider } from "@lucky/shared"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ProviderConfigPageProps {
  provider: LuckyProvider
}

/**
 * Provider configuration page for managing API keys and model preferences.
 * Model preferences are auto-saved via Zustand store with optimistic updates.
 */
export function ProviderConfigPage({ provider }: ProviderConfigPageProps) {
  const config = PROVIDER_CONFIGS[provider]
  const Icon = config.icon

  // Zustand store for model preferences (auto-saves on toggle)
  const {
    loadPreferences,
    getEnabledModels,
    toggleModel: toggleModelInStore,
    setProviderModels,
  } = useModelPreferencesStore()

  // API key state (saved manually via "Save Configuration" button)
  const [apiKey, setApiKey] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [hasUnsavedKeyChanges, setHasUnsavedKeyChanges] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Test connection state
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const [isTesting, setIsTesting] = useState(false)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Available models from provider API (not user preferences)
  const [availableModels, setAvailableModels] = useState<EnrichedModelInfo[]>([])

  // Get enabled models from Zustand store (full model IDs like "openai/gpt-4o")
  const enabledModelIds = getEnabledModels(provider)
  const enabledModels = new Set(enabledModelIds)

  // Load preferences from store on mount
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Load API key from lockbox and fetch available models from provider API.
   * Note: Enabled model preferences are loaded separately via Zustand store.
   */
  const loadConfiguration = async () => {
    setIsLoading(true)
    try {
      const keyResponse = await fetch(`/api/user/env-keys/${encodeURIComponent(config.apiKeyName)}`)
      if (keyResponse.ok) {
        const keyData: { value: string } = await keyResponse.json()
        setApiKey(keyData.value)
        setIsConfigured(true)

        await loadModels(keyData.value)
      }
    } catch (error) {
      console.error("Failed to load configuration:", error)
      toast.error("Failed to load configuration")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Fetch available models from provider API using the API key.
   * This shows what models the provider offers, not which ones are enabled.
   */
  const loadModels = async (key: string) => {
    if (!key) return

    setIsLoadingModels(true)
    try {
      const response = await fetch(`/api/providers/${provider}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key, includeMetadata: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to load models")
      }

      const data: { models: EnrichedModelInfo[] } = await response.json()
      setAvailableModels(data.models || [])
    } catch (error) {
      console.error("Failed to load models:", error)
      toast.error("Failed to load available models")
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setHasUnsavedKeyChanges(true)
    setTestStatus("idle")
    setValidationError(null)
  }

  /**
   * Test the API key by attempting to connect to the provider's API.
   * On success, loads available models from the provider.
   */
  const handleTestConnection = async () => {
    const validation = validateApiKey(provider, apiKey)
    if (!validation.valid) {
      setValidationError(validation.error || null)
      toast.error(validation.error)
      return
    }

    setIsTesting(true)
    setTestStatus("idle")
    setValidationError(null)

    try {
      const result = await testConnection(provider, apiKey)

      if (result.success) {
        setTestStatus("success")
        toast.success("Connection successful")
        await loadModels(apiKey)
      } else {
        setTestStatus("error")
        toast.error(result.error || "Connection failed")
        setValidationError(result.error || null)
      }
    } catch (_error) {
      setTestStatus("error")
      toast.error("Failed to test connection")
    } finally {
      setIsTesting(false)
    }
  }

  /**
   * Save API key to encrypted lockbox.
   * Note: Model preferences are auto-saved immediately via Zustand store.
   */
  const handleSave = async () => {
    const validation = validateApiKey(provider, apiKey)
    if (!validation.valid) {
      setValidationError(validation.error || null)
      toast.error(validation.error)
      return
    }

    if (enabledModels.size === 0) {
      toast.error("Please enable at least one model")
      return
    }

    setIsSaving(true)
    try {
      const keyResponse = await fetch("/api/user/env-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.apiKeyName,
          value: apiKey,
        }),
      })

      if (!keyResponse.ok) {
        throw new Error("Failed to save API key")
      }

      setIsConfigured(true)
      setHasUnsavedKeyChanges(false)
      toast.success("Configuration saved successfully")
    } catch (error) {
      console.error("Failed to save configuration:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  /**
   * Toggle a single model on/off. Auto-saves via Zustand store with optimistic updates.
   * @param modelId Full model ID (e.g., "openai/gpt-4o")
   */
  const handleToggleModel = (modelId: string) => {
    toggleModelInStore(provider, modelId)
  }

  /**
   * Bulk toggle models. Auto-saves via Zustand store.
   * @param modelIds Array of full model IDs (e.g., ["openai/gpt-4o", "openai/gpt-4o-mini"])
   * @param enable true to enable models, false to disable them
   */
  const handleBulkToggleModels = (modelIds: string[], enable: boolean) => {
    if (enable) {
      // Add models to existing enabled set
      const currentEnabled = getEnabledModels(provider)
      const newEnabled = Array.from(new Set([...currentEnabled, ...modelIds]))
      setProviderModels(provider, newEnabled)
    } else {
      // Remove models from enabled set
      const currentEnabled = getEnabledModels(provider)
      const toDisable = new Set(modelIds)
      const newEnabled = currentEnabled.filter(id => !toDisable.has(id))
      setProviderModels(provider, newEnabled)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch (_error) {
      toast.error("Failed to copy to clipboard")
    }
  }

  if (isLoading) {
    return <ProviderConfigSkeleton />
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/settings/providers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Providers
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-3">
          {config.logo ? (
            <Image
              src={config.logo}
              alt={`${config.name} logo`}
              width={40}
              height={40}
              className="size-10 object-contain"
            />
          ) : Icon ? (
            <Icon className="size-10 text-sidebar-primary" />
          ) : null}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-foreground">{config.name} Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">API Key</CardTitle>
                <CardDescription>Your {config.name} API key for accessing models</CardDescription>
              </div>
              {isConfigured && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Connected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-sm font-medium">
                  API Key
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      type={isVisible ? "text" : "password"}
                      placeholder={`${config.apiKeyPrefix}...`}
                      value={apiKey}
                      onChange={e => handleApiKeyChange(e.target.value)}
                      autoComplete="off"
                      className={`pr-16 font-mono text-sm ${validationError ? "border-destructive" : ""}`}
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0"
                        onClick={() => setIsVisible(!isVisible)}
                      >
                        {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                      {apiKey && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => copyToClipboard(apiKey)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={!apiKey || isTesting}
                    className="shrink-0 w-full sm:w-auto"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : testStatus === "success" ? (
                      <>
                        <CheckCircle2 className="size-4 mr-2 text-green-600" />
                        Connected
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
                {validationError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {validationError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href={config.keysUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {config.name} Platform
                    <ExternalLink className="size-3" />
                  </a>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Your key is stored securely</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Selection</CardTitle>
            <CardDescription>Choose which models are available in your workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelGrid
              models={availableModels}
              enabledModels={enabledModels}
              onToggleModel={handleToggleModel}
              onBulkToggleModels={handleBulkToggleModels}
              isLoading={isLoadingModels}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>{hasUnsavedKeyChanges && <p className="text-sm text-muted-foreground">Unsaved changes</p>}</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                loadConfiguration()
                setHasUnsavedKeyChanges(false)
                setValidationError(null)
                setTestStatus("idle")
              }}
              disabled={isSaving || !hasUnsavedKeyChanges}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasUnsavedKeyChanges} className="w-full sm:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
