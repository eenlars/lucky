#!/usr/bin/env bun

import { supabase } from "@lucky/core/utils/clients/supabase/client"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

type WorkflowInvocationRow = any
type WorkflowVersionRow = any
type WorkflowRow = any
type NodeInvocationRow = any

const MAX_TOOL_OUTPUT_STRING_LENGTH = 1000
const MAX_TOOL_OUTPUT_ARRAY_ITEMS = 10
const MAX_TOOL_RETURN_STRINGIFIED_LENGTH = 300

function getCliArg(name: string): string | undefined {
  const prefix = `--${name}=`
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length)
  }
  return undefined
}

function parseTraceIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // Expecting /trace/<wf_invocation_id>
    const parts = u.pathname.split("/").filter(Boolean)
    const idx = parts.indexOf("trace")
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    // Fallback: last segment
    return parts[parts.length - 1] || null
  } catch {
    return null
  }
}

function formatTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  )
}

async function main() {
  const argId = getCliArg("id")
  const argUrl = getCliArg("url")
  const wfInvocationId = argId || (argUrl ? parseTraceIdFromUrl(argUrl) || undefined : undefined)

  if (!wfInvocationId) {
    console.log(
      "Usage: bun scripts/export-trace.ts --id=<wf_invocation_id>\n   or: bun scripts/export-trace.ts --url=http://localhost:3000/trace/<wf_invocation_id>",
    )
    process.exit(1)
  }

  const projectRoot = join(__dirname, "..")
  const reportsDir = join(projectRoot, "reports")
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true })

  console.log(`Exporting trace for wf_invocation_id=${wfInvocationId}`)

  const { data: workflow, error } = await supabase
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
          NodeVersion ( * ),
          inputs:Message!Message_target_invocation_id_fkey ( * ),
          outputs:Message!Message_origin_invocation_id_fkey ( * )
        )
      `,
    )
    .eq("wf_invocation_id", wfInvocationId)
    .order("start_time", { referencedTable: "NodeInvocation" })
    .single()

  if (error) {
    console.error("Failed to fetch trace:", error)
    process.exit(1)
  }

  if (!workflow) {
    console.error("No workflow invocation found")
    process.exit(1)
  }

  const {
    WorkflowVersion: workflowVersionRaw,
    NodeInvocation: nodeInvocationRaw,
    ...workflowInvocation
  } = workflow as WorkflowInvocationRow

  const { Workflow: workflowRaw, ...workflowVersion } = (workflowVersionRaw || {}) as WorkflowVersionRow

  const nodeInvocations = (nodeInvocationRaw || []).map((raw: NodeInvocationRow) => {
    const { NodeVersion: node, inputs = [], outputs = [], ...rest } = raw
    return { ...rest, node, inputs, outputs }
  })

  const truncateString = (value: string): string => {
    if (typeof value !== "string") return value as unknown as string
    if (value.length <= MAX_TOOL_OUTPUT_STRING_LENGTH) return value
    const omitted = value.length - MAX_TOOL_OUTPUT_STRING_LENGTH
    return value.slice(0, MAX_TOOL_OUTPUT_STRING_LENGTH) + `… [${omitted} chars truncated]`
  }

  const truncateArray = (arr: unknown[]): unknown[] => {
    if (!Array.isArray(arr)) return arr as unknown[]
    if (arr.length <= MAX_TOOL_OUTPUT_ARRAY_ITEMS) return arr
    const kept = arr.slice(0, MAX_TOOL_OUTPUT_ARRAY_ITEMS)
    kept.push({
      __truncated__: true,
      omittedCount: arr.length - MAX_TOOL_OUTPUT_ARRAY_ITEMS,
    })
    return kept
  }

  const truncateToolReturn = (ret: any): any => {
    if (ret == null) return ret
    // Common shape: { tool: string, error: any, output: string | any[] | object }
    if (ret && typeof ret === "object") {
      const cloned: any = Array.isArray(ret) ? [...ret] : { ...ret }
      if ("output" in cloned) {
        const out = cloned.output
        if (typeof out === "string") {
          cloned.output = truncateString(out)
        } else if (Array.isArray(out)) {
          cloned.output = truncateArray(out)
        } else if (out && typeof out === "object") {
          // Heuristic: if object has a large text field, truncate it
          const maybeText = (out as any).text || (out as any).content || (out as any).html
          if (typeof maybeText === "string") {
            cloned.output = { ...out, text: truncateString(maybeText) }
          } else {
            cloned.output = out
          }
        }
      }
      return cloned
    }
    if (typeof ret === "string") return truncateString(ret)
    return ret
  }

  const truncateToolOutputsInMessages = (messages: any[]): any[] => {
    return (messages || []).map(m => {
      if (!m) return m
      // Case A: flattened agent step shape directly on message
      if (m.type === "tool" || m.type === "terminate") {
        return { ...m, return: truncateToolReturn(m.return) }
      }
      // Case B: payload carries the agent step
      if (m.payload && typeof m.payload === "object" && (m.payload.type === "tool" || m.payload.type === "terminate")) {
        return {
          ...m,
          payload: {
            ...m.payload,
            return: truncateToolReturn(m.payload.return),
          },
        }
      }
      return m
    })
  }

  const parseActualOutputInExtras = (extras: any): any => {
    if (!extras || typeof extras !== "object") return extras
    try {
      const ao = (extras as any).actualOutput
      if (typeof ao === "string") {
        const parsed = JSON.parse(ao)
        return { ...extras, actualOutput: parsed }
      }
    } catch {
      // ignore parse errors, keep as-is
    }
    return extras
  }

  const truncatedNodeInvocations = nodeInvocations.map((inv: any) => {
    const outputs = truncateToolOutputsInMessages(inv.outputs || [])
    const extras = parseActualOutputInExtras(inv.extras)
    return { ...inv, outputs, extras }
  })

  const workflowInvocationSanitized = {
    ...workflowInvocation,
    extras: parseActualOutputInExtras((workflowInvocation as any)?.extras),
  }

  const payload = {
    workflowInvocation: workflowInvocationSanitized,
    workflowVersion,
    workflow: workflowRaw as WorkflowRow,
    nodeInvocations: truncatedNodeInvocations,
  }

  const safeJSONStringify = (value: unknown): string => {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  const truncateToLen = (text: string, maxLen: number): string => {
    if (text.length <= maxLen) return text
    return text.slice(0, maxLen)
  }

  const truncateToolReturnsEverywhere = (value: any): any => {
    if (value == null) return value
    if (Array.isArray(value)) return value.map(truncateToolReturnsEverywhere)
    if (typeof value === "object") {
      const obj: any = { ...value }
      // If this object itself is a tool step, stringify and hard-truncate its return
      if ((obj.type === "tool" || obj.type === "terminate") && Object.prototype.hasOwnProperty.call(obj, "return")) {
        const stringified = safeJSONStringify(obj.return)
        obj.return = truncateToLen(stringified, MAX_TOOL_RETURN_STRINGIFIED_LENGTH)
      }
      // Recurse into all properties
      for (const [k, v] of Object.entries(obj)) {
        obj[k] = truncateToolReturnsEverywhere(v)
      }
      return obj
    }
    return value
  }

  const finalPayload = truncateToolReturnsEverywhere(payload)

  const now = new Date()
  const filename = `trace-${wfInvocationId}-${formatTimestampForFilename(now)}.json`
  const outPath = join(reportsDir, filename)
  writeFileSync(outPath, JSON.stringify(finalPayload, null, 2))

  console.log(`\nTrace JSON written to: ${outPath}`)
}

main().catch(err => {
  console.error("\nFailed to export trace:\n", err)
  process.exit(1)
})
