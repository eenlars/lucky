import { useMCPConfigStore } from "@/stores/mcp-config-store"
import { useEffect, useState } from "react"

/**
 * Hook to sync MCP configuration between localStorage and Supabase lockbox
 * Loads config from backend on mount and provides sync function
 */
export function useMCPSync() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { config, updateConfig } = useMCPConfigStore()

  /**
   * Load MCP config from backend
   */
  const loadFromBackend = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/mcp/config")
      if (!response.ok) {
        throw new Error(`Failed to load MCP config: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.mcpServers) {
        // Merge backend config with local config (backend takes precedence)
        updateConfig(data)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load MCP config"
      setError(message)
      console.error("[useMCPSync] Load error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Save current local config to backend
   */
  const saveToBackend = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/mcp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save MCP config")
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save MCP config"
      setError(message)
      console.error("[useMCPSync] Save error:", err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Auto-load on mount
   */
  useEffect(() => {
    loadFromBackend()
  }, [])

  return {
    isLoading,
    error,
    loadFromBackend,
    saveToBackend,
  }
}
