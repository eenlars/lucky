"use client"

import { useState, useEffect } from "react"
import { Button } from "@/react-flow-visualization/components/ui/button"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Label } from "@/react-flow-visualization/components/ui/label"
import { Trash2, Plus, Eye, EyeOff, Save } from "lucide-react"
import { toast } from "sonner"
import { EnvironmentKeysManager, type EnvironmentKey } from "@/lib/environment-keys"

export default function EnvironmentKeysSettings() {
  const [keys, setKeys] = useState<EnvironmentKey[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = () => {
    try {
      const savedKeys = EnvironmentKeysManager.getKeys()
      setKeys(savedKeys)
    } catch (error) {
      console.error("Failed to load environment keys:", error)
      toast.error("Failed to load environment keys")
    }
  }

  const saveKeys = async (newKeys: EnvironmentKey[]) => {
    try {
      setIsLoading(true)
      EnvironmentKeysManager.saveKeys(newKeys)
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
    const newKey = EnvironmentKeysManager.createKey("", "")
    setKeys([...keys, newKey])
  }

  const updateKey = (id: string, field: keyof EnvironmentKey, value: string | boolean) => {
    const updatedKeys = keys.map(key => (key.id === id ? { ...key, [field]: value } : key))
    setKeys(updatedKeys)
  }

  const deleteKey = (id: string) => {
    const updatedKeys = keys.filter(key => key.id !== id)
    setKeys(updatedKeys)
    toast.message("Key removed", { description: "Click Save to apply changes" })
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

    // Validate key names
    for (const key of keys) {
      const error = EnvironmentKeysManager.validateKeyName(key.name)
      if (error) {
        toast.error(`Invalid key name "${key.name}": ${error}`)
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
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Environment Keys</h2>
        <p className="text-sm text-gray-600 mt-1">Manage your API keys and environment variables for workflows</p>
      </div>

      <div className="space-y-4">
        {keys.map(key => (
          <div key={key.id} className="flex items-center space-x-3 p-4 border rounded-lg bg-gray-50">
            <div className="flex-1">
              <Label htmlFor={`key-name-${key.id}`} className="block mb-1">
                Key Name
              </Label>
              <Input
                id={`key-name-${key.id}`}
                placeholder="e.g., OPENAI_API_KEY"
                autoComplete="off"
                value={key.name}
                onChange={e => updateKey(key.id, "name", e.target.value)}
                className="mb-2"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor={`key-value-${key.id}`} className="block mb-1">
                Key Value
              </Label>
              <div className="relative">
                <Input
                  id={`key-value-${key.id}`}
                  type={key.isVisible ? "text" : "password"}
                  placeholder="Enter your API key"
                  autoComplete="new-password"
                  value={key.value}
                  onChange={e => updateKey(key.id, "value", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  aria-label={key.isVisible ? "Hide key value" : "Show key value"}
                  title={key.isVisible ? "Hide key value" : "Show key value"}
                  onClick={() => toggleVisibility(key.id)}
                >
                  {key.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="pt-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteKey(key.id)}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                aria-label="Remove key"
                title="Remove key"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {keys.length === 0 && (
          <div className="text-center py-8 text-gray-500">No environment keys configured. Add one to get started.</div>
        )}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={addNewKey} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add New Key</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={loadKeys} disabled={isLoading}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Saving..." : "Save Changes"}</span>
          </Button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Security Notice</h3>
        <p className="text-sm text-blue-700">
          Environment keys are stored locally in your browser (localStorage). They are accessible to scripts running on
          this page; avoid pasting untrusted code and keep your browser free of extensions you don’t trust. Never share
          your API keys or store them in version control.
        </p>
      </div>
    </div>
  )
}
