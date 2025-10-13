import { create } from "zustand"
import { persist } from "zustand/middleware"

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

  // Actions
  addServer: (name: string, serverConfig: MCPServerConfig) => void
  deleteServer: (name: string) => void
  updateConfig: (config: MCPServers) => void
  reset: () => void
}

const initialState: MCPServers = { mcpServers: {} }

export const useMCPConfigStore = create<MCPConfigStore>()(
  persist(
    set => ({
      config: initialState,

      addServer: (name, serverConfig) =>
        set(state => ({
          config: {
            mcpServers: {
              ...state.config.mcpServers,
              [name]: serverConfig,
            },
          },
        })),

      deleteServer: (name: string) =>
        set(state => {
          const newServers = { ...state.config.mcpServers }
          delete newServers[name]
          return {
            config: {
              mcpServers: newServers,
            },
          }
        }),

      updateConfig: (config: MCPServers) => {
        set({ config })
      },

      reset: () => set({ config: initialState }),
    }),
    {
      name: "mcp_servers_config",
    },
  ),
)
