import type { Tables } from "@/core/utils/clients/supabase/types"
import { JSONN } from "@/core/utils/file-types/json/jsonParse"
import { nanoid } from "nanoid"

export interface NodeInvocationExtended extends Tables<"NodeInvocation"> {
  node: Tables<"NodeVersion">
  inputs: Tables<"Message">[]
  outputs: Tables<"Message">[]
}

export interface NodeGroup {
  node: Tables<"NodeVersion">
  invocations: NodeInvocationExtended[]
}

export const safeJSON = (data: unknown, maxLength = 100) => {
  if (JSONN.isJSON(data)) {
    return (
      JSONN.extract(data, false) ??
      `not possible to parse this json: ${JSON.stringify(data).slice(0, maxLength)}`
    )
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

export const groupInvocationsByNode = (
  invocations: NodeInvocationExtended[]
): NodeGroup[] => {
  const map = new Map<string, NodeGroup>()

  invocations.forEach((inv) => {
    const group = map.get(inv.node_id) ?? {
      node: inv.node,
      invocations: [],
    }
    group.invocations.push(inv)
    map.set(inv.node_id, group)
  })

  return Array.from(map.values()).sort((a, b) =>
    a.invocations[0].start_time.localeCompare(b.invocations[0].start_time)
  )
}

export const normalizeNodeInvocation = (raw: any): NodeInvocationExtended => {
  const {
    NodeVersion: nodeDef,
    inputs = [],
    outputs = [],
    output: legacyOutput,
    ...rest
  } = raw

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
}
