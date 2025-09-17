"use client"

import { useEffect } from "react"
import { useWorkflowStore } from "@/stores/workflow-store"

/**
 * Simple hook to manage workflows
 * Provides everything needed to work with workflows in the UI
 */
export function useWorkflows() {
  const store = useWorkflowStore()

  // Load workflows on mount
  useEffect(() => {
    store.loadWorkflows()
  }, []) // Empty dependency array - only run once on mount

  return {
    // Data
    workflows: store.workflows,
    currentWorkflow: store.currentWorkflow,

    // States
    loading: store.loading,
    saving: store.saving,
    error: store.error,

    // Actions
    refresh: store.loadWorkflows,
    loadWorkflow: store.loadWorkflow,
    createWorkflow: store.create,
    saveVersion: store.saveVersion,
    updateDescription: store.updateDescription,
    deleteWorkflow: store.remove,
    clearError: store.clearError,
  }
}
