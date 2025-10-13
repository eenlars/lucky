/**
 * Model Preferences Zustand Store
 * Centralized state management for user model preferences with optimistic updates
 */

import { logException } from "@/lib/error-logger"
import { MODEL_CATALOG } from "@lucky/models"
import type { ModelId, UserModelPreferences } from "@lucky/shared"
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
  getEnabledModels: (provider: string) => ModelId[]
  isEnabled: (modelId: ModelId) => boolean
  toggleModel: (provider: string, modelId: ModelId) => Promise<void>
  setProviderModels: (provider: string, modelIds: ModelId[]) => Promise<void>
  syncFromServer: () => Promise<void>
  clearError: () => void

  // Sync status helpers
  isStale: () => boolean
  getLastSyncedRelative: () => string | null
  forceRefresh: () => Promise<void>
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
            throw new Error("Failed to load model preferences")
          }

          const data = await response.json()

          set({
            preferences: data,
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
      getEnabledModels: (provider: string) => {
        const { preferences } = get()
        return getEnabledModelsForProvider(preferences, provider)
      },

      // Check if a model is enabled (from local state)
      isEnabled: (modelId: ModelId) => {
        const { preferences } = get()
        return isModelEnabled(preferences, modelId)
      },

      // Toggle a single model on/off with optimistic update
      toggleModel: async (provider: string, modelId: ModelId) => {
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
            throw new Error("Failed to save preferences")
          }

          const data = await response.json()
          set({
            preferences: data,
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
      setProviderModels: async (provider: string, modelIds: ModelId[]) => {
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
            throw new Error("Failed to save preferences")
          }

          const data = await response.json()
          set({
            preferences: data,
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
      },
    },
  ),
)
