"use client"

import { useCallback, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { AppEdge } from "@/react-flow-visualization/components/edges"
import { AppNode } from "@/react-flow-visualization/components/nodes"
import { useAppStore } from "@/react-flow-visualization/store"
/**
 * This is a demo workflow runner that runs a simplified version of a workflow.
 * You can customize how nodes are processed by overriding `processNode` or
 * even replacing the entire `collectNodesToProcess` function with your own logic.
 */
export function useWorkflowRunner() {
  const [logMessages, setLogMessages] = useState<string[]>([])
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [pendingStartNodeId, setPendingStartNodeId] = useState<
    string | undefined
  >()
  const isRunning = useRef(false)
  const { getNodes, setNodes, getEdges, exportToJSON, currentWorkflowId } =
    useAppStore(
      useShallow((s) => ({
        getNodes: s.getNodes,
        setNodes: s.setNodes,
        getEdges: s.getEdges,
        exportToJSON: s.exportToJSON,
        currentWorkflowId: s.currentWorkflowId,
      }))
    )

  const stopWorkflow = useCallback(() => {
    isRunning.current = false
    setLogMessages((prev) => [...prev, "Workflow stopped."])
  }, [])

  const resetNodeStatus = useCallback(() => {
    setNodes(
      getNodes().map((node: AppNode) => ({
        ...node,
        data: { ...node.data, status: "initial" },
      }))
    )
  }, [getNodes, setNodes])

  const updateNodeStatus = useCallback(
    (nodeId: string, status: string) => {
      setNodes(
        getNodes().map((node: AppNode) =>
          node.id === nodeId
            ? ({ ...node, data: { ...node.data, status } } as AppNode)
            : node
        )
      )
    },
    [setNodes, getNodes]
  )

  const processNode = useCallback(
    async (node: AppNode) => {
      updateNodeStatus(node.id, "loading")
      setLogMessages((prev) => [...prev, `${node.data.nodeId} processing...`])

      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (!isRunning.current) {
        resetNodeStatus()
        return
      }

      updateNodeStatus(node.id, "success")
    },
    [updateNodeStatus, resetNodeStatus]
  )

  const executeWorkflowWithPrompt = useCallback(
    async (prompt: string) => {
      console.log("executeWorkflowWithPrompt called with prompt:", prompt)
      if (isRunning.current) return
      isRunning.current = true

      try {
        setLogMessages(["Starting workflow execution..."])
        console.log("Set initial log message")

        const workflowJSON = exportToJSON()
        const dslConfig = JSON.parse(workflowJSON)
        const workflowId = currentWorkflowId || "temp-workflow"

        console.log("Workflow data:", { dslConfig, workflowId, prompt })
        // Directly invoke the workflow with prompt-only input (no evaluation/polling)
        const response = await fetch("/api/workflow/invoke", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dslConfig,
            evalInput: {
              type: "prompt-only",
              goal: prompt,
              // workflowId is optional; server will default if omitted
            },
          }),
        })

        console.log("API response status:", response.status)
        const result = await response.json()
        console.log("API result:", result)

        if (result.success) {
          const outputs: string[] = Array.isArray(result.data)
            ? result.data
                .map((r: any, idx: number) => {
                  const out = r?.queueRunResult?.finalWorkflowOutput
                  return out ? `Output #${idx + 1}: ${out}` : undefined
                })
                .filter(Boolean)
            : []

          const costMsg =
            typeof result.usdCost === "number"
              ? `Total cost: $${result.usdCost.toFixed(4)}`
              : undefined

          setLogMessages((prev) => [
            ...prev,
            "Workflow executed successfully.",
            ...(costMsg ? [costMsg] : []),
            ...(outputs.length > 0
              ? outputs
              : ["No final output returned from workflow."]),
          ])
        } else {
          setLogMessages((prev) => [
            ...prev,
            `Error: ${result.error ?? "Unknown error"}`,
          ])
        }
      } catch (error) {
        console.error("Error in executeWorkflowWithPrompt:", error)
        setLogMessages((prev) => [
          ...prev,
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ])
      } finally {
        isRunning.current = false
        setPendingStartNodeId(undefined)
      }
    },
    [exportToJSON, currentWorkflowId]
  )

  const runWorkflow = useCallback(
    async (startNodeId?: string) => {
      if (isRunning.current) return
      const nodes = getNodes()
      const edges = getEdges()
      isRunning.current = true

      // For now, just show the prompt dialog instead of running the demo
      setPendingStartNodeId(startNodeId)
      setPromptDialogOpen(true)
      isRunning.current = false // Reset since we're not actually running yet
    },
    [getNodes, getEdges]
  )

  return {
    logMessages,
    runWorkflow,
    stopWorkflow,
    isRunning: isRunning.current,
    promptDialogOpen,
    setPromptDialogOpen,
    executeWorkflowWithPrompt,
  }
}

/**
 * This is a very simplified example of how you might traverse a graph and collect nodes to process.
 * It's not meant to be used in production, but you can use it as a starting point for your own logic.
 */
function collectNodesToProcess(
  nodes: AppNode[],
  edges: AppEdge[],
  startNodeId: string
) {
  const nodesToProcess: AppNode[] = []
  const visited = new Set()

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    nodesToProcess.push(node)

    const outgoingEdges = edges.filter((e) => e.source === nodeId)
    for (const edge of outgoingEdges) {
      visit(edge.target)
    }
  }

  visit(startNodeId)

  return nodesToProcess
}
