"use client"

import { ProviderConfigSkeleton } from "@/components/providers/provider-skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { EnvironmentKeysManager } from "@/lib/environment-keys"
import { fetchActiveModelNames } from "@/lib/models/client-utils"
import {
  PROVIDER_CONFIGS,
  type ProviderConfig,
  getEnabledModelsKey,
  testConnection,
  validateApiKey,
} from "@/lib/providers/provider-utils"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Label } from "@/react-flow-visualization/components/ui/label"
import type { LuckyProvider } from "@lucky/shared"
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
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface ProviderConfigPageProps {
  provider: LuckyProvider
}

export function ProviderConfigPage({ provider }: ProviderConfigPageProps) {
  const config = PROVIDER_CONFIGS[provider]

  const [apiKey, setApiKey] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [enabledModels, setEnabledModels] = useState<Set<string>>(new Set())
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    loadConfiguration()
    loadModels()
  }, [])

  const loadConfiguration = () => {
    setIsLoading(true)
    try {
      const keys = EnvironmentKeysManager.getKeys()
      const providerKey = keys.find(k => k.name === config.apiKeyName)

      if (providerKey) {
        setApiKey(providerKey.value)
        setIsConfigured(true)
      }

      const savedEnabledModels = localStorage.getItem(getEnabledModelsKey(provider))
      if (savedEnabledModels) {
        setEnabledModels(new Set(JSON.parse(savedEnabledModels)))
      }
    } catch (error) {
      console.error("Failed to load configuration:", error)
      toast.error("Failed to load configuration")
    } finally {
      setIsLoading(false)
    }
  }

  const loadModels = async () => {
    try {
      const models = await fetchActiveModelNames(provider)
      setAvailableModels(models as string[])

      const savedEnabledModels = localStorage.getItem(getEnabledModelsKey(provider))
      if (!savedEnabledModels) {
        setEnabledModels(new Set(models as string[]))
      }
    } catch (error) {
      console.error("Failed to load models:", error)
      toast.error("Failed to load available models")
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
        toast.success(`Connection successful! ${result.modelCount} models available.`)
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

  const handleSave = () => {
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
      const keys = EnvironmentKeysManager.getKeys()
      const existingKeyIndex = keys.findIndex(k => k.name === config.apiKeyName)

      if (existingKeyIndex >= 0) {
        keys[existingKeyIndex].value = apiKey
      } else {
        keys.push(EnvironmentKeysManager.createKey(config.apiKeyName, apiKey))
      }

      EnvironmentKeysManager.saveKeys(keys)
      localStorage.setItem(getEnabledModelsKey(provider), JSON.stringify([...enabledModels]))

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

  const toggleAllModels = (enable: boolean) => {
    setEnabledModels(enable ? new Set(availableModels) : new Set())
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
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <div className="mb-4">
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
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="text-4xl">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold text-foreground">{config.name} Configuration</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
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
            <CardTitle>API Key</CardTitle>
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
                    Your API key is stored locally in your browser. Keep it secure and never share it publicly.
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
                <CardTitle>Model Selection</CardTitle>
                <CardDescription>Choose which models are available in your workflows</CardDescription>
              </div>
              <Badge variant="outline">
                {enabledModels.size} / {availableModels.length} enabled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Loading available models...</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b gap-2">
                    <p className="text-sm text-muted-foreground">Select models to enable</p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllModels(false)}
                        disabled={enabledModels.size === 0}
                      >
                        Disable All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllModels(true)}
                        disabled={enabledModels.size === availableModels.length}
                      >
                        Enable All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-track-muted/20 scrollbar-thumb-border">
                    {availableModels.map(model => (
                      <div
                        key={model}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-medium break-all">{model}</span>
                            {(model.includes("mini") || model.includes("instant") || provider === "groq") && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0"
                              >
                                <Zap className="size-3 mr-1" />
                                Fast
                              </Badge>
                            )}
                            {(model.includes("4o") || model.includes("latest")) && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-purple-50 text-purple-700 border-purple-200 shrink-0"
                              >
                                Latest
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Switch checked={enabledModels.has(model)} onCheckedChange={() => toggleModel(model)} />
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
