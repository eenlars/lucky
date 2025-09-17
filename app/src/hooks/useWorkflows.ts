"use client"

import { useEffect } from "react"
import { useWorkflowStore } from "@/stores/workflow-store"

/**
 * Hook to manage workflows with optimized selector pattern
 * Uses selectors to prevent unnecessary re-renders
 */
export function useWorkflows() {
  // Select all needed state and actions in one selector for better performance
  const store = useWorkflowStore()
  
  // Use individual destructuring for better type safety with persist middleware
  const {
    workflows,
    currentWorkflow,
    loading,
    saving,
    error,
    loadWorkflows,
    loadWorkflow,
    create: createWorkflow,
    saveVersion,
    updateDescription,
    remove: deleteWorkflow,
    clearError,
  } = store

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  return {
    // Data
    workflows,
    currentWorkflow,

    // States
    loading,
    saving,
    error,

    // Actions
    refresh: loadWorkflows,
    loadWorkflow,
    createWorkflow,
    saveVersion,
    updateDescription,
    deleteWorkflow,
    clearError,
  }
}
