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
  raw: Record<string, unknown> & {
    NodeVersion: Tables<"NodeVersion"> | null
    inputs?: MessageMetadata[]
    outputs?: MessageMetadata[]
    output?: unknown
  },
): NodeInvocationExtended | null => {
  const { NodeVersion: nodeDef, inputs = [], outputs = [], output: legacyOutput, ...rest } = raw

  if (!nodeDef) return null

  const normalisedOutputs =
    outputs.length > 0 || legacyOutput == null
      ? outputs
      : [
          {
            msg_id: nanoid(),
            seq: 0,
            role: "assistant" as Tables<"Message">["role"],
            payload: wrapLegacyPayload(legacyOutput) as Json,
            created_at: (rest.end_time ?? rest.start_time ?? "") as string,
            wf_invocation_id: rest.wf_version_id as string,
            origin_invocation_id: rest.node_invocation_id as string,
            target_invocation_id: null,
            from_node_id: rest.node_id as string,
            to_node_id: null,
          } satisfies TablesInsert<"Message">,
        ]

  return {
    ...rest,
    node: nodeDef,
    inputs,
    outputs: normalisedOutputs,
    output:
      legacyOutput !== undefined &&
      legacyOutput !== null &&
      typeof legacyOutput !== "function" &&
      typeof legacyOutput !== "symbol"
        ? (legacyOutput as Tables<"NodeInvocation">["output"])
        : null,
  } as NodeInvocationExtended
}
