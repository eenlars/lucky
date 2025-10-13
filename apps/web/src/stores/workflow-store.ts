"use client"

import { logException } from "@/lib/error-logger"
import { type WorkflowWithVersions, listWorkflows } from "@/lib/workflows"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

/**
 * Workflow Store - Optimistic loading with cache
 *
 * This store manages both UI state and optimistic data loading:
 * - Loads workflows from cache first for instant UI
 * - Fetches fresh data in the background
 * - Caches workflows for faster subsequent loads
 */

// Track ongoing request to prevent race conditions
let currentRequest: Promise<void> | null = null

interface WorkflowStore {
  // Data state
  workflows: WorkflowWithVersions[]
  cachedWorkflowsById: Record<string, WorkflowWithVersions>
  loading: boolean
  error: string | null

  // UI State - use arrays instead of Sets for persistence
  selectedWorkflowId: string | null
  expandedSections: string[]
  viewMode: "list" | "grid"
  deletingWorkflowIds: string[]

  // Data actions
  loadWorkflows: (opts?: { showLoading?: boolean }) => Promise<void>
  addWorkflow: (workflow: WorkflowWithVersions) => void
  updateWorkflow: (workflowId: string, updates: Partial<WorkflowWithVersions>) => void
  removeWorkflow: (workflowId: string) => void

  // UI actions
  setSelectedWorkflowId: (id: string | null) => void
  toggleSection: (sectionId: string) => void
  setViewMode: (mode: "list" | "grid") => void
  addDeletingWorkflow: (id: string) => void
  removeDeletingWorkflow: (id: string) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      // Initial data state
      workflows: [],
      cachedWorkflowsById: {},
      loading: false,
      error: null,

      // Initial UI state
      selectedWorkflowId: null,
      expandedSections: [],
      viewMode: "list",
      deletingWorkflowIds: [],

      // Data actions
      loadWorkflows: async (opts = {}) => {
        const { showLoading = true } = opts

        // Return existing request if already loading (prevents race conditions)
        if (currentRequest) {
          return currentRequest
        }

        if (showLoading) set({ loading: true })
        set({ error: null })

        currentRequest = (async () => {
          try {
            // Load from cache first for instant UI
            const { cachedWorkflowsById } = get()
            const cachedList = Object.values(cachedWorkflowsById)
            if (cachedList.length > 0) {
              set({ workflows: cachedList })
            }

            // Fetch fresh data using client-side listWorkflows
            const data = await listWorkflows()

            // Update cache with fresh data
            const cacheMap: Record<string, WorkflowWithVersions> = {}
            for (const workflow of data) {
              cacheMap[workflow.wf_id] = workflow
            }

            set({
              workflows: data,
              cachedWorkflowsById: cacheMap,
            })
          } catch (err) {
            logException(err, {
              location: "/store/workflow",
            })
            const errorMessage = err instanceof Error ? err.message : "Failed to load workflows"
            set({ error: errorMessage })
            console.error("Error loading workflows:", err)
          } finally {
            currentRequest = null
            if (showLoading) set({ loading: false })
          }
        })()

        return currentRequest
      },

      addWorkflow: (workflow: WorkflowWithVersions) => {
        set(state => ({
          workflows: [workflow, ...state.workflows],
          cachedWorkflowsById: {
            ...state.cachedWorkflowsById,
            [workflow.wf_id]: workflow,
          },
        }))
      },

      updateWorkflow: (workflowId: string, updates: Partial<WorkflowWithVersions>) => {
        set(state => {
          const updatedWorkflows = state.workflows.map(w => (w.wf_id === workflowId ? { ...w, ...updates } : w))

          const updatedCache = { ...state.cachedWorkflowsById }
          if (updatedCache[workflowId]) {
            updatedCache[workflowId] = { ...updatedCache[workflowId], ...updates }
          }

          return {
            workflows: updatedWorkflows,
            cachedWorkflowsById: updatedCache,
          }
        })
      },

      removeWorkflow: (workflowId: string) => {
        set(state => {
          const filteredWorkflows = state.workflows.filter(w => w.wf_id !== workflowId)
          const updatedCache = { ...state.cachedWorkflowsById }
          delete updatedCache[workflowId]

          return {
            workflows: filteredWorkflows,
            cachedWorkflowsById: updatedCache,
          }
        })
      },

      // UI actions
      setSelectedWorkflowId: (id: string | null) => set({ selectedWorkflowId: id }),

      toggleSection: (sectionId: string) =>
        set(state => {
          const expanded = state.expandedSections
          if (expanded.includes(sectionId)) {
            return { expandedSections: expanded.filter(id => id !== sectionId) }
          }
          return { expandedSections: [...expanded, sectionId] }
        }),

      setViewMode: (mode: "list" | "grid") => set({ viewMode: mode }),

      addDeletingWorkflow: (id: string) =>
        set(state => ({
          deletingWorkflowIds: state.deletingWorkflowIds.includes(id)
            ? state.deletingWorkflowIds
            : [...state.deletingWorkflowIds, id],
        })),

      removeDeletingWorkflow: (id: string) =>
        set(state => ({
          deletingWorkflowIds: state.deletingWorkflowIds.filter(wid => wid !== id),
        })),

      reset: () =>
        set({
          selectedWorkflowId: null,
          expandedSections: [],
          viewMode: "list",
          deletingWorkflowIds: [],
        }),
    }),
    {
      name: "workflow-store/v1",
      storage: createJSONStorage(() => {
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }

        return {
          getItem: key => {
            try {
              return localStorage.getItem(key)
            } catch (error) {
              logException(error, {
                location: "/store/workflow",
              })
              console.error("Failed to read from localStorage:", error)
              return null
            }
          },
          setItem: (key, value) => {
            try {
              localStorage.setItem(key, value)
            } catch (error) {
              logException(error, {
                location: "/store/workflow",
              })
              console.error("Failed to write to localStorage:", error)
              // Clear storage if quota exceeded
              if (error instanceof Error && error.name === "QuotaExceededError") {
                try {
                  localStorage.removeItem(key)
                } catch {
                  // Ignore cleanup errors
                }
              }
            }
          },
          removeItem: key => {
            try {
              localStorage.removeItem(key)
            } catch (error) {
              logException(error, {
                location: "/store/workflow",
              })
              console.error("Failed to remove from localStorage:", error)
            }
          },
        }
      }),
      partialize: state => ({
        // Persist cached workflows and UI preferences
        cachedWorkflowsById: state.cachedWorkflowsById,
        viewMode: state.viewMode,
        selectedWorkflowId: state.selectedWorkflowId,
      }),
    },
  ),
)
