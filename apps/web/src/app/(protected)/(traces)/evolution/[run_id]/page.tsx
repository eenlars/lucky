"use client"

import { StructureMiniMap } from "@/app/(protected)/(traces)/trace/[wf_inv_id]/structure/StructureMiniMap"
import { EvolutionGraph } from "@/app/components/evolution/EvolutionGraph"
import { Button } from "@/components/ui/button"
import {
  type GenerationWithData,
  type WorkflowInvocationSubset,
  useEvolutionRun,
  useGenerationsData,
  useWorkflowVersion,
} from "@/hooks/queries/useEvolutionQuery"
import { useEvolutionUIStore } from "@/stores/evolution-ui-store"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { isWorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import type { Database } from "@lucky/shared/client"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import Link from "next/link"
import { use, useState } from "react"

dayjs.extend(relativeTime)

interface WorkflowStructureGroup {
  dslHash: string
  dsl: WorkflowConfig
  versions: Tables<"WorkflowVersion">[]
  invocations: WorkflowInvocationSubset[]
  firstSeenGeneration: number
  lastSeenGeneration: number
}

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

type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]

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
    .filter(inv => inv.fitness !== null && inv.fitness !== undefined)
    .map(inv => inv.fitness!)

  if (fitnessScores.length === 0) return null

  return {
    min: Math.min(...fitnessScores),
    max: Math.max(...fitnessScores),
    count: fitnessScores.length,
  }
}

const formatNumberTrim = (value: number) => {
  const str = value.toFixed(2)
  return str.replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1")
}

const formatFitnessDisplay = (range: { min: number; max: number; count: number }) => {
  if (range.count === 1 || range.min === range.max) {
    return formatNumberTrim(range.min)
  }
  return `${formatNumberTrim(range.min)}-${formatNumberTrim(range.max)}`
}

const groupByWorkflowStructure = (
  generationsData: GenerationWithData[],
  _workflowVersions: Map<string, Tables<"WorkflowVersion">>,
): WorkflowStructureGroup[] => {
  const structureGroups = new Map<string, WorkflowStructureGroup>()

  // Process all generations to group by DSL structure
  generationsData.forEach(({ generation, versions, invocations }) => {
    versions.forEach(version => {
      if (!isWorkflowConfig(version.dsl)) return

      // Simple hash using stringified DSL
      const dslHash = JSON.stringify(version.dsl)

      if (!structureGroups.has(dslHash)) {
        structureGroups.set(dslHash, {
          dslHash,
          dsl: version.dsl,
          versions: [],
          invocations: [],
          firstSeenGeneration: generation.number,
          lastSeenGeneration: generation.number,
        })
      }

      const group = structureGroups.get(dslHash)!

      // Add version if not already present
      if (!group.versions.find(v => v.wf_version_id === version.wf_version_id)) {
        group.versions.push(version)
      }

      // Add related invocations
      const versionInvocations = invocations.filter(inv => inv.wf_version_id === version.wf_version_id)
      group.invocations.push(...versionInvocations)

      // Update generation range
      group.firstSeenGeneration = Math.min(group.firstSeenGeneration, generation.number)
      group.lastSeenGeneration = Math.max(group.lastSeenGeneration, generation.number)
    })
  })

  // Sort by first appearance
  return Array.from(structureGroups.values()).sort((a, b) => a.firstSeenGeneration - b.firstSeenGeneration)
}

export default function EvolutionRunPage({ params }: { params: Promise<{ run_id: string }> }) {
  const { run_id } = use(params)

  // TanStack Query hooks
  const { data: evolutionRun, isLoading: loading, error, refetch: refetchEvolutionRun } = useEvolutionRun(run_id)

  const {
    data: generationsData = [],
    isLoading: generationsLoading,
    refetch: refetchGenerations,
  } = useGenerationsData(run_id, !!evolutionRun)

  // UI state from Zustand
  const {
    expandedGenerations,
    expandedStructures,
    showGraph,
    dslModalOpen,
    currentDsl,
    toggleGeneration,
    toggleStructure,
    setShowGraph,
    openDslModal,
    closeDslModal,
  } = useEvolutionUIStore()

  // For DSL modal - track loading and selected version
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const { data: selectedVersion, isLoading: dslLoading } = useWorkflowVersion(selectedVersionId)

  // Show DSL modal when version is loaded
  const showDslModal = async (versionId: string) => {
    setSelectedVersionId(versionId)
  }

  // Open modal when selected version loads
  if (selectedVersion && isWorkflowConfig(selectedVersion.dsl) && !dslModalOpen) {
    openDslModal(selectedVersion.dsl)
    setSelectedVersionId(null) // Reset for next time
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading evolution run...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500 dark:text-red-400 mb-4">
          {error instanceof Error ? error.message : "Failed to load evolution run"}
        </div>
        <button
          type="button"
          onClick={() => {
            refetchEvolutionRun()
            refetchGenerations()
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
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Evolution run not found</div>
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{evolutionRun.run_id}</h1>
      </div>

      {/* Run Details */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Run Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Goal:</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">{evolutionRun.goal_text}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Status:</div>
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
              {evolutionRun.status === "running" && isStaleRun(evolutionRun) ? "stale" : evolutionRun.status}
            </span>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Started:</div>
            <div className="text-gray-900 dark:text-gray-100">{new Date(evolutionRun.start_time).toLocaleString()}</div>
          </div>
          {evolutionRun.end_time && (
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Ended:</div>
              <div className="text-gray-900 dark:text-gray-100">{new Date(evolutionRun.end_time).toLocaleString()}</div>
            </div>
          )}
        </div>
        {evolutionRun.notes && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Notes:</div>
            <div className="text-sm text-gray-900 dark:text-gray-100">{evolutionRun.notes}</div>
          </div>
        )}
      </div>

      {/* Evolution Graph */}
      <div className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <Button
          asChild
          variant="ghost"
          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors rounded-none h-auto font-normal"
        >
          <button
            type="button"
            onClick={() => setShowGraph(!showGraph)}
            className="w-full flex items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Evolution Graph</h2>
            <span className="text-gray-400 dark:text-gray-500">{showGraph ? "▼" : "▶"}</span>
          </button>
        </Button>
        {showGraph && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <EvolutionGraph runId={run_id} className="p-4" />
          </div>
        )}
      </div>

      {/* Generations */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Generations ({generationsLoading ? "Loading..." : generationsData.length})
        </h2>

        {generationsData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {generationsLoading ? "Loading generations..." : "No generations found for this run"}
          </div>
        ) : (
          generationsData.map(({ generation, invocations }) => {
            const fitnessRange = getFitnessRange(invocations)

            return (
              <div
                key={generation.generation_id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <Button
                  asChild
                  variant="ghost"
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors rounded-none h-auto font-normal"
                >
                  <button
                    type="button"
                    onClick={() => toggleGeneration(generation.generation_id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Generation {generation.number}
                      </span>
                      {process.env.NODE_ENV === "development" ? (
                        <Link
                          href={`https://supabase.com/dashboard/project/qnvprftdorualkdyogka/editor/96125?filter=generation_id:eq:${generation.generation_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded border border-blue-200 dark:border-blue-700"
                          onClick={e => e.stopPropagation()}
                          title="View in Supabase Dashboard"
                        >
                          {generation.generation_id}
                        </Link>
                      ) : (
                        <span
                          className="text-xs text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                          onClick={e => e.stopPropagation()}
                        >
                          {generation.generation_id}
                        </span>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">{invocations.length} invocations</span>
                      {fitnessRange && (
                        <span className="text-sm text-green-600 font-medium">
                          Fitness: {formatFitnessDisplay(fitnessRange)}
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {getTimeDifference(generation.start_time)}
                      </span>
                    </div>
                    <span className="text-gray-400 dark:text-gray-500">
                      {expandedGenerations.has(generation.generation_id) ? "▼" : "▶"}
                    </span>
                  </button>
                </Button>

                {expandedGenerations.has(generation.generation_id) && (
                  <div className="px-4 pb-4">
                    {generation.comment && (
                      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <strong className="text-gray-900 dark:text-gray-100">Comment:</strong>{" "}
                        <span className="text-gray-900 dark:text-gray-100">{generation.comment}</span>
                      </div>
                    )}

                    {/* Workflow Structures grouped within this generation */}
                    <WorkflowStructuresView
                      generationsData={[
                        {
                          generation,
                          versions:
                            generationsData.find(g => g.generation.generation_id === generation.generation_id)
                              ?.versions || [],
                          invocations,
                        },
                      ]}
                      expandedStructures={expandedStructures}
                      toggleStructure={toggleStructure}
                      showDslModal={showDslModal}
                      dslLoading={dslLoading}
                      idPrefix={`gen-${generation.generation_id}-`}
                    />

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
              <Button
                onClick={closeDslModal}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl h-auto p-1"
              >
                ✕
              </Button>
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
  showDslModal: (versionId: string) => Promise<void>
  dslLoading: boolean
}

function InvocationRow({ invocation, showDslModal, dslLoading }: InvocationRowProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-900">
      <div className="flex items-start">
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
              <Button
                onClick={() => showDslModal(invocation.wf_version_id)}
                disabled={dslLoading}
                variant="outline"
                size="sm"
                className="h-auto px-2 py-1 text-xs font-mono"
                title="View DSL"
              >
                {dslLoading ? "..." : "</>"}
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              {invocation.fitness !== null && invocation.fitness !== undefined ? (
                <div className="flex items-center gap-3">
                  <span>Fitness: {invocation.fitness.toFixed(2)}</span>
                  {invocation.accuracy !== null && invocation.accuracy !== undefined && (
                    <span>Accuracy: {invocation.accuracy.toFixed(2)}</span>
                  )}
                </div>
              ) : (
                <span>Fitness: N/A</span>
              )}
              <span className="text-gray-900 dark:text-gray-100">${invocation.usd_cost.toFixed(4)}</span>
              {invocation.end_time && (
                <span>
                  {Math.round(
                    (new Date(invocation.end_time).getTime() - new Date(invocation.start_time).getTime()) / 1000,
                  )}
                  s
                </span>
              )}
              <span className="text-gray-500 dark:text-gray-400">{getTimeDifference(invocation.start_time)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface WorkflowStructuresViewProps {
  generationsData: GenerationWithData[]
  expandedStructures: Set<string>
  toggleStructure: (structureHash: string) => void
  showDslModal: (versionId: string) => Promise<void>
  dslLoading: boolean
  idPrefix?: string
}

function WorkflowStructuresView({
  generationsData,
  expandedStructures,
  toggleStructure,
  showDslModal,
  dslLoading,
  idPrefix = "",
}: WorkflowStructuresViewProps) {
  const structureGroups = groupByWorkflowStructure(generationsData, new Map())

  if (structureGroups.length === 0) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No workflow structures found</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Found {structureGroups.length} unique workflow structure
        {structureGroups.length !== 1 ? "s" : ""}
      </div>

      {structureGroups.map((group, index) => {
        const fitnessRange = getFitnessRange(group.invocations)
        const structureId = `${idPrefix}structure-${index}`

        return (
          <div
            key={structureId}
            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          >
            <Button
              asChild
              variant="ghost"
              className="w-full px-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors rounded-none h-auto font-normal"
            >
              <button
                type="button"
                onClick={() => toggleStructure(structureId)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {isWorkflowConfig(group.dsl) && (
                      <div className="w-32 h-32 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 overflow-hidden">
                        <StructureMiniMap dsl={group.dsl} width={128} height={128} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Structure #{index + 1}</span>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Generations {group.firstSeenGeneration}-{group.lastSeenGeneration}
                      </span>
                      <span>{group.versions.length} versions</span>
                      <span>{group.invocations.length} invocations</span>
                      {fitnessRange && (
                        <span className="text-green-600 font-medium">
                          Fitness: {formatFitnessDisplay(fitnessRange)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-gray-400 dark:text-gray-500">
                  {expandedStructures.has(structureId) ? "▼" : "▶"}
                </span>
              </button>
            </Button>

            {expandedStructures.has(structureId) && (
              <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                {/* Workflow Versions */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workflow Versions ({group.versions.length})
                  </h4>
                  <div className="space-y-2">
                    {group.versions.map(version => {
                      const versionInvocations = group.invocations.filter(
                        inv => inv.wf_version_id === version.wf_version_id,
                      )

                      return (
                        <div
                          key={version.wf_version_id}
                          className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/edit/${version.wf_version_id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono text-sm"
                              >
                                {version.wf_version_id}
                              </Link>
                              {version.commit_message && (
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {version.commit_message}
                                </span>
                              )}
                              <Button
                                onClick={() => showDslModal(version.wf_version_id)}
                                disabled={dslLoading}
                                variant="outline"
                                size="sm"
                                className="h-auto px-2 py-1 text-xs font-mono"
                                title="View DSL"
                              >
                                {dslLoading ? "..." : "</>"}
                              </Button>
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {versionInvocations.length} invocations
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Invocations */}
                {group.invocations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invocations ({group.invocations.length})
                    </h4>
                    <div className="space-y-2">
                      {group.invocations.map(invocation => (
                        <InvocationRow
                          key={invocation.wf_invocation_id}
                          invocation={invocation}
                          showDslModal={showDslModal}
                          dslLoading={dslLoading}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
