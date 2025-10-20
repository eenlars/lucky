import { toast } from "sonner"
import { create } from "zustand"

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPServers {
  mcpServers: Record<string, MCPServerConfig>
  lastKnownUpdateAt?: string // For optimistic concurrency control
}

interface MCPConfigStore {
  config: MCPServers
  isSyncing: boolean
  lastSyncError: string | null

  // Actions
  addServer: (name: string, serverConfig: MCPServerConfig) => Promise<void>
  deleteServer: (name: string) => Promise<void>
  updateConfig: (config: MCPServers) => Promise<void>
  loadFromBackend: () => Promise<void>
  reset: () => void
}

const initialState: MCPServers = { mcpServers: {} }

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = "mcp-config"

/**
 * Check if there's legacy localStorage data that needs migration
 */
function checkLegacyLocalStorage(): MCPServers | null {
  if (typeof window === "undefined") return null

  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    // Validate it has the expected structure
    if (parsed && typeof parsed === "object" && "mcpServers" in parsed) {
      return parsed as MCPServers
    }
  } catch (e) {
    console.warn("Failed to parse legacy localStorage MCP config:", e)
  }

  return null
}

/**
 * Clear legacy localStorage after successful migration
 */
function clearLegacyLocalStorage(): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    console.log("[MCP Migration] Cleared legacy localStorage")
  } catch (e) {
    console.warn("Failed to clear legacy localStorage:", e)
  }
}

/**
 * Save MCP config to backend database (mcp.user_server_configs with server_id=NULL)
 */
async function saveConfigToBackend(config: MCPServers): Promise<void> {
  const response = await fetch("/api/mcp/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 409) {
      // Conflict: configuration was modified by another client
      toast.error(`Conflict: ${error.modifiedServers} was modified by another client. Please refresh and try again.`)
      throw new Error("CONCURRENT_MODIFICATION")
    }
    toast.error("Failed to save MCP config to database")
    throw new Error(error.error || "Failed to save MCP config")
  }

  toast.success("MCP config saved to database")
}

/**
 * Load MCP config from backend database (mcp.user_server_configs with server_id=NULL)
 */
async function loadConfigFromBackend(silent = false): Promise<MCPServers> {
  const response = await fetch("/api/mcp/config")

  if (!response.ok) {
    toast.error("Failed to load MCP config from database")
    throw new Error("Failed to load MCP config")
  }

  const config = await response.json()
  if (!silent) {
    toast.success("MCP config loaded from database")
  }
  return config
}

export const useMCPConfigStore = create<MCPConfigStore>((set, _get) => ({
  config: initialState,
  isSyncing: false,
  lastSyncError: null,

  /**
   * Add server: fetch current → add to list → save
   */
  addServer: async (name, serverConfig) => {
    set({ isSyncing: true, lastSyncError: null })

    try {
      // Fetch current config from backend
      const currentConfig = await loadConfigFromBackend()

      // Add new server to the list, preserving lastKnownUpdateAt for concurrency control
      const updatedConfig: MCPServers = {
        mcpServers: {
          ...currentConfig.mcpServers,
          [name]: serverConfig,
        },
        lastKnownUpdateAt: currentConfig.lastKnownUpdateAt,
      }

      // Save to backend
      await saveConfigToBackend(updatedConfig)

      // Update local state
      set({ config: updatedConfig, isSyncing: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      set({ isSyncing: false, lastSyncError: errorMessage })
      // Don't re-throw - error is already tracked in store state
    }
  },

  /**
   * Delete server: fetch current → remove from list → save
   */
  deleteServer: async (name: string) => {
    set({ isSyncing: true, lastSyncError: null })

    try {
      // Fetch current config from backend
      const currentConfig = await loadConfigFromBackend()

      // Remove server from the list, preserving lastKnownUpdateAt for concurrency control
      const updatedServers = { ...currentConfig.mcpServers }
      delete updatedServers[name]
      const updatedConfig: MCPServers = {
        mcpServers: updatedServers,
        lastKnownUpdateAt: currentConfig.lastKnownUpdateAt,
      }

      // Save to backend
      await saveConfigToBackend(updatedConfig)

      // Update local state
      set({ config: updatedConfig, isSyncing: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      set({ isSyncing: false, lastSyncError: errorMessage })
      // Don't re-throw - error is already tracked in store state
    }
  },

  /**
   * Update entire config: save directly
   */
  updateConfig: async (config: MCPServers) => {
    set({ isSyncing: true, lastSyncError: null })

    try {
      // Save to backend
      await saveConfigToBackend(config)

      // Update local state
      set({ config, isSyncing: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      set({ isSyncing: false, lastSyncError: errorMessage })
      // Don't re-throw - error is already tracked in store state
    }
  },

  /**
   * Load config from backend on mount
   * Handles automatic migration from legacy localStorage if needed
   */
  loadFromBackend: async () => {
    set({ isSyncing: true, lastSyncError: null })

    try {
      const config = await loadConfigFromBackend(true) // silent on mount

      // Check if backend is empty but localStorage has legacy data (migration needed)
      const hasBackendData = Object.keys(config.mcpServers).length > 0
      if (!hasBackendData) {
        const legacyConfig = checkLegacyLocalStorage()
        if (legacyConfig && Object.keys(legacyConfig.mcpServers).length > 0) {
          console.log("[MCP Migration] Migrating legacy localStorage config to database...")
          toast.info("Migrating MCP configuration to database...")

          try {
            // Migrate legacy config to backend
            await saveConfigToBackend(legacyConfig)

            // Clear localStorage after successful migration
            clearLegacyLocalStorage()

            // Update local state with migrated config
            set({ config: legacyConfig, isSyncing: false })
            toast.success("MCP configuration migrated successfully")
            return
          } catch (migrationError) {
            console.error("[MCP Migration] Failed to migrate:", migrationError)
            toast.error("Failed to migrate MCP configuration. Please reconfigure manually.")
            // Fall through to set empty config
          }
        }
      }

      set({ config, isSyncing: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      set({ isSyncing: false, lastSyncError: errorMessage })
      // Don't re-throw - error is already tracked in store state
    }
  },

  reset: () => set({ config: initialState, lastSyncError: null }),
}))
