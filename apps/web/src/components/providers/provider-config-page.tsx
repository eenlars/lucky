"use client"

import { ProviderConfigSkeleton } from "@/components/providers/provider-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { PROVIDER_CONFIGS, testConnection, validateApiKey } from "@/lib/providers/provider-utils"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Label } from "@/react-flow-visualization/components/ui/label"
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
  Image as ImageIcon,
  Loader2,
  Mic,
  RefreshCw,
  Save,
  Sparkles,
  Video,
  Zap,
} from "lucide-react"
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
        toast.success(`Connection successful! ${result.modelCount} models available.`)
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
   * Enable or disable all models at once. Auto-saves via Zustand store.
   * @param enable true to enable all models, false to disable all
   */
  const handleToggleAllModels = (enable: boolean) => {
    const allModelIds = enable ? availableModels.map(model => model.id) : []
    setProviderModels(provider, allModelIds)
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
          href="/providers"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Providers
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <Icon className="size-10 text-sidebar-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-foreground">{config.name} Configuration</h1>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          </div>
          {isConfigured && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">
              <CheckCircle2 className="size-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* API Key Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">API Key</CardTitle>
            <CardDescription>Your {config.name} API key for accessing models</CardDescription>
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

              {testStatus === "success" && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                  <CheckCircle2 className="size-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-900">Connection Successful</p>
                    <p className="text-xs text-green-700">Your API key is valid and working correctly.</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <AlertCircle className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Security Notice</p>
                  <p className="text-xs text-muted-foreground">
                    Your API key is encrypted and stored securely using AES-256-GCM encryption. Never share it publicly.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Selection */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Model Selection</CardTitle>
                <CardDescription>Choose which models are available in your workflows</CardDescription>
              </div>
              <Badge variant="outline">
                {enabledModels.size} / {availableModels.length} enabled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoadingModels ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading available models...</p>
                </div>
              ) : availableModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="size-8 mx-auto mb-2" />
                  <p className="text-sm">Test your connection first to load available models</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
                    <p className="text-sm text-muted-foreground">Select models to enable</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAllModels(false)}
                        disabled={enabledModels.size === 0}
                      >
                        Disable All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAllModels(true)}
                        disabled={enabledModels.size === availableModels.length}
                      >
                        Enable All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {availableModels.map(model => (
                      <div
                        key={model.id}
                        className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium break-all">{model.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {model.speed}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {model.supportsTools && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Zap className="size-3" />
                                Tools
                              </Badge>
                            )}
                            {model.supportsVision && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <ImageIcon className="size-3" />
                                Vision
                              </Badge>
                            )}
                            {model.supportsReasoning && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Sparkles className="size-3" />
                                Reasoning
                              </Badge>
                            )}
                            {model.supportsAudio && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Mic className="size-3" />
                                Audio
                              </Badge>
                            )}
                            {model.supportsVideo && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Video className="size-3" />
                                Video
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-2 space-y-1">
                            <div>Context: {model.contextLength.toLocaleString()} tokens</div>
                            <div>
                              Cost: ${model.inputCostPer1M.toFixed(2)}/{model.outputCostPer1M.toFixed(2)} per 1M tokens
                            </div>
                            <div>Intelligence: {model.intelligence}/10</div>
                          </div>
                        </div>
                        <Switch
                          checked={enabledModels.has(model.id)}
                          onCheckedChange={() => handleToggleModel(model.id)}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            {hasUnsavedKeyChanges && (
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="size-4" />
                You have unsaved API key changes
              </p>
            )}
          </div>
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
                <>
                  <Save className="size-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
