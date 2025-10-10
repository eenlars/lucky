import { create } from "zustand"
import { persist } from "zustand/middleware"

/**
 * Workflow Store - UI State Only
 *
 * This store now only manages UI-related state for the workflow interface.
 * All data fetching, caching, and mutations are handled by TanStack Query hooks:
 * - useWorkflowsQuery() for listing workflows
 * - useWorkflowQuery(id) for single workflow
 * - useWorkflowVersionQuery(versionId) for version details
 * - useCreateWorkflow(), useSaveWorkflowVersion(), etc. for mutations
 */
interface WorkflowStore {
  // UI State only - no server data
  selectedWorkflowId: string | null
  expandedSections: Set<string>
  viewMode: "list" | "grid"
  deletingWorkflowIds: Set<string>

  // Actions for UI state
  setSelectedWorkflowId: (id: string | null) => void
  toggleSection: (sectionId: string) => void
  setViewMode: (mode: "list" | "grid") => void
  addDeletingWorkflow: (id: string) => void
  removeDeletingWorkflow: (id: string) => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    set => ({
      // Initial UI state
      selectedWorkflowId: null,
      expandedSections: new Set(),
      viewMode: "list",
      deletingWorkflowIds: new Set(),

      // UI actions
      setSelectedWorkflowId: (id: string | null) => set({ selectedWorkflowId: id }),

      toggleSection: (sectionId: string) =>
        set(state => {
          const newExpanded = new Set(state.expandedSections)
          if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId)
          } else {
            newExpanded.add(sectionId)
          }
          return { expandedSections: newExpanded }
        }),

      setViewMode: (mode: "list" | "grid") => set({ viewMode: mode }),

      addDeletingWorkflow: (id: string) =>
        set(state => ({
          deletingWorkflowIds: new Set(state.deletingWorkflowIds).add(id),
        })),

      removeDeletingWorkflow: (id: string) =>
        set(state => {
          const newSet = new Set(state.deletingWorkflowIds)
          newSet.delete(id)
          return { deletingWorkflowIds: newSet }
        }),

      reset: () =>
        set({
          selectedWorkflowId: null,
          expandedSections: new Set(),
          viewMode: "list",
          deletingWorkflowIds: new Set(),
        }),
    }),
    {
      name: "workflow-store",
      partialize: state => ({
        // Persist UI preferences
        viewMode: state.viewMode,
        selectedWorkflowId: state.selectedWorkflowId,
      }),
    },
  ),
)
