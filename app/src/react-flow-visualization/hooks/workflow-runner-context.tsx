"use client"

import type { useWorkflowRunner } from "@/react-flow-visualization/hooks/use-workflow-runner"
import { createContext, useContext, type ReactNode } from "react"

// runner removed

type WorkflowRunnerContextValue = ReturnType<typeof useWorkflowRunner>

const WorkflowRunnerContext = createContext<WorkflowRunnerContextValue | null>(
  null
)

export function WorkflowRunnerProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
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
