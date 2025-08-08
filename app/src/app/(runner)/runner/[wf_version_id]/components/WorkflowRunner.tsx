"use client"

import type { Tables } from "@core/utils/clients/supabase/types"
import { loadFromDSLClient } from "@core/workflow/setup/WorkflowLoader.client"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import RunnerPanel from "./RunnerPanel"

// API functions to replace server actions
async function startWorkflowExecution(
  dslConfig: any,
  workflowId: string,
  prompt: string
) {
  const response = await fetch("/api/workflow/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dslConfig,
      workflowId,
      prompt,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

async function getWorkflowExecutionStatus(invocationId: string) {
  const response = await fetch(
    `/api/workflow/execute?invocationId=${invocationId}`
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

interface WorkflowRunnerProps {
  workflowVersion: Tables<"WorkflowVersion">
}

export default function WorkflowRunner({
  workflowVersion,
}: WorkflowRunnerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [executionResults, setExecutionResults] = useState<any>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState("")
  const [currentInvocationId, setCurrentInvocationId] = useState<string | null>(
    null
  )

  // Storage key for this workflow version
  const storageKey = `workflow-execution-${workflowVersion.wf_version_id}`

  // Poll for execution results
  const pollForResults = useCallback(
    async (invocationId: string) => {
      try {
        const statusResult = await getWorkflowExecutionStatus(invocationId)

        if (statusResult.success && statusResult.execution) {
          const { status, result, error } = statusResult.execution

          if (status === "completed") {
            setIsRunning(false)
            setExecutionResults({
              success: true,
              data: result?.data,
              usdCost: result?.usdCost,
              fitness: result?.data?.[0]?.fitness,
              message: "Workflow executed successfully",
            })
            localStorage.removeItem(storageKey)
          } else if (status === "failed") {
            setIsRunning(false)
            setRunError(error || "Workflow execution failed")
            localStorage.removeItem(storageKey)
          } else {
            // Still running, poll again in 2 seconds
            setTimeout(() => pollForResults(invocationId), 2000)
          }
        } else {
          // Execution not found or error
          setIsRunning(false)
          setRunError("Execution not found or error occurred")
          localStorage.removeItem(storageKey)
        }
      } catch (error) {
        console.error("Failed to poll for results:", error)
        setIsRunning(false)
        setRunError("Failed to check execution status")
        localStorage.removeItem(storageKey)
      }
    },
    [storageKey]
  )

  // Load previous execution state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey)
    if (savedState) {
      try {
        const {
          invocationId,
          prompt: savedPrompt,
          timestamp,
        } = JSON.parse(savedState)
        const timeDiff = Date.now() - timestamp

        // Only restore if execution started within the last 24 hours
        if (timeDiff < 24 * 60 * 60 * 1000) {
          setCurrentInvocationId(invocationId)
          setPrompt(savedPrompt)
          setIsRunning(true)

          // Start polling for results
          pollForResults(invocationId)
        } else {
          // Clear old execution state
          localStorage.removeItem(storageKey)
        }
      } catch (error) {
        console.error("Failed to restore execution state:", error)
        localStorage.removeItem(storageKey)
      }
    }
  }, [workflowVersion.wf_version_id, pollForResults, storageKey])

  const handleRun = useCallback(async () => {
    if (!prompt.trim()) {
      setRunError("Please enter a prompt")
      return
    }

    setIsRunning(true)
    setRunError(null)
    setExecutionResults(null)

    try {
      // Validate and normalize the DSL before execution
      const validatedConfig = await loadFromDSLClient(workflowVersion.dsl as any)

      // Start workflow execution and get invocation ID immediately
      const startResult = await startWorkflowExecution(
        validatedConfig,
        workflowVersion.workflow_id,
        prompt.trim()
      )

      if (startResult.success) {
        const invocationId = startResult.invocationId
        setCurrentInvocationId(invocationId)

        // Save execution state to localStorage
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            invocationId,
            prompt: prompt.trim(),
            timestamp: Date.now(),
          })
        )

        // Start polling for results
        pollForResults(invocationId)
      } else {
        setRunError(startResult.error || "Failed to start workflow execution")
        setIsRunning(false)
      }
    } catch (error) {
      console.error("Failed to start workflow:", error)
      setRunError(
        error instanceof Error ? error.message : "Failed to start workflow"
      )
      setIsRunning(false)
    }
  }, [
    workflowVersion.dsl,
    workflowVersion.workflow_id,
    prompt,
    storageKey,
    pollForResults,
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/runner" className="hover:text-gray-700">
                Runner
              </Link>
              <span>→</span>
              <span className="text-gray-900">
                {workflowVersion.wf_version_id}
              </span>
            </nav>
            <h1 className="text-xl font-semibold text-gray-900">
              {workflowVersion.commit_message || "Untitled Workflow"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Version: {workflowVersion.wf_version_id}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href={`/edit/${workflowVersion.wf_version_id}`}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit Workflow
            </Link>

            <button
              onClick={handleRun}
              disabled={isRunning || !prompt.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Running...
                </>
              ) : (
                <>
                  <span>▶️</span>
                  Run Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <label
            htmlFor="prompt"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <RunnerPanel
          results={executionResults}
          error={runError}
          isRunning={isRunning}
          workflowVersion={workflowVersion}
          invocationId={currentInvocationId}
        />
      </div>
    </div>
  )
}
