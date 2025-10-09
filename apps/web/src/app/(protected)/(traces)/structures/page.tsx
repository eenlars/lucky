"use client"

import { Button } from "@/components/ui/button"
import { type WorkflowConfig, toWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { MODELS } from "@lucky/examples/settings/constants.client"
import type { Tables } from "@lucky/shared/client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { StructureMiniMap, getNodeCountFromDsl } from "../trace/[wf_inv_id]/structure/StructureMiniMap"

// Calculate workflow complexity based on structure
function getComplexityScore(config: WorkflowConfig): number {
  const nodeCount = config.nodes.length

  // Count parallel branches (nodes with multiple handoffs)
  const parallelBranches = config.nodes.reduce((sum, node) => {
    return sum + Math.max(0, node.handOffs.length - 1)
  }, 0)

  // Count convergence points (nodes with multiple parents)
  const parentCounts = new Map<string, number>()
  config.nodes.forEach(node => {
    node.handOffs.forEach(target => {
      parentCounts.set(target, (parentCounts.get(target) || 0) + 1)
    })
  })
  const convergencePoints = Array.from(parentCounts.values()).filter(count => count > 1).length

  // Calculate depth (max levels)
  const visited = new Set<string>()
  const getDepth = (nodeId: string, currentDepth = 0): number => {
    if (visited.has(nodeId)) return currentDepth
    visited.add(nodeId)

    const node = config.nodes.find(n => n.nodeId === nodeId)
    if (!node || node.handOffs.length === 0) return currentDepth + 1

    return Math.max(...node.handOffs.map(target => getDepth(target, currentDepth + 1)))
  }

  const depth = getDepth(config.entryNodeId)

  // Complexity score: weighted combination of factors
  return nodeCount + parallelBranches * 2 + convergencePoints * 3 + depth
}

// Test bed workflow configurations with parallel nodes
const testWorkflows: WorkflowConfig[] = [
  {
    nodes: [
      {
        nodeId: "start",
        description: "Start node",
        systemPrompt: "Start",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["parallel1", "parallel2"],
      },
      {
        nodeId: "parallel1",
        description: "Parallel 1",
        systemPrompt: "Parallel 1",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
      {
        nodeId: "parallel2",
        description: "Parallel 2",
        systemPrompt: "Parallel 2",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ],
    entryNodeId: "start",
  },
  {
    nodes: [
      {
        nodeId: "init",
        description: "Init",
        systemPrompt: "Init",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["taskA", "taskB", "taskC"],
      },
      {
        nodeId: "taskA",
        description: "Task A",
        systemPrompt: "Task A",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["merge"],
      },
      {
        nodeId: "taskB",
        description: "Task B",
        systemPrompt: "Task B",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["merge"],
      },
      {
        nodeId: "taskC",
        description: "Task C",
        systemPrompt: "Task C",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["merge"],
      },
      {
        nodeId: "merge",
        description: "Merge",
        systemPrompt: "Merge",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ],
    entryNodeId: "init",
  },
  {
    nodes: [
      {
        nodeId: "root",
        description: "Root",
        systemPrompt: "Root",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["branch1", "branch2"],
      },
      {
        nodeId: "branch1",
        description: "Branch 1",
        systemPrompt: "Branch 1",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["sub1A", "sub1B"],
      },
      {
        nodeId: "branch2",
        description: "Branch 2",
        systemPrompt: "Branch 2",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["sub2A", "sub2B"],
      },
      {
        nodeId: "sub1A",
        description: "Sub 1A",
        systemPrompt: "Sub 1A",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["collect"],
      },
      {
        nodeId: "sub1B",
        description: "Sub 1B",
        systemPrompt: "Sub 1B",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["collect"],
      },
      {
        nodeId: "sub2A",
        description: "Sub 2A",
        systemPrompt: "Sub 2A",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["collect"],
      },
      {
        nodeId: "sub2B",
        description: "Sub 2B",
        systemPrompt: "Sub 2B",
        modelName: MODELS.default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
      },
    ],
    entryNodeId: "root",
  },
]

export default function StructuresPage() {
  const [allVersions, setAllVersions] = useState<Tables<"WorkflowVersion">[]>([])
  const [minNodes, setMinNodes] = useState(2)
  const [loading, setLoading] = useState(true)
  const [showTestBed, setShowTestBed] = useState(false)
  const [sortBy, setSortBy] = useState<"time" | "complexity" | "nodes">("time")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/workflow/versions/latest?limit=200")
        if (!response.ok) {
          throw new Error(`Failed to fetch versions: ${response.statusText}`)
        }
        const versions = await response.json()
        setAllVersions(versions)
      } catch (error) {
        console.error("Error fetching workflow versions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredVersions = allVersions
    .filter(version => {
      const config = toWorkflowConfig(version.dsl)
      if (!config) return false
      const nodeCount = getNodeCountFromDsl(config)
      return nodeCount > minNodes
    })
    .sort((a, b) => {
      const configA = toWorkflowConfig(a.dsl)
      const configB = toWorkflowConfig(b.dsl)

      if (!configA || !configB) return 0

      switch (sortBy) {
        case "complexity":
          return getComplexityScore(configB) - getComplexityScore(configA)
        case "nodes":
          return getNodeCountFromDsl(configB) - getNodeCountFromDsl(configA)
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })
    .slice(0, 50)

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Workflow Structure Visualization</h1>

        <div className="flex items-center gap-4">
          <Button onClick={() => setShowTestBed(!showTestBed)}>
            {showTestBed ? "Show Database" : "Show Test Bed"}
          </Button>

          {!showTestBed && (
            <>
              <label htmlFor="min-nodes" className="text-sm font-medium">
                Min nodes:
              </label>
              <select
                id="min-nodes"
                value={minNodes}
                onChange={e => setMinNodes(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1"
              >
                <option value={2}>2+</option>
                <option value={4}>4+</option>
                <option value={6}>6+</option>
                <option value={8}>8+</option>
              </select>
              <label htmlFor="sort-by" className="text-sm font-medium">
                Sort by:
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as "time" | "complexity" | "nodes")}
                className="border border-gray-300 rounded px-3 py-1"
              >
                <option value="time">Latest</option>
                <option value="complexity">Complexity</option>
                <option value="nodes">Node Count</option>
              </select>
              <span className="text-sm text-gray-500">({filteredVersions.length} workflows)</span>
            </>
          )}
        </div>
      </div>

      {showTestBed ? (
        <div className="space-y-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Test Bed: Parallel Node Configurations</h2>
            <p className="text-blue-700 text-sm">
              Experimenting with simple workflow configurations that demonstrate parallel execution patterns.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {testWorkflows.map((workflow, index) => {
              const nodeCount = getNodeCountFromDsl(workflow)
              const workflowNames = ["Simple Parallel", "Fan-Out/Fan-In", "Nested Parallel"]

              return (
                <div key={index} className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">{workflowNames[index]}</h3>
                    <p className="text-xs text-gray-500">{nodeCount} nodes</p>
                  </div>

                  <StructureMiniMap dsl={workflow} />

                  <div className="mt-4 text-xs text-gray-600">
                    <div className="font-medium mb-1">Node Flow:</div>
                    <div className="space-y-1">
                      {workflow.nodes.map(node => (
                        <div key={node.nodeId} className="flex items-center gap-2">
                          <span className="font-mono bg-gray-100 px-1 rounded">{node.nodeId}</span>
                          {node.handOffs.length > 0 && (
                            <>
                              <span>→</span>
                              <span className="text-gray-500">{node.handOffs.join(", ")}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filteredVersions.map((version: Tables<"WorkflowVersion">) => {
            const config = toWorkflowConfig(version.dsl)
            if (!config) return null
            const nodeCount = getNodeCountFromDsl(config)
            const complexityScore = getComplexityScore(config)

            return (
              <div
                key={version.wf_version_id}
                className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2 truncate">{version.commit_message}</h3>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>
                      {nodeCount} nodes • complexity {complexityScore}
                    </p>
                    <p>{new Date(version.created_at).toLocaleDateString()}</p>
                  </div>
                  <Link
                    href={`/edit/${version.wf_version_id}`}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Edit/Inspect
                  </Link>
                </div>

                <StructureMiniMap dsl={config} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
