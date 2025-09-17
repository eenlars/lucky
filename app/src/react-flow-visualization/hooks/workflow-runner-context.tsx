"use client"

import type { useWorkflowRunner } from "@/react-flow-visualization/hooks/use-workflow-runner"
import { createContext, useContext, useState, type ReactNode } from "react"

// runner removed

type WorkflowRunnerContextValue = ReturnType<typeof useWorkflowRunner>

const WorkflowRunnerContext = createContext<WorkflowRunnerContextValue | null>(
  null
)

export function WorkflowRunnerProvider({ children }: { children: ReactNode }) {
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)

  const value = {
    promptDialogOpen,
    setPromptDialogOpen,
    // Add other required methods as stubs
    logMessages: [],
    runWorkflow: async () => {},
    stopWorkflow: () => {},
    isRunning: false,
    pendingStartNodeId: undefined,
    setPendingStartNodeId: () => {},
    executeWorkflowWithPrompt: async () => {},
    // Real-time workflow information
    currentInvocationId: null,
    setCurrentInvocationId: () => {},
    isStreamConnected: false,
    workflowEvents: [],
    getNodeStatus: () => 'initial' as const,
  }

  return (
    <WorkflowRunnerContext.Provider value={value}>
      {children}
    </WorkflowRunnerContext.Provider>
  )
}

export function useWorkflowRunnerContext() {
  const ctx = useContext(WorkflowRunnerContext)
  if (!ctx) {
    throw new Error(
      "useWorkflowRunnerContext must be used within a WorkflowRunnerProvider"
    )
  }
  return ctx
}
