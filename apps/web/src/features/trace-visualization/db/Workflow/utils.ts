import { JSONN, type Json, type Tables, type TablesInsert } from "@lucky/shared/client"
import { nanoid } from "nanoid"

/**
 * Subset of Message fields used for node invocation display.
 * Optimized to exclude unnecessary fields like seq, to_node_id, wf_invocation_id, reply_to.
 */
export type MessageMetadata = Pick<
  Tables<"Message">,
  "msg_id" | "role" | "origin_invocation_id" | "target_invocation_id" | "created_at" | "payload" | "from_node_id"
>

export interface NodeInvocationExtended extends Tables<"NodeInvocation"> {
  node: Tables<"NodeVersion">
  inputs: MessageMetadata[]
  outputs: MessageMetadata[]
}

export interface NodeGroup {
  node: Tables<"NodeVersion">
  invocations: NodeInvocationExtended[]
}

export const safeJSON = (data: unknown, maxLength = 100) => {
  if (JSONN.isJSON(data)) {
    return JSONN.extract(data, false) ?? `not possible to parse this json: ${JSON.stringify(data).slice(0, maxLength)}`
  }
  return String(data).slice(0, maxLength)
}

export const wrapLegacyPayload = (data: unknown) => {
  if (typeof data === "object" && data !== null) {
    return data as Record<string, unknown>
  }

  if (typeof data === "string" && JSONN.isJSON(data)) {
    return safeJSON(data)
  }

  return { kind: "text", content: String(data) }
}

export const groupInvocationsByNode = (invocations: NodeInvocationExtended[]): NodeGroup[] => {
  const map = new Map<string, NodeGroup>()

  invocations.forEach(inv => {
    const group = map.get(inv.node_id) ?? {
      node: inv.node,
      invocations: [],
    }
    group.invocations.push(inv)
    map.set(inv.node_id, group)
  })

  return Array.from(map.values()).sort((a, b) => a.invocations[0].start_time.localeCompare(b.invocations[0].start_time))
}
export const normalizeNodeInvocation = (
  raw: Tables<"NodeInvocation"> & {
    NodeVersion: Tables<"NodeVersion"> | null
    inputs?: MessageMetadata[]
    outputs?: MessageMetadata[]
    output?: unknown
  },
): NodeInvocationExtended => {
  const { NodeVersion: nodeDef, inputs = [], outputs = [], output: legacyOutput, ...rest } = raw

  const hasLegacyOutput =
    legacyOutput !== undefined &&
    legacyOutput !== null &&
    typeof legacyOutput !== "function" &&
    typeof legacyOutput !== "symbol"

  // If there are no structured outputs but there is a legacy output,
  // synthesize a single Message entry from the legacy payload.
  const normalizedOutputs =
    Array.isArray(outputs) && outputs.length > 0
      ? outputs
      : hasLegacyOutput
        ? [
            {
              msg_id: nanoid(),
              seq: 0,
              role: "assistant" as Tables<"Message">["role"],
              payload: wrapLegacyPayload(legacyOutput) as Json,
              created_at: (rest.end_time ?? rest.start_time ?? new Date().toISOString()) as string,
              // ✅ Use invocation id if available; fall back to version id if that's all we have
              wf_invocation_id: (rest as any).wf_invocation_id ?? (rest as any).wf_version_id,
              origin_invocation_id: rest.node_invocation_id as string,
              target_invocation_id: null,
              from_node_id: rest.node_id as string,
              to_node_id: null,
            } satisfies TablesInsert<"Message">,
          ]
        : []

  return {
    ...rest,
    // Do NOT drop the record if NodeVersion is missing.
    // Preserve it so callers can still see the invocation & messages.
    node: nodeDef ?? ({} as Tables<"NodeVersion">),
    inputs,
    outputs: normalizedOutputs,
    output: hasLegacyOutput ? (legacyOutput as Tables<"NodeInvocation">["output"]) : null,
  }
}
