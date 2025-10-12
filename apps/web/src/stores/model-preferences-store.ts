/**
 * Model Preferences Zustand Store
 * Centralized state management for user model preferences with optimistic updates
 */

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
          console.log("[model-preferences-store] Loading preferences from server...")
          const response = await fetch("/api/user/model-preferences")

          if (!response.ok) {
            throw new Error("Failed to load model preferences")
          }

          const data = await response.json()
          console.log("[model-preferences-store] Loaded preferences:", data)

          set({
            preferences: data,
            lastSynced: new Date(data.lastSynced),
            isLoading: false,
          })
        } catch (error) {
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
        console.log(`[Zustand] getEnabledModels called for provider: ${provider}`)
        console.log("[Zustand] Current preferences:", preferences)
        const result = getEnabledModelsForProvider(preferences, provider)
        console.log(`[Zustand] Returning enabled models for ${provider}:`, result)
        return result
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

        // Validate model exists in catalog
        const catalogEntry = MODEL_CATALOG.find(m => m.id === modelId)
        if (!catalogEntry) {
          toast.error(`Model ${modelId} not found in catalog`)
          return
        }

        // Verify the actual provider matches (don't parse "/" from ID!)
        if (catalogEntry.provider !== provider) {
          toast.error(
            `Model ${modelId} uses ${catalogEntry.provider} API, not ${provider}. Use ${catalogEntry.provider} settings.`,
          )
          return
        }

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

        // Validate all models exist in catalog and use correct provider
        for (const modelId of modelIds) {
          const catalogEntry = MODEL_CATALOG.find(m => m.id === modelId)
          if (!catalogEntry) {
            toast.error(`Model ${modelId} not found in catalog`)
            return
          }
          if (catalogEntry.provider !== provider) {
            toast.error(`Model ${modelId} uses ${catalogEntry.provider}, not ${provider}`)
            return
          }
        }

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
    }),
    {
      name: "model-preferences-storage",
      partialize: state => ({
        preferences: state.preferences,
        lastSynced: state.lastSynced,
      }),
    },
  ),
)
