import { create } from "zustand"
import { persist } from "zustand/middleware"
import { toast } from "sonner"

export interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}

export interface MCPServers {
  mcpServers: Record<string, MCPServerConfig>
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

/**
 * Save MCP config to backend database
 * Simple: fetch current → modify → save
 */
async function saveConfigToBackend(config: MCPServers): Promise<void> {
  const response = await fetch("/api/mcp/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })

  if (!response.ok) {
    const error = await response.json()
    toast.error("Failed to save MCP config to database")
    throw new Error(error.error || "Failed to save MCP config")
  }

  toast.success("MCP config saved to database")
}

/**
 * Load MCP config from backend database
 */
async function loadConfigFromBackend(): Promise<MCPServers> {
  const response = await fetch("/api/mcp/config")

  if (!response.ok) {
    toast.error("Failed to load MCP config from database")
    throw new Error("Failed to load MCP config")
  }

  const config = await response.json()
  toast.success("MCP config loaded from database")
  return config
}

export const useMCPConfigStore = create<MCPConfigStore>()(
  persist(
    (set, get) => ({
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

          // Add new server to the list
          const updatedConfig: MCPServers = {
            mcpServers: {
              ...currentConfig.mcpServers,
              [name]: serverConfig,
            },
          }

          // Save to backend
          await saveConfigToBackend(updatedConfig)

          // Update local state
          set({ config: updatedConfig, isSyncing: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({ isSyncing: false, lastSyncError: errorMessage })
          throw error
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

          // Remove server from the list
          const updatedServers = { ...currentConfig.mcpServers }
          delete updatedServers[name]
          const updatedConfig: MCPServers = { mcpServers: updatedServers }

          // Save to backend
          await saveConfigToBackend(updatedConfig)

          // Update local state
          set({ config: updatedConfig, isSyncing: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({ isSyncing: false, lastSyncError: errorMessage })
          throw error
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
          throw error
        }
      },

      /**
       * Load config from backend on mount
       */
      loadFromBackend: async () => {
        set({ isSyncing: true, lastSyncError: null })

        try {
          const config = await loadConfigFromBackend()
          set({ config, isSyncing: false })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({ isSyncing: false, lastSyncError: errorMessage })
          // Don't throw - allow fallback to localStorage
          console.warn("[mcp-config-store] Failed to load from backend, using localStorage")
        }
      },

      reset: () => set({ config: initialState, lastSyncError: null }),
    }),
    {
      name: "mcp_servers_config",
    },
  ),
)
