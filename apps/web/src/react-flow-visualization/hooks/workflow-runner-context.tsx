"use client"

import type { useWorkflowRunner } from "@/react-flow-visualization/hooks/use-workflow-runner"
import { type ReactNode, createContext, useContext, useState } from "react"

// runner removed

type WorkflowRunnerContextValue = ReturnType<typeof useWorkflowRunner>

const WorkflowRunnerContext = createContext<WorkflowRunnerContextValue | null>(null)

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
  }

  return <WorkflowRunnerContext.Provider value={value}>{children}</WorkflowRunnerContext.Provider>
}

export function useWorkflowRunnerContext() {
  const ctx = useContext(WorkflowRunnerContext)
  if (!ctx) {
    throw new Error("useWorkflowRunnerContext must be used within a WorkflowRunnerProvider")
  }
  return ctx
}
