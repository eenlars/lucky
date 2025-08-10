"use client"

import { createContext, useContext, type ReactNode } from "react"

import { useWorkflowRunner } from "@/react-flow-visualization/hooks/use-workflow-runner"

type WorkflowRunnerContextValue = ReturnType<typeof useWorkflowRunner>

const WorkflowRunnerContext = createContext<WorkflowRunnerContextValue | null>(
  null
)

export function WorkflowRunnerProvider({ children }: { children: ReactNode }) {
  const runner = useWorkflowRunner()
  return (
    <WorkflowRunnerContext.Provider value={runner}>
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
