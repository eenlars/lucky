/**
 * Model Preferences Zustand Store
 * Centralized state management for user model preferences with optimistic updates
 */

import { logException } from "@/lib/error-logger"
import { extractFetchError } from "@/lib/utils/extract-fetch-error"
import type { LuckyProvider, ModelId, UserModelPreferences } from "@lucky/shared"
import {
  getEnabledModelsForProvider,
  isModelEnabled,
  setEnabledModelsForProvider,
  toggleModel as toggleModelUtil,
} from "@lucky/shared"
import { toast } from "sonner"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ModelPreferencesState {
  // State
  preferences: UserModelPreferences | null
  isLoading: boolean
  isSaving: boolean
  lastSynced: Date | null
  error: string | null

  // Actions
  loadPreferences: () => Promise<void>
  getEnabledModels: (provider: LuckyProvider) => ModelId[]
  isEnabled: (modelId: ModelId) => boolean
  toggleModel: (provider: LuckyProvider, modelId: ModelId) => Promise<void>
  setProviderModels: (provider: LuckyProvider, modelIds: ModelId[]) => Promise<void>
  removeModel: (provider: LuckyProvider, modelId: ModelId) => Promise<void>
  removeProvider: (provider: LuckyProvider) => Promise<void>
  syncFromServer: () => Promise<void>
  clearError: () => void

  // Sync status helpers
  isStale: () => boolean
  getLastSyncedRelative: () => string | null
  forceRefresh: () => Promise<void>
}

/**
 * Helper function to filter out deleted providers from preferences
 */
function filterDeletedProviders(preferences: UserModelPreferences): UserModelPreferences {
  return {
    ...preferences,
    providers: preferences.providers.filter(p => p.isEnabled),
  }
}

export const useModelPreferencesStore = create<ModelPreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: null,
      isLoading: false,
      isSaving: false,
      lastSynced: null,
      error: null,

      // Load preferences from server
      loadPreferences: async () => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch("/api/user/model-preferences")

          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data = await response.json()

          set({
            preferences: filterDeletedProviders(data),
            lastSynced: new Date(data.lastSynced),
            isLoading: false,
          })
        } catch (error) {
          logException(error, {
            location: "/store/model-preferences",
          })
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          console.error("[model-preferences-store] Error loading preferences:", error)
          set({
            error: errorMessage,
            isLoading: false,
          })
          toast.error(`Failed to load preferences: ${errorMessage}`)
        }
      },

      // Get enabled models for a provider (from local state)
      getEnabledModels: (provider: LuckyProvider) => {
        const { preferences } = get()
        return getEnabledModelsForProvider(preferences, provider)
      },

      // Check if a model is enabled (from local state)
      isEnabled: (modelId: ModelId) => {
        const { preferences } = get()
        return isModelEnabled(preferences, modelId)
      },

      // Toggle a single model on/off with optimistic update
      toggleModel: async (provider: LuckyProvider, modelId: ModelId) => {
        const { preferences } = get()

        if (!preferences) {
          toast.error("Preferences not loaded")
          return
        }

        // Note: We don't validate against MODEL_CATALOG because the provider's API is the source of truth
        // Our catalog is just for enrichment with pricing/metadata, not for gatekeeping

        // Optimistic update
        const previousPreferences = preferences
        const updatedPreferences = toggleModelUtil(preferences, provider, modelId)
        set({ preferences: updatedPreferences, isSaving: true, error: null })

        try {
          const response = await fetch("/api/user/model-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPreferences),
          })

          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data = await response.json()
          set({
            preferences: filterDeletedProviders(data),
            lastSynced: new Date(data.lastSynced),
            isSaving: false,
          })
        } catch (error) {
          logException(error, {
            location: "/store/model-preferences",
          })
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            preferences: previousPreferences,
            error: errorMessage,
            isSaving: false,
          })
          toast.error(`Failed to update: ${errorMessage}`)
        }
      },

      // Set all enabled models for a provider with optimistic update
      setProviderModels: async (provider: LuckyProvider, modelIds: ModelId[]) => {
        const { preferences } = get()

        if (!preferences) {
          toast.error("Preferences not loaded")
          return
        }

        // Note: We don't validate against MODEL_CATALOG because the provider's API is the source of truth
        // Our catalog is just for enrichment with pricing/metadata, not for gatekeeping

        // Optimistic update
        const previousPreferences = preferences
        const updatedPreferences = setEnabledModelsForProvider(preferences, provider, modelIds)
        set({ preferences: updatedPreferences, isSaving: true, error: null })

        try {
          const response = await fetch("/api/user/model-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPreferences),
          })

          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data = await response.json()
          set({
            preferences: filterDeletedProviders(data),
            lastSynced: new Date(data.lastSynced),
            isSaving: false,
          })
          toast.success("Preferences saved")
        } catch (error) {
          logException(error, {
            location: "/store/model-preferences",
          })
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            preferences: previousPreferences,
            error: errorMessage,
            isSaving: false,
          })
          toast.error(`Failed to save: ${errorMessage}`)
        }
      },

      // Remove a single model from a provider with optimistic update
      removeModel: async (provider: LuckyProvider, modelId: ModelId) => {
        const { preferences } = get()

        if (!preferences) {
          toast.error("Preferences not loaded")
          return
        }

        // Check if provider exists
        const providerSettings = preferences.providers.find(p => p.provider === provider)
        if (!providerSettings) {
          toast.error(`Provider "${provider}" not found`)
          return
        }

        // Check if model exists in the provider
        if (!providerSettings.enabledModels.includes(modelId)) {
          toast.error(`Model "${modelId}" not found in provider "${provider}"`)
          return
        }

        // Optimistic update
        const previousPreferences = preferences
        const updatedPreferences = {
          ...preferences,
          providers: preferences.providers.map(p =>
            p.provider === provider
              ? {
                  ...p,
                  enabledModels: p.enabledModels.filter(m => m !== modelId),
                }
              : p,
          ),
        }
        set({ preferences: updatedPreferences, isSaving: true, error: null })

        try {
          const response = await fetch("/api/user/model-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPreferences),
          })

          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data = await response.json()
          set({
            preferences: filterDeletedProviders(data),
            lastSynced: new Date(data.lastSynced),
            isSaving: false,
          })
          toast.success("Model removed")
        } catch (error) {
          logException(error, {
            location: "/store/model-preferences",
          })
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            preferences: previousPreferences,
            error: errorMessage,
            isSaving: false,
          })
          toast.error(`Failed to remove model: ${errorMessage}`)
        }
      },

      // Remove an entire provider with optimistic update
      removeProvider: async (provider: LuckyProvider) => {
        const { preferences } = get()

        if (!preferences) {
          toast.error("Preferences not loaded")
          return
        }

        // Check if provider exists
        const providerExists = preferences.providers.some(p => p.provider === provider)
        if (!providerExists) {
          toast.error(`Provider "${provider}" not found`)
          return
        }

        // Optimistic update
        const previousPreferences = preferences
        const updatedPreferences = {
          ...preferences,
          providers: preferences.providers.map(p =>
            p.provider === provider
              ? {
                  ...p,
                  deleted: true,
                  enabledModels: [],
                }
              : p,
          ),
        }
        set({ preferences: updatedPreferences, isSaving: true, error: null })

        try {
          const response = await fetch("/api/user/model-preferences", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedPreferences),
          })

          if (!response.ok) {
            const errorDetails = await extractFetchError(response)
            throw new Error(errorDetails)
          }

          const data = await response.json()
          set({
            preferences: filterDeletedProviders(data),
            lastSynced: new Date(data.lastSynced),
            isSaving: false,
          })
          toast.success("Provider removed")
        } catch (error) {
          logException(error, {
            location: "/store/model-preferences",
          })
          // Rollback on error
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          set({
            preferences: previousPreferences,
            error: errorMessage,
            isSaving: false,
          })
          toast.error(`Failed to remove provider: ${errorMessage}`)
        }
      },

      // Sync from server (refresh)
      syncFromServer: async () => {
        await get().loadPreferences()
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if data is stale (> 5 minutes old)
      isStale: () => {
        const { lastSynced } = get()
        if (!lastSynced) return true

        // Handle both Date objects and serialized strings from localStorage
        const lastSyncedDate = lastSynced instanceof Date ? lastSynced : new Date(lastSynced)
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

        return lastSyncedDate.getTime() < fiveMinutesAgo
      },

      // Get relative time string (e.g., "2m ago", "just now")
      getLastSyncedRelative: () => {
        const { lastSynced } = get()
        if (!lastSynced) return null

        // Handle both Date objects and serialized strings from localStorage
        const lastSyncedDate = lastSynced instanceof Date ? lastSynced : new Date(lastSynced)
        const secondsAgo = Math.floor((Date.now() - lastSyncedDate.getTime()) / 1000)

        if (secondsAgo < 60) return "just now"
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
        return `${Math.floor(secondsAgo / 3600)}h ago`
      },

      // Force refresh by clearing cache and reloading from server
      forceRefresh: async () => {
        // Clear persisted cache and reload
        set({ preferences: null, lastSynced: null })
        await get().loadPreferences()
      },
    }),
    {
      name: "model-preferences-storage",
      partialize: state => ({
        preferences: state.preferences,
        lastSynced: state.lastSynced,
      }),
      onRehydrateStorage: () => state => {
        // Convert serialized date strings back to Date objects after hydration
        if (state?.lastSynced && typeof state.lastSynced === "string") {
          state.lastSynced = new Date(state.lastSynced)
        }
        // Filter out any deleted providers from persisted storage
        if (state?.preferences) {
          state.preferences = filterDeletedProviders(state.preferences)
        }
      },
    },
  ),
)
