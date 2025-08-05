"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"

import { Timeline } from "@/trace-visualization/components/Timeline"
import { basicWorkflow } from "@/trace-visualization/db/Workflow/basicWorkflow"
import {
  NodeInvocationExtended,
  nodeInvocations,
} from "@/trace-visualization/db/Workflow/nodeInvocations"
import type { FullTraceEntry } from "@/trace-visualization/types"
import type { Tables } from "@core/utils/clients/supabase/types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import PerformanceOverview from "./components/PerformanceOverview"

const SUPABASE_TABLES = {
  WorkflowVersion: 17463,
  WorkflowInvocation: 17720,
} as const

export default function TraceDetailPage({
  params,
}: {
  params: Promise<{ wf_inv_id: string }>
}) {
  const { wf_inv_id } = use(params)
  const [workflow, setWorkflow] = useState<Tables<"WorkflowInvocation"> | null>(
    null
  )
  const [workflowVersion, setWorkflowVersion] =
    useState<Tables<"WorkflowVersion"> | null>(null)
  const [_workflowDetails, setWorkflowDetails] =
    useState<Tables<"Workflow"> | null>(null)
  const [timeline, setTimeline] = useState<FullTraceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFreshness, setDataFreshness] = useState<number>(0)
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    totalDuration: number
    bottleneckNode: string | null
    totalNodes: number
    totalCost: number
  }>({
    totalDuration: 0,
    bottleneckNode: null,
    totalNodes: 0,
    totalCost: 0,
  })

  // Convert nodeInvocations to the format expected by Timeline component
  const createTimelineEntries = (
    nodeInvocations: NodeInvocationExtended[],
    workflowVersion: Tables<"WorkflowVersion"> | null
  ): FullTraceEntry[] => {
    return nodeInvocations.map((inv, idx) => {
      // Find the first output message, if any
      let output = inv.outputs.length > 0 ? inv.outputs[0] : null

      // For the last node, if there's a direct output field, use that for full content
      if (idx === nodeInvocations.length - 1 && inv.output) {
        // Create a Message object from the output field for compatibility
        output = {
          msg_id: "last-node-output",
          seq: 0,
          role: "result",
          payload:
            typeof inv.output === "string"
              ? { kind: "result", workDone: inv.output }
              : inv.output,
          created_at: inv.end_time || inv.start_time,
          wf_invocation_id: inv.wf_invocation_id,
          origin_invocation_id: inv.node_invocation_id,
          target_invocation_id: null,
          from_node_id: inv.node_id,
          to_node_id: null,
          reply_to: null,
        } as Tables<"Message">
      }

      // Extract system prompt from DSL
      let systemPrompt = inv.node.system_prompt
      if (workflowVersion?.dsl) {
        const dsl = workflowVersion.dsl as unknown as WorkflowConfig
        const nodeInDsl = dsl.nodes?.find((node) => node.nodeId === inv.node_id)
        if (nodeInDsl?.systemPrompt) {
          systemPrompt = nodeInDsl.systemPrompt
        }
      }

      return {
        invocation: inv,
        nodeDefinition: {
          ...inv.node,
          system_prompt: systemPrompt,
        },
        inputs: inv.inputs,
        output,
      }
    })
  }

  // Calculate performance metrics from workflow and timeline data
  const calculatePerformanceMetrics = (
    workflow: Tables<"WorkflowInvocation">,
    timeline: FullTraceEntry[]
  ) => {
    // Calculate total duration in seconds
    const totalDuration = workflow.end_time
      ? (new Date(workflow.end_time).getTime() -
          new Date(workflow.start_time).getTime()) /
        1000
      : 0

    // Count nodes
    const totalNodes = timeline.length

    // Calculate total cost from node invocations if workflow cost is not available
    const totalCost =
      workflow.usd_cost && workflow.usd_cost > 0
        ? workflow.usd_cost
        : timeline.reduce(
            (sum, entry) => sum + (entry.invocation.usd_cost || 0),
            0
          )

    // Find bottleneck node (longest running)
    let bottleneckNode = null
    let maxDuration = 0

    timeline.forEach((entry) => {
      const startTime = new Date(entry.invocation.start_time).getTime()
      const endTime = entry.invocation.end_time
        ? new Date(entry.invocation.end_time).getTime()
        : Date.now()
      const duration = (endTime - startTime) / 1000

      if (duration > maxDuration) {
        maxDuration = duration
        bottleneckNode =
          entry.nodeDefinition.node_id || `Node ${entry.invocation.node_id}`
      }
    })

    return {
      totalDuration,
      bottleneckNode,
      totalNodes,
      totalCost,
    }
  }

  useEffect(() => {
    const fetchBasicData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch basic workflow info first for immediate display
        const { workflowInvocation, workflowVersion, workflow } =
          await basicWorkflow(wf_inv_id)
        setWorkflow(workflowInvocation)
        setWorkflowVersion(workflowVersion)
        setWorkflowDetails(workflow)
        setLoading(false)

        // Then fetch detailed node data asynchronously
        setTimelineLoading(true)
        const { nodeInvocations: nodeInvocationData } =
          await nodeInvocations(wf_inv_id)

        // Convert nodeInvocations to timeline entries
        const timelineEntries = createTimelineEntries(
          nodeInvocationData,
          workflowVersion
        )
        setTimeline(timelineEntries)

        // Calculate performance metrics
        setPerformanceMetrics(
          calculatePerformanceMetrics(workflowInvocation, timelineEntries)
        )
        setTimelineLoading(false)
        setDataFreshness(Date.now())
      } catch (err) {
        console.error("Error fetching trace data:", err)
        setError(
          err instanceof Error ? err.message : "Failed to load trace data."
        )
        setLoading(false)
        setTimelineLoading(false)
      }
    }

    fetchBasicData()
  }, [wf_inv_id])

  // Separate effect for auto-refresh to avoid dependency loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (workflow && (workflow.status === "running" || !workflow.end_time)) {
      interval = setInterval(() => {
        const timeSinceLastFetch = Date.now() - dataFreshness
        if (timeSinceLastFetch > 8000) {
          const refreshData = async () => {
            try {
              // Refresh basic data
              const { workflowInvocation, workflowVersion, workflow } =
                await basicWorkflow(wf_inv_id)
              setWorkflow(workflowInvocation)
              setWorkflowVersion(workflowVersion)
              setWorkflowDetails(workflow)

              // Refresh node data
              const { nodeInvocations: nodeInvocationData } =
                await nodeInvocations(wf_inv_id)
              const timelineEntries = createTimelineEntries(
                nodeInvocationData,
                workflowVersion
              )
              setTimeline(timelineEntries)

              setPerformanceMetrics(
                calculatePerformanceMetrics(workflowInvocation, timelineEntries)
              )
              setDataFreshness(Date.now())
            } catch (err) {
              console.error("Error refreshing trace data:", err)
            }
          }
          refreshData()
        }
      }, 10000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [workflow?.status, workflow?.end_time, dataFreshness, wf_inv_id, workflow])

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl text-gray-900 dark:text-gray-100">
            Loading trace data…
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <Link
          href="/invocations"
          className="text-blue-500 dark:text-blue-400 hover:underline"
        >
          ← Back to invocations
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/invocations"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Invocations
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Trace for Workflow Invocation
          </h1>
        </div>

        {workflowVersion && (
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                wf_invocation_id:
              </span>
              <Link
                href={`https://supabase.com/dashboard/project/qnvprftdorualkdyogka/editor/${SUPABASE_TABLES.WorkflowInvocation}?schema=public&sort=start_time:desc&filter=wf_invocation_id%3Aeq%3A${wf_inv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              >
                {wf_inv_id}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                wf_version_id:
              </span>
              <Link
                href={`https://supabase.com/dashboard/project/qnvprftdorualkdyogka/editor/${SUPABASE_TABLES.WorkflowVersion}?schema=public&sort=created_at:desc&filter=wf_version_id%3Aeq%3A${workflowVersion.wf_version_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              >
                {workflowVersion.wf_version_id}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Operation:
              </span>
              <span className="capitalize bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                {workflowVersion.operation}
              </span>
            </div>
            {workflowVersion.generation_id && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Generation:
                </span>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs">
                  {workflowVersion.generation_id}...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {workflow && (
        <PerformanceOverview
          workflow={workflow}
          workflowVersion={workflowVersion}
          performanceMetrics={performanceMetrics}
          wf_inv_id={wf_inv_id}
        />
      )}

      {timelineLoading ? (
        <div className="p-6 flex justify-center items-center min-h-[30vh]">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg text-gray-900 dark:text-gray-100">
              Loading timeline data…
            </p>
          </div>
        </div>
      ) : (
        <Timeline items={timeline} />
      )}
    </div>
  )
}
