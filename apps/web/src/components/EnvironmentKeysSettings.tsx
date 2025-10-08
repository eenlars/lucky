"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Label } from "@/react-flow-visualization/components/ui/label"
import { AlertCircle, Copy, Eye, EyeOff, Key, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
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

  useEffect(() => {
    loadKeys()
    loadApiKey()
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
        const data = await response.json()
        setApiKey(data.apiKey)
        setIsFullKey(false) // GET only returns key ID, not full key
      }
    } catch (error) {
      console.error("Failed to load API key:", error)
    } finally {
      setIsLoadingApiKey(false)
    }
  }

  const generateApiKey = async () => {
    try {
      setIsGeneratingKey(true)
      const response = await fetch("/api/user/api-key/generate", { method: "POST" })
      if (response.ok) {
        const data = await response.json()
        setApiKey(data.apiKey)
        setIsFullKey(true) // This is the full key, shown only once
        toast.success("API key generated! Save it now - you won't see it again.")
      } else {
        toast.error("Failed to generate API key")
      }
    } catch (error) {
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
        const data = await response.json()
        setApiKey(data.apiKey)
        setIsFullKey(true) // This is the new full key, shown only once
        toast.success("New API key generated! Save it now - your old key is invalid.")
      } else {
        toast.error("Failed to roll API key")
      }
    } catch (error) {
      console.error("Failed to roll API key:", error)
      toast.error("Failed to roll API key")
    } finally {
      setIsRollingKey(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copied to clipboard")
    } catch (error) {
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
          const response = await fetch("/api/user/env-keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: key.name, value: key.value }),
          })
          if (!response.ok) {
            throw new Error(`Failed to save ${key.name}`)
          }
        }),
      )
      setKeys(newKeys)
      toast.success("Environment keys saved successfully")
    } catch (error) {
      console.error("Failed to save environment keys:", error)
      toast.error("Failed to save environment keys")
    } finally {
      setIsLoading(false)
    }
  }

  const addNewKey = () => {
    const newKey = { id: crypto.randomUUID(), name: "", value: "", isVisible: false }
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* API Key Management Section */}
      <Card>
        <CardHeader>
          <CardTitle>API Key</CardTitle>
          <CardDescription>Manage your personal API key for programmatic access to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingApiKey ? (
            <div className="text-center py-8">
              <Loader2 className="size-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading API key...</p>
            </div>
          ) : apiKey ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-sm font-medium">
                  {isFullKey ? "Your API Key (save it now!)" : "API Key ID (reference only)"}
                </Label>
                <div className="flex gap-2">
                  <Input id="api-key" type="text" value={apiKey} readOnly className="font-mono text-sm bg-muted" />
                  <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(apiKey)}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                {isFullKey ? (
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">
                    ⚠️ Save this key now! You won&apos;t be able to see the full key again. Use it to authenticate API
                    requests.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This is your key ID for reference only. The full secret key was shown once during generation.
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <AlertCircle className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-foreground font-medium">Roll your API key</p>
                  <p className="text-xs text-muted-foreground">
                    If your key has been compromised, you can generate a new one. This will immediately invalidate your
                    current key.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={rollApiKey}
                    disabled={isRollingKey}
                    className="mt-2"
                  >
                    {isRollingKey ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Rolling key...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 mr-2" />
                        Roll key
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-muted mb-4">
                <Key className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground mb-1">No API key generated</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate an API key to authenticate programmatic access
              </p>
              <Button type="button" onClick={generateApiKey} disabled={isGeneratingKey} size="sm">
                {isGeneratingKey ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="size-4 mr-2" />
                    Generate API key
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
          <CardDescription>Store API keys and secrets for use in your workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">No environment variables configured</p>
              <Button type="button" variant="outline" onClick={addNewKey} size="sm">
                <Plus className="size-4 mr-2" />
                Add variable
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {keys.map(key => (
                  <div key={key.id} className="rounded-lg border p-4 space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`key-name-${key.id}`} className="text-xs font-medium text-muted-foreground">
                          Variable Name
                        </Label>
                        <Input
                          id={`key-name-${key.id}`}
                          placeholder="e.g., OPENAI_API_KEY"
                          autoComplete="off"
                          value={key.name}
                          onChange={e => updateKey(key.id, "name", e.target.value)}
                          className="text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`key-value-${key.id}`} className="text-xs font-medium text-muted-foreground">
                          Value
                        </Label>
                        <div className="relative">
                          <Input
                            id={`key-value-${key.id}`}
                            type={key.isVisible ? "text" : "password"}
                            placeholder="Enter value"
                            autoComplete="new-password"
                            value={key.value}
                            onChange={e => updateKey(key.id, "value", e.target.value)}
                            className="pr-16 text-sm font-mono"
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0"
                              onClick={() => toggleVisibility(key.id)}
                            >
                              {key.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="size-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => deleteKey(key.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={addNewKey} size="sm">
                  <Plus className="size-4 mr-2" />
                  Add variable
                </Button>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={loadKeys} disabled={isLoading} size="sm">
                    Reset
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={isLoading} size="sm">
                    {isLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 p-3 rounded-lg bg-muted/50 flex gap-3">
            <AlertCircle className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Storage notice</p>
              <p className="text-xs text-muted-foreground">
                Environment variables are encrypted and stored securely in the database. Only you can access them. Never
                commit these values to version control or share them publicly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
