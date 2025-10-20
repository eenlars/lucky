"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/features/react-flow-visualization/components/ui/input"
import { Label } from "@/features/react-flow-visualization/components/ui/label"
import { post } from "@/lib/api/api-client"
import { logException } from "@/lib/error-logger"
import { AlertCircle, Check, Copy, Eye, EyeOff, Key, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

type EnvironmentKey = {
  id: string
  name: string
  value: string
  isVisible: boolean
}

export default function EnvironmentKeysSettings() {
  const [keys, setKeys] = useState<EnvironmentKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true)
  const [isFullKey, setIsFullKey] = useState(false)
  const [isGeneratingKey, setIsGeneratingKey] = useState(false)
  const [isRollingKey, setIsRollingKey] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadKeys()
    loadApiKey()

    // Cleanup timeout on unmount
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const loadKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/user/env-keys")
      if (response.ok) {
        const data = await response.json()
        // Fetch decrypted values for each key
        const keysWithValues = await Promise.all(
          data.keys.map(async (key: { id: string; name: string }) => {
            const valueResponse = await fetch(`/api/user/env-keys/${encodeURIComponent(key.name)}`)
            if (valueResponse.ok) {
              const valueData = await valueResponse.json()
              return {
                id: key.id,
                name: key.name,
                value: valueData.value,
                isVisible: false,
              }
            }
            return { id: key.id, name: key.name, value: "", isVisible: false }
          }),
        )
        setKeys(keysWithValues)
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to load environment keys:", error)
      toast.error("Failed to load environment keys")
    } finally {
      setIsLoading(false)
    }
  }

  const loadApiKey = async () => {
    try {
      setIsLoadingApiKey(true)
      const response = await fetch("/api/user/api-key")
      if (response.ok) {
        const result = await response.json()
        setApiKey(result.data.apiKey)
        setIsFullKey(false) // GET only returns key ID, not full key
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to load API key:", error)
    } finally {
      setIsLoadingApiKey(false)
    }
  }

  const generateApiKey = async () => {
    try {
      setIsGeneratingKey(true)
      const response = await fetch("/api/user/api-key/generate", {
        method: "POST",
      })
      if (response.ok) {
        const result = await response.json()
        setApiKey(result.data.apiKey)
        setIsFullKey(true) // This is the full key, shown only once
        toast.success("API key generated! Save it now - you won't see it again.")
      } else {
        toast.error("Failed to generate API key")
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to generate API key:", error)
      toast.error("Failed to generate API key")
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const rollApiKey = async () => {
    try {
      setIsRollingKey(true)
      const response = await fetch("/api/user/api-key/roll", { method: "POST" })
      if (response.ok) {
        const result = await response.json()
        setApiKey(result.data.apiKey)
        setIsFullKey(true) // This is the new full key, shown only once
        toast.success("New API key generated! Save it now - your old key is invalid.")
      } else {
        toast.error("Failed to roll API key")
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to roll API key:", error)
      toast.error("Failed to roll API key")
    } finally {
      setIsRollingKey(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setJustCopied(true)
      toast.success("Copied to clipboard")

      // Clear existing timeout before setting a new one
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }

      // Store timeout ID in ref for cleanup
      copyTimeoutRef.current = setTimeout(() => setJustCopied(false), 2000)
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to copy to clipboard:", error)
      toast.error("Failed to copy to clipboard")
    }
  }

  const saveKeys = async (newKeys: EnvironmentKey[]) => {
    try {
      setIsLoading(true)
      // Save each key to the backend
      await Promise.all(
        newKeys.map(async key => {
          await post("user/env-keys/set", {
            key: key.name,
            value: key.value,
          })
        }),
      )
      setKeys(newKeys)
      toast.success("Environment keys saved successfully")
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to save environment keys:", error)
      toast.error(`Failed to save environment keys: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const addNewKey = () => {
    const newKey = {
      id: crypto.randomUUID(),
      name: "",
      value: "",
      isVisible: false,
    }
    setKeys([...keys, newKey])
  }

  const updateKey = (id: string, field: keyof EnvironmentKey, value: string | boolean) => {
    const updatedKeys = keys.map(key => (key.id === id ? { ...key, [field]: value } : key))
    setKeys(updatedKeys)
  }

  const deleteKey = async (id: string) => {
    const keyToDelete = keys.find(k => k.id === id)
    if (!keyToDelete || !keyToDelete.name) {
      // If no name, it's a new unsaved key, just remove from state
      setKeys(keys.filter(key => key.id !== id))
      return
    }

    try {
      const response = await fetch(`/api/user/env-keys?name=${encodeURIComponent(keyToDelete.name)}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setKeys(keys.filter(key => key.id !== id))
        toast.success("Environment variable deleted")
      } else {
        toast.error("Failed to delete environment variable")
      }
    } catch (error) {
      logException(error, {
        location: window.location.pathname,
      })
      console.error("Failed to delete environment key:", error)
      toast.error("Failed to delete environment variable")
    }
  }

  const toggleVisibility = (id: string) => {
    const updatedKeys = keys.map(key => (key.id === id ? { ...key, isVisible: !key.isVisible } : key))
    setKeys(updatedKeys)
  }

  const handleSave = () => {
    const emptyKeys = keys.filter(key => !key.name.trim() || !key.value.trim())
    if (emptyKeys.length > 0) {
      toast.error("Please fill in all key names and values, or remove empty entries")
      return
    }

    // Validate key names (alphanumeric + underscore, max 128 chars)
    for (const key of keys) {
      if (!/^[A-Z0-9_]+$/i.test(key.name)) {
        toast.error(`Invalid key name "${key.name}": must be alphanumeric with underscores only`)
        return
      }
      if (key.name.length > 128) {
        toast.error(`Invalid key name "${key.name}": maximum 128 characters`)
        return
      }
    }

    // Check for duplicate key names
    const keyNames = keys.map(k => k.name)
    const duplicates = keyNames.filter((name, index) => keyNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      toast.error(`Duplicate key names found: ${duplicates.join(", ")}`)
      return
    }

    saveKeys(keys)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* API Key Management Section */}
      <Card className="rounded-[10px] border border-black/5 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/50 bg-white/90 dark:bg-white/5 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-primary/[0.01] pointer-events-none" />
        <CardHeader className="relative space-y-1 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-[10px] bg-primary/10 ring-1 ring-primary/20">
              <Key className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold tracking-tight">API Access</CardTitle>
              <CardDescription className="text-sm">Secure programmatic access to your account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {isLoadingApiKey ? (
            <div className="text-center py-12">
              <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary/50" />
              <p className="text-sm text-muted-foreground">Loading API key...</p>
            </div>
          ) : apiKey ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="api-key" className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="size-3.5 text-primary" />
                  {isFullKey ? "Your API Key (save it now!)" : "API Key ID"}
                </Label>
                <div className="relative group">
                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="api-key"
                        type="text"
                        value={apiKey}
                        readOnly
                        className="font-mono text-sm bg-white dark:bg-white/5 border-black/10 dark:border-white/10 pr-12 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all h-10 shadow-sm group-hover:border-primary/30 group-hover:shadow-md"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-primary/10 text-primary">
                          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-xs font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(apiKey)}
                      className="relative overflow-hidden transition-all hover:scale-105 hover:shadow-md h-10 w-10 shrink-0"
                    >
                      <div
                        className={`absolute inset-0 bg-primary/10 transition-opacity ${justCopied ? "opacity-100" : "opacity-0"}`}
                      />
                      {justCopied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
                {isFullKey ? (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium flex items-start gap-2 pl-1">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      Save this key now! You won&apos;t be able to see the full key again. Use it to authenticate API
                      requests.
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground flex items-start gap-2 pl-1">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      This is your key ID for reference only. The full secret key was shown once during generation.
                    </span>
                  </p>
                )}
              </div>

              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="relative overflow-hidden rounded-[10px] border border-destructive/20 dark:border-destructive/30 bg-white/60 dark:bg-white/5 backdrop-blur-sm shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/[0.03] to-transparent" />
                <div className="relative p-4 flex items-start gap-4">
                  <div className="flex items-center justify-center size-10 rounded-[10px] bg-destructive/10 ring-1 ring-destructive/20 shrink-0">
                    <RefreshCw className="size-5 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Rotate API Key</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generate a new key if the current one has been compromised. This action immediately invalidates
                        your existing key.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={rollApiKey}
                      disabled={isRollingKey}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      {isRollingKey ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Rotating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="size-4 mr-2" />
                          Rotate Key
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-[10px] blur-xl animate-pulse" />
                <div className="relative flex items-center justify-center size-20 rounded-[10px] bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
                  <Key className="size-10 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Connect</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Generate your first API key to start building with programmatic access
              </p>
              <Button
                type="button"
                onClick={generateApiKey}
                disabled={isGeneratingKey}
                size="default"
                className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-2">
                  {isGeneratingKey ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Generate API Key</span>
                    </>
                  )}
                </div>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Keys Section */}
      <Card className="rounded-[10px] border border-black/5 dark:border-white/10 shadow-xl shadow-black/5 dark:shadow-black/50 bg-white/90 dark:bg-white/5 backdrop-blur-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />
        <CardHeader className="relative space-y-1 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-[10px] bg-accent/50 ring-1 ring-accent-foreground/10">
                <div className="size-5 font-mono font-bold text-accent-foreground flex items-center justify-center">
                  $
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">Environment Variables</CardTitle>
                <CardDescription className="text-sm">Securely store secrets for workflow execution</CardDescription>
              </div>
            </div>
            {keys.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={addNewKey}
                size="sm"
                className="relative overflow-hidden group transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus className="size-4 mr-2" />
                <span>Add Variable</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative">
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 bg-accent/20 rounded-[10px] blur-xl" />
                <div className="relative flex items-center justify-center size-20 rounded-[10px] bg-gradient-to-br from-accent/30 to-accent/10 ring-1 ring-accent-foreground/10">
                  <div className="text-3xl font-mono font-bold text-accent-foreground">$</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Variables Yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Add environment variables to securely store API keys and secrets
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={addNewKey}
                size="default"
                className="shadow-sm hover:shadow-md transition-all"
              >
                <Plus className="size-4 mr-2" />
                Add First Variable
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Header Row */}
                <div className="grid grid-cols-[1fr,1fr,auto] gap-4 px-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Variable Name
                  </Label>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Value
                  </Label>
                  <div className="w-[72px]" />
                </div>

                {/* Variable Rows */}
                {keys.map(key => (
                  <div key={key.id} className="grid grid-cols-[1fr,1fr,auto] gap-4 items-center">
                    <Input
                      id={`key-name-${key.id}`}
                      placeholder="OPENAI_API_KEY"
                      autoComplete="off"
                      value={key.name}
                      onChange={e => updateKey(key.id, "name", e.target.value)}
                      className="text-sm font-mono bg-white dark:bg-black/20 border-black/10 dark:border-white/10 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all shadow-sm"
                    />
                    <Input
                      id={`key-value-${key.id}`}
                      type={key.isVisible ? "text" : "password"}
                      placeholder="sk-..."
                      autoComplete="new-password"
                      value={key.value}
                      onChange={e => updateKey(key.id, "value", e.target.value)}
                      className="text-sm font-mono bg-white dark:bg-black/20 border-black/10 dark:border-white/10 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all shadow-sm"
                    />
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 hover:bg-accent transition-all"
                        onClick={() => toggleVisibility(key.id)}
                      >
                        {key.isVisible ? (
                          <EyeOff className="size-4 text-muted-foreground" />
                        ) : (
                          <Eye className="size-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0 hover:bg-destructive/10 transition-all"
                        onClick={() => deleteKey(key.id)}
                      >
                        <Trash2 className="size-4 text-destructive/70 hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6 bg-gradient-to-r from-transparent via-border to-transparent" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={loadKeys}
                    disabled={isLoading}
                    size="sm"
                    className="text-muted-foreground hover:text-foreground transition-all"
                  >
                    Reset Changes
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  size="sm"
                  className="relative overflow-hidden group shadow-md hover:shadow-lg transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </>
          )}

          {keys.length > 0 && (
            <div className="mt-6 relative overflow-hidden rounded-[10px] border border-primary/20 dark:border-primary/30 bg-white/60 dark:bg-white/5 backdrop-blur-sm shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent" />
              <div className="relative p-4 flex gap-3">
                <div className="flex items-center justify-center size-9 rounded-[10px] bg-primary/10 ring-1 ring-primary/20 shrink-0">
                  <AlertCircle className="size-4 text-primary" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-semibold text-foreground">Secure Storage</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Environment variables are encrypted and stored securely in the database. Only you can access them.
                    Never commit these values to version control or share them publicly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
