"use client"

import { ModelGrid } from "@/components/providers/model-selection/ModelGrid"
import { ProviderConfigSkeleton } from "@/components/providers/provider-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROVIDER_CONFIGS, testConnection, validateApiKey } from "@/lib/providers/provider-utils"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Label } from "@/react-flow-visualization/components/ui/label"
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
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ProviderConfigPageProps {
  provider: LuckyProvider
}

export function ProviderConfigPage({ provider }: ProviderConfigPageProps) {
  const config = PROVIDER_CONFIGS[provider]
  const Icon = config.icon

  const [apiKey, setApiKey] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const [availableModels, setAvailableModels] = useState<EnrichedModelInfo[]>([])
  const [enabledModels, setEnabledModels] = useState<Set<string>>(new Set())
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadConfiguration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadConfiguration = async () => {
    setIsLoading(true)
    try {
      // Load provider settings first
      const settingsResponse = await fetch(`/api/user/provider-settings/${provider}`)
      const loadedEnabledModels = new Set<string>()
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        const enabled = settingsData.enabledModels || []
        setEnabledModels(new Set(enabled))
        loadedEnabledModels.clear()
        for (const model of enabled) {
          loadedEnabledModels.add(model)
        }
      }

      // Load API key from lockbox
      const keyResponse = await fetch(`/api/user/env-keys/${encodeURIComponent(config.apiKeyName)}`)
      if (keyResponse.ok) {
        const keyData = await keyResponse.json()
        setApiKey(keyData.value)
        setIsConfigured(true)

        // Load models with the API key
        await loadModels(keyData.value, loadedEnabledModels)
      }
    } catch (error) {
      console.error("Failed to load configuration:", error)
      toast.error("Failed to load configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const loadModels = async (key: string, existingEnabledModels: Set<string>) => {
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

      const data = await response.json()
      setAvailableModels(data.models || [])

      // If no models were previously enabled, enable all by default
      if (existingEnabledModels.size === 0) {
        setEnabledModels(new Set((data.models || []).map((m: EnrichedModelInfo) => m.name)))
      }
    } catch (error) {
      console.error("Failed to load models:", error)
      toast.error("Failed to load available models")
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setHasUnsavedChanges(true)
    setTestStatus("idle")
    setValidationError(null)
  }

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
        // Load models after successful test
        await loadModels(apiKey, enabledModels)
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
      // Filter enabled models to only those that exist in availableModels
      const validModelNames = new Set(availableModels.map(m => m.name))
      const modelsToSave = [...enabledModels].filter(name => validModelNames.has(name))

      console.log(`Saving ${modelsToSave.length} models for ${provider}`)

      // Save API key to lockbox
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

      // Save provider settings
      const settingsResponse = await fetch("/api/user/provider-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          enabledModels: modelsToSave,
          isEnabled: true,
        }),
      })

      if (!settingsResponse.ok) {
        throw new Error("Failed to save provider settings")
      }

      // Update local state to match what was saved
      setEnabledModels(new Set(modelsToSave))
      setIsConfigured(true)
      setHasUnsavedChanges(false)
      toast.success("Configuration saved successfully")
    } catch (error) {
      console.error("Failed to save configuration:", error)
      toast.error("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleModel = (modelName: string) => {
    const newEnabledModels = new Set(enabledModels)
    if (newEnabledModels.has(modelName)) {
      newEnabledModels.delete(modelName)
    } else {
      newEnabledModels.add(modelName)
    }
    setEnabledModels(newEnabledModels)
    setHasUnsavedChanges(true)
  }

  const bulkToggleModels = (modelNames: string[], enable: boolean) => {
    const newEnabledModels = new Set(enabledModels)
    for (const modelName of modelNames) {
      if (enable) {
        newEnabledModels.add(modelName)
      } else {
        newEnabledModels.delete(modelName)
      }
    }
    setEnabledModels(newEnabledModels)
    setHasUnsavedChanges(true)
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
            <CardTitle className="text-lg">Model Selection</CardTitle>
            <CardDescription>Choose which models are available in your workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelGrid
              models={availableModels}
              enabledModels={enabledModels}
              onToggleModel={toggleModel}
              onBulkToggleModels={bulkToggleModels}
              isLoading={isLoadingModels}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            {hasUnsavedChanges && (
              <p className="text-sm text-yellow-600 flex items-center gap-2">
                <AlertCircle className="size-4" />
                You have unsaved changes
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                loadConfiguration()
                setHasUnsavedChanges(false)
                setValidationError(null)
                setTestStatus("idle")
              }}
              disabled={isSaving || !hasUnsavedChanges}
              className="w-full sm:w-auto"
            >
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges} className="w-full sm:w-auto">
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
