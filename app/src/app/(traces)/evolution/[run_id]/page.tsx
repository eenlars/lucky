"use client"

import { StructureMiniMap } from "@/app/(traces)/trace/[wf_inv_id]/structure/StructureMiniMap"
import { EvolutionGraph } from "@/app/components/EvolutionGraph"
import {
  cleanupStaleEvolutionRuns,
  retrieveAllInvocationsForRunGroupedByGeneration,
  retrieveEvolutionRun,
  type GenerationWithData,
  type WorkflowInvocationSubset,
} from "@/trace-visualization/db/Evolution/retrieveEvolution"
import { retrieveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import type { Database } from "@lucky/shared"
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { isWorkflowConfig } from "@core/workflow/schema/workflow.types"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import Link from "next/link"
import { use, useCallback, useEffect, useState } from "react"

dayjs.extend(relativeTime)

const getTimeDifference = (timestamp: string) => {
  const startTime = new Date(timestamp).getTime()
  const currentTime = new Date().getTime()
  const diffMs = currentTime - startTime

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ago`
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`
  return `${seconds}s ago`
}

const isStaleRun = (run: Tables<"EvolutionRun">) => {
  if (run.status !== "running") return false

  const startTime = new Date(run.start_time).getTime()
  const currentTime = new Date().getTime()
  const elapsedHours = (currentTime - startTime) / (1000 * 60 * 60)

  // Consider stale if running for more than 5 hours (1 hour past the 24h limit)
  return elapsedHours > 5
}

const getFitnessRange = (invocations: WorkflowInvocationSubset[]) => {
  const fitnessScores = invocations
    .filter(
      (inv) => inv.fitness_score !== null && inv.fitness_score !== undefined
    )
    .map((inv) => inv.fitness_score!)

  if (fitnessScores.length === 0) return null

  return {
    min: Math.min(...fitnessScores),
    max: Math.max(...fitnessScores),
    count: fitnessScores.length,
  }
}

export default function EvolutionRunPage({
  params,
}: {
  params: Promise<{ run_id: string }>
}) {
  const [evolutionRun, setEvolutionRun] =
    useState<Tables<"EvolutionRun"> | null>(null)
  const [generationsData, setGenerationsData] = useState<GenerationWithData[]>(
    []
  )
  const [loading, setLoading] = useState(false)
  const [generationsLoading, setGenerationsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGenerations, setExpandedGenerations] = useState<Set<string>>(
    new Set()
  )
  const [_lastFetchTime, setLastFetchTime] = useState<number>(0)
  const [showGraph, setShowGraph] = useState<boolean>(true)

  // DSL modal state
  const [dslModalOpen, setDslModalOpen] = useState(false)
  const [currentDsl, setCurrentDsl] = useState<WorkflowConfig | null>(null)
  const [dslLoading, setDslLoading] = useState(false)

  // Workflow versions cache
  const [workflowVersions, setWorkflowVersions] = useState<
    Map<string, Tables<"WorkflowVersion">>
  >(new Map())

  const { run_id } = use(params)

  const fetchEvolutionRun = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await cleanupStaleEvolutionRuns()
      const runData = await retrieveEvolutionRun(run_id)
      setEvolutionRun(runData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch evolution run"
      )
      console.error("Error fetching evolution run:", err)
    } finally {
      setLoading(false)
    }
  }, [run_id])

  const fetchGenerationsData = useCallback(async () => {
    setGenerationsLoading(true)
    try {
      const generationsWithInvocations =
        await retrieveAllInvocationsForRunGroupedByGeneration(run_id)
      setGenerationsData(generationsWithInvocations)
      setLastFetchTime(Date.now())
    } catch (err) {
      console.error("Error fetching generations data:", err)
    } finally {
      setGenerationsLoading(false)
    }
  }, [run_id])

  const toggleGeneration = (generation: string) => {
    const newExpanded = new Set(expandedGenerations)
    if (newExpanded.has(generation)) {
      newExpanded.delete(generation)
    } else {
      newExpanded.add(generation)
    }
    setExpandedGenerations(newExpanded)
  }

  const fetchWorkflowVersion = async (versionId: string) => {
    if (workflowVersions.has(versionId)) {
      return workflowVersions.get(versionId)!
    }

    try {
      const version = await retrieveWorkflowVersion(versionId)
      setWorkflowVersions((prev) => new Map(prev).set(versionId, version))
      return version
    } catch (err) {
      console.error("Error fetching workflow version:", err)
      throw err
    }
  }

  const showDslModal = async (versionId: string) => {
    setDslLoading(true)
    try {
      const version = await fetchWorkflowVersion(versionId)
      if (isWorkflowConfig(version.dsl)) {
        setCurrentDsl(version.dsl)
        setDslModalOpen(true)
      }
    } catch (err) {
      console.error("Failed to load DSL:", err)
    } finally {
      setDslLoading(false)
    }
  }

  useEffect(() => {
    fetchEvolutionRun()
  }, [run_id])

  useEffect(() => {
    if (evolutionRun) {
      fetchGenerationsData()
    }
  }, [evolutionRun, fetchGenerationsData])

  // Auto-refresh if evolution run is still running
  useEffect(() => {
    if (!evolutionRun || evolutionRun.status !== "running") return

    const interval = setInterval(() => {
      fetchGenerationsData() // Refresh every 30 seconds
    }, 30000)

    return () => clearInterval(interval)
  }, [evolutionRun, fetchGenerationsData])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading evolution run...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>
        <button
          onClick={() => {
            fetchEvolutionRun()
            fetchGenerationsData()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!evolutionRun) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Evolution run not found
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/evolution"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Back to Evolution Runs
          </Link>
          <Link
            href={`/api/evolution/${run_id}`}
            target="_blank"
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm"
          >
            📊 Raw Data
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {evolutionRun.run_id}
        </h1>
      </div>

      {/* Run Details */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Run Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Goal:
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {evolutionRun.goal_text}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Status:
            </div>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                evolutionRun.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : evolutionRun.status === "running"
                    ? isStaleRun(evolutionRun)
                      ? "bg-orange-100 text-orange-800"
                      : "bg-blue-100 text-blue-800"
                    : evolutionRun.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : evolutionRun.status === "interrupted"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
              }`}
            >
              {evolutionRun.status === "running" && isStaleRun(evolutionRun)
                ? "stale"
                : evolutionRun.status}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Started:
            </div>
            <div className="text-gray-900 dark:text-gray-100">
              {new Date(evolutionRun.start_time).toLocaleString()}
            </div>
          </div>
          {evolutionRun.end_time && (
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Ended:
              </div>
              <div className="text-gray-900 dark:text-gray-100">
                {new Date(evolutionRun.end_time).toLocaleString()}
              </div>
            </div>
          )}
        </div>
        {evolutionRun.notes && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Notes:
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {evolutionRun.notes}
            </div>
          </div>
        )}
      </div>

      {/* Evolution Graph */}
      <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <button
          onClick={() => setShowGraph(!showGraph)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Evolution Graph
          </h2>
          <span className="text-gray-400 dark:text-gray-500">
            {showGraph ? "▼" : "▶"}
          </span>
        </button>
        {showGraph && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <EvolutionGraph runId={run_id} className="p-4" />
          </div>
        )}
      </div>

      {/* Generations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Generations (
          {generationsLoading ? "Loading..." : generationsData.length})
        </h2>

        {generationsData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {generationsLoading
              ? "Loading generations..."
              : "No generations found for this run"}
          </div>
        ) : (
          generationsData.map(({ generation, invocations }) => {
            const fitnessRange = getFitnessRange(invocations)

            return (
              <div
                key={generation.generation_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <button
                  onClick={() => toggleGeneration(generation.generation_id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Generation {generation.number}
                    </span>
                    <Link
                      href={`https://supabase.com/dashboard/project/qnvprftdorualkdyogka/editor/96125?filter=generation_id:eq:${generation.generation_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-200 dark:border-blue-700"
                      onClick={(e) => e.stopPropagation()}
                      title="View in Supabase Dashboard"
                    >
                      {generation.generation_id}
                    </Link>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {invocations.length} invocations
                    </span>
                    {fitnessRange && (
                      <span className="text-sm text-green-600 font-medium">
                        Fitness:{" "}
                        {fitnessRange.count === 1
                          ? fitnessRange.min.toFixed(2)
                          : `${fitnessRange.min.toFixed(2)}-${fitnessRange.max.toFixed(2)}`}
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getTimeDifference(generation.start_time)}
                    </span>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500">
                    {expandedGenerations.has(generation.generation_id)
                      ? "▼"
                      : "▶"}
                  </span>
                </button>

                {expandedGenerations.has(generation.generation_id) && (
                  <div className="px-4 pb-4">
                    {generation.comment && (
                      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <strong className="text-gray-900 dark:text-gray-100">
                          Comment:
                        </strong>{" "}
                        <span className="text-gray-900 dark:text-gray-100">
                          {generation.comment}
                        </span>
                      </div>
                    )}

                    {/* Workflow Invocations */}
                    {invocations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Executed Invocations ({invocations.length})
                        </h4>
                        <div className="space-y-2">
                          {invocations.map((invocation) => (
                            <InvocationRow
                              key={invocation.wf_invocation_id}
                              invocation={invocation}
                              workflowVersions={workflowVersions}
                              fetchWorkflowVersion={fetchWorkflowVersion}
                              showDslModal={showDslModal}
                              dslLoading={dslLoading}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {invocations.length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No invocations in this generation
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* DSL Modal */}
      {dslModalOpen && currentDsl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-auto w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Workflow DSL</h3>
              <button
                onClick={() => setDslModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded text-sm overflow-auto max-h-[70vh] whitespace-pre-wrap">
              {JSON.stringify(currentDsl, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

interface InvocationRowProps {
  invocation: WorkflowInvocationSubset
  workflowVersions: Map<string, Tables<"WorkflowVersion">>
  fetchWorkflowVersion: (
    versionId: string
  ) => Promise<Tables<"WorkflowVersion">>
  showDslModal: (versionId: string) => Promise<void>
  dslLoading: boolean
}

function InvocationRow({
  invocation,
  workflowVersions: _workflowVersions,
  fetchWorkflowVersion,
  showDslModal,
  dslLoading,
}: InvocationRowProps) {
  const [structureLoaded, setStructureLoaded] = useState(false)
  const [workflowVersion, setWorkflowVersion] =
    useState<Tables<"WorkflowVersion"> | null>(null)

  useEffect(() => {
    const loadWorkflowVersion = async () => {
      try {
        const version = await fetchWorkflowVersion(invocation.wf_version_id)
        setWorkflowVersion(version)
        setStructureLoaded(true)
      } catch (err) {
        console.error("Failed to load workflow version:", err)
      }
    }

    loadWorkflowVersion()
  }, [invocation.wf_version_id, fetchWorkflowVersion])

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-900">
      <div className="flex items-start gap-4">
        {/* Workflow Structure Visualization */}
        <div className="flex-shrink-0">
          {structureLoaded &&
          workflowVersion &&
          isWorkflowConfig(workflowVersion.dsl) ? (
            <div className="w-32 h-20 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 overflow-hidden">
              <div
                style={{ transform: "scale(0.5)", transformOrigin: "top left" }}
              >
                <StructureMiniMap dsl={workflowVersion.dsl} />
              </div>
            </div>
          ) : (
            <div className="w-32 h-20 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Loading...
              </span>
            </div>
          )}
        </div>

        {/* Main Invocation Info */}
        <div className="flex-grow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/trace/${invocation.wf_invocation_id}`}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono text-sm"
              >
                {invocation.wf_invocation_id}
              </Link>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  invocation.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : invocation.status === "running"
                      ? "bg-blue-100 text-blue-800"
                      : invocation.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {invocation.status}
              </span>

              {/* DSL Button */}
              <button
                onClick={() => showDslModal(invocation.wf_version_id)}
                disabled={dslLoading}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono flex items-center justify-center transition-colors disabled:opacity-50 text-gray-700 dark:text-gray-300"
                title="View DSL"
              >
                {dslLoading ? "..." : "</>"}
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {invocation.fitness_score !== null &&
              invocation.fitness_score !== undefined ? (
                <div className="flex items-center gap-3">
                  <span>Fitness: {invocation.fitness_score.toFixed(2)}</span>
                  {invocation.accuracy !== null &&
                    invocation.accuracy !== undefined && (
                      <span>Accuracy: {invocation.accuracy.toFixed(2)}</span>
                    )}
                </div>
              ) : (
                <span>Fitness: N/A</span>
              )}
              <span className="text-gray-900 dark:text-gray-100">
                ${invocation.usd_cost.toFixed(4)}
              </span>
              {invocation.end_time && (
                <span>
                  {Math.round(
                    (new Date(invocation.end_time).getTime() -
                      new Date(invocation.start_time).getTime()) /
                      1000
                  )}
                  s
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400">
                {getTimeDifference(invocation.start_time)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
