import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  saveWorkflowVersion,
  deleteWorkflow,
  updateWorkflowDescription,
  type WorkflowWithVersions,
} from "@/lib/workflows"

interface WorkflowStore {
  // Data
  workflows: WorkflowWithVersions[]
  currentWorkflow: WorkflowWithVersions | null

  // Loading states
  loading: boolean
  saving: boolean
  error: string | null

  // Actions
  loadWorkflows: () => Promise<void>
  loadWorkflow: (id: string) => Promise<void>
  create: (
    description: string,
    dsl: WorkflowConfig,
    commitMessage: string,
  ) => Promise<{ success: boolean; workflowId?: string }>
  saveVersion: (
    workflowId: string,
    dsl: WorkflowConfig,
    commitMessage: string,
    parentVersionId?: string,
  ) => Promise<{ success: boolean; versionId?: string }>
  updateDescription: (workflowId: string, description: string) => Promise<boolean>
  remove: (workflowId: string) => Promise<boolean>
  clearError: () => void
  reset: () => void
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      currentWorkflow: null,
      loading: false,
      saving: false,
      error: null,

      loadWorkflows: async () => {
        set({ loading: true, error: null })
        try {
          const workflows = await listWorkflows()
          set({ workflows, loading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load workflows",
            loading: false,
          })
        }
      },

      loadWorkflow: async (id: string) => {
        set({ loading: true, error: null })
        try {
          const workflow = await getWorkflow(id)
          set({ currentWorkflow: workflow, loading: false })

          // Also update in the list if present
          if (workflow) {
            set(state => ({
              workflows: state.workflows.map(w => (w.wf_id === id ? workflow : w)),
            }))
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load workflow",
            loading: false,
          })
        }
      },

      create: async (description: string, dsl: WorkflowConfig, commitMessage: string) => {
        set({ saving: true, error: null })
        try {
          const { workflowId } = await createWorkflow(description, dsl, commitMessage)

          // Reload workflows to get the new one
          await get().loadWorkflows()

          set({ saving: false })
          return { success: true, workflowId }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to create workflow",
            saving: false,
          })
          return { success: false }
        }
      },

      saveVersion: async (workflowId: string, dsl: WorkflowConfig, commitMessage: string, parentVersionId?: string) => {
        set({ saving: true, error: null })
        try {
          const versionId = await saveWorkflowVersion(workflowId, dsl, commitMessage, parentVersionId)

          // Reload the specific workflow to get updated versions
          await get().loadWorkflow(workflowId)

          set({ saving: false })
          return { success: true, versionId }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to save version",
            saving: false,
          })
          return { success: false }
        }
      },

      updateDescription: async (workflowId: string, description: string) => {
        set({ saving: true, error: null })
        try {
          const success = await updateWorkflowDescription(workflowId, description)

          if (success) {
            // Update locally
            set(state => ({
              workflows: state.workflows.map(w =>
                w.wf_id === workflowId ? { ...w, description, updated_at: new Date().toISOString() } : w,
              ),
              currentWorkflow:
                state.currentWorkflow?.wf_id === workflowId
                  ? {
                      ...state.currentWorkflow,
                      description,
                      updated_at: new Date().toISOString(),
                    }
                  : state.currentWorkflow,
              saving: false,
            }))
          } else {
            set({ error: "Failed to update description", saving: false })
          }

          return success
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to update workflow",
            saving: false,
          })
          return false
        }
      },

      remove: async (workflowId: string) => {
        set({ saving: true, error: null })
        try {
          const success = await deleteWorkflow(workflowId)

          if (success) {
            // Remove from local state
            set(state => ({
              workflows: state.workflows.filter(w => w.wf_id !== workflowId),
              currentWorkflow: state.currentWorkflow?.wf_id === workflowId ? null : state.currentWorkflow,
              saving: false,
            }))
          } else {
            set({ error: "Failed to delete workflow", saving: false })
          }

          return success
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to delete workflow",
            saving: false,
          })
          return false
        }
      },

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          workflows: [],
          currentWorkflow: null,
          loading: false,
          saving: false,
          error: null,
        }),
    }),
    {
      name: "workflow-store",
      partialize: () => ({
        // Don't persist server data, only UI state if needed
      }),
    },
  ),
)
