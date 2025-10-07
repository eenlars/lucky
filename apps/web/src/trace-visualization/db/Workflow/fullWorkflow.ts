"use server"
import { createClient } from "@/lib/supabase/server"
import { safeJSON } from "@/trace-visualization/db/Workflow/utils"
import type { AgentStep, AgentSteps } from "@lucky/core/messages/pipeline/AgentStep.types"
import type { NodeMemory } from "@lucky/core/utils/memory/memorySchema"
import type { Tables } from "@lucky/shared/client"
import { JSONN } from "@lucky/shared/client"
import { nanoid } from "nanoid"
import { cache } from "react"

export interface NodeInvocationExtended extends Tables<"NodeInvocation"> {
  node: Tables<"NodeVersion">
  inputs: Tables<"Message">[]
  outputs: Tables<"Message">[]
}

type AgentStepsLegacy = {
  outputs: AgentStep[]
  totalCost: number
}

export interface NodeInvocationExtras {
  message_id?: string
  agentSteps?: AgentSteps | AgentStepsLegacy
  updatedMemory?: NodeMemory
}

export interface NodeGroup {
  node: Tables<"NodeVersion">
  invocations: NodeInvocationExtended[]
}

export interface FullWorkflowResult {
  workflowInvocation: Tables<"WorkflowInvocation">
  workflowVersion: Tables<"WorkflowVersion">
  workflow: Tables<"Workflow">
  nodeInvocations: NodeInvocationExtended[]
  groups: NodeGroup[]
}

export const fullWorkflow = cache(async (workflowInvocationId: string): Promise<FullWorkflowResult | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .select(
      `
          *,
          WorkflowVersion (
            *,
            Workflow!WorkflowVersion_workflow_id_fkey ( * )
          ),
          NodeInvocation (
            *,
            NodeVersion          ( * ),
            inputs:Message!Message_target_invocation_id_fkey ( * ),
            outputs:Message!Message_origin_invocation_id_fkey ( * )
          )
        `,
    )
    .eq("wf_invocation_id", workflowInvocationId)
    .order("start_time", { referencedTable: "NodeInvocation" })
    .limit(1)

  if (error) {
    throw new Error("Failed to fetch workflow details")
  }
  const workflow = data && Array.isArray(data) && data.length > 0 ? (data[0] as any) : null
  if (!workflow) return null

  const { WorkflowVersion: workflowVersionRaw, NodeInvocation: nodeInvocationRaw, ...workflowInvocation } = workflow
  const { Workflow: workflowRaw, ...workflowVersion } = workflowVersionRaw

  const nodeInvocations: NodeInvocationExtended[] = (nodeInvocationRaw ?? []).map((raw: any) => {
    const { NodeVersion: nodeDef, inputs = [], outputs = [], output: legacyOutput, ...rest } = raw

    const normalisedOutputs =
      outputs.length > 0 || legacyOutput == null
        ? outputs
        : [
            {
              msg_id: nanoid(),
              seq: 0,
              role: "assistant",
              payload: wrapLegacyPayload(legacyOutput),
              created_at: rest.end_time ?? rest.start_time,
              wf_invocation_id: rest.wf_version_id,
              origin_invocation_id: rest.node_invocation_id,
              target_invocation_id: null,
              from_node_id: rest.node_id,
              to_node_id: null,
              reply_to: null,
            } as unknown as Tables<"Message">,
          ]

    return {
      ...rest,
      node: nodeDef,
      inputs,
      outputs: normalisedOutputs,
      output: legacyOutput,
    }
  })

  const groups = groupInvocationsByNode(nodeInvocations)

  return {
    workflowInvocation,
    workflowVersion,
    workflow: workflowRaw,
    nodeInvocations,
    groups,
  }
})

/* …helpers (wrapLegacyPayload, isJSON, groupInvocationsByNode) stay unchanged… */

/* ────────────────────────────── Helper utils ─────────────────────────────── */

const wrapLegacyPayload = (data: unknown) => {
  // Heuristic: preserve objects verbatim, wrap primitives as { kind: "text" }
  if (typeof data === "object" && data !== null) {
    return data as Record<string, unknown>
  }

  // Try to parse as JSON if it's a string
  // TODO this is not the most clean solution, but it works for now
  if (typeof data === "string" && JSONN.isJSON(data)) {
    return safeJSON(data)
  }

  // Default case: wrap as text
  return { kind: "text", content: String(data) }
}

const groupInvocationsByNode = (invocations: NodeInvocationExtended[]): NodeGroup[] => {
  const map = new Map<string, NodeGroup>()

  invocations.forEach(inv => {
    const group = map.get(inv.node_id) ?? {
      node: inv.node,
      invocations: [],
    }
    group.invocations.push(inv)
    map.set(inv.node_id, group)
  })

  // Preserve chronological order of **first** invocation in each group
  return Array.from(map.values()).sort((a, b) => a.invocations[0].start_time.localeCompare(b.invocations[0].start_time))
}
