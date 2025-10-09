import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ConnectorsUIStore {
  activeTab: "marketplace" | "my-connectors" | "mcp-servers"
  searchQuery: string

  setActiveTab: (tab: "marketplace" | "my-connectors" | "mcp-servers") => void
  setSearchQuery: (query: string) => void
  reset: () => void
}

const initialState = {
  activeTab: "marketplace" as const,
  searchQuery: "",
}

export const useConnectorsUIStore = create<ConnectorsUIStore>()(
  persist(
    set => ({
      ...initialState,

      setActiveTab: (tab: "marketplace" | "my-connectors" | "mcp-servers") => set({ activeTab: tab }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      reset: () => set(initialState),
    }),
    {
      name: "connectors-ui",
      partialize: state => ({
        // Only persist tab preference
        activeTab: state.activeTab,
      }),
    },
  ),
)
