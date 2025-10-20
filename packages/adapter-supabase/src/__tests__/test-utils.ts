import { type IPersistence, createPersistence } from "@lucky/adapter-supabase"
import type { Tables, TablesInsert } from "@lucky/shared"
import { getSupabaseClient } from "../client"

const testRunId = Date.now()
const wfiMessageSeqMap = new Map<string, number>()

function id(prefix: string): string {
  return `${prefix}_${testRunId}_${Math.random().toString(36).substring(2, 8)}`
}

function getNextSeq(wfiId: string): number {
  const current = wfiMessageSeqMap.get(wfiId) || 0
  const next = current + 1
  wfiMessageSeqMap.set(wfiId, next)
  return next
}

/** Create REAL Supabase persistence instance (throws if credentials missing) */
export function createRealPersistence(): IPersistence {
  return createPersistence({ backend: "supabase" })
}

/**
 * Test data builders - Minimal factories for REAL test data
 * Each builder returns database-ready records with sensible defaults
 */
export const build = {
  wfVersion: (overrides?: Partial<TablesInsert<"WorkflowVersion">>): TablesInsert<"WorkflowVersion"> => ({
    wf_version_id: id("wfv"),
    workflow_id: id("wf"),
    commit_message: `Test: ${testRunId}`,
    dsl: {},
    input_schema: {},
    operation: "init",
    ...overrides,
  }),

  nodeVersion: (wfvId: string, overrides?: Partial<TablesInsert<"NodeVersion">>): TablesInsert<"NodeVersion"> => ({
    node_version_id: id("nv"),
    node_id: id("node"),
    wf_version_id: wfvId,
    system_prompt: "Test",
    llm_model: "claude-3-5-sonnet-20241022",
    tools: [],
    extras: {},
    version: 1,
    ...overrides,
  }),

  wfInvocation: (
    wfvId: string,
    overrides?: Partial<TablesInsert<"WorkflowInvocation">>,
  ): TablesInsert<"WorkflowInvocation"> => ({
    wf_invocation_id: id("wfi"),
    wf_version_id: wfvId,
    start_time: new Date().toISOString(),
    status: "running",
    usd_cost: 0,
    ...overrides,
  }),

  nodeStart: (wfvId: string, wfiId: string, nvId?: string) => ({
    nodeId: id("node"),
    nodeVersionId: nvId || id("nv"),
    workflowVersionId: wfvId,
    workflowInvocationId: wfiId,
    startTime: new Date().toISOString(),
    model: "claude-3-5-sonnet-20241022",
  }),

  nodeEnd: (niId: string, output: any = { result: "ok" }) => ({
    nodeInvocationId: niId,
    endTime: new Date().toISOString(),
    status: "completed" as const,
    output,
    summary: "Done",
    usdCost: 0.01,
  }),

  message: (wfiId: string, from?: string, to?: string) => ({
    messageId: id("msg"),
    workflowInvocationId: wfiId,
    fromNodeId: from,
    toNodeId: to,
    seq: getNextSeq(wfiId),
    role: "delegation" as const,
    payload: { ok: true } as any,
    createdAt: new Date().toISOString(),
  }),
}

/** Insert NodeVersion into REAL Supabase database */
export async function createNodeVersion(nv: TablesInsert<"NodeVersion">): Promise<string> {
  const client = getSupabaseClient()
  const { data, error } = await client.from("NodeVersion").insert(nv).select("node_version_id").single()
  if (error) throw new Error(`NodeVersion: ${error.message}`)
  return data!.node_version_id
}

/** Delete all test data created by this test run (pattern-based cleanup) */
export async function cleanupTestRun(): Promise<void> {
  const client = getSupabaseClient()
  try {
    // Delete in FK constraint order to avoid foreign key violations
    await client.from("Message").delete().ilike("wf_invocation_id", `%${testRunId}%`)
    await client.from("NodeInvocation").delete().ilike("wf_version_id", `%${testRunId}%`)
    await client.from("NodeVersion").delete().ilike("node_id", `%${testRunId}%`)
    await client.from("WorkflowInvocation").delete().ilike("wf_version_id", `%${testRunId}%`)
    await client.from("WorkflowVersion").delete().ilike("workflow_id", `%${testRunId}%`)
  } catch (error) {
    console.warn("Cleanup warning:", error)
  }
}

/** Retrieve NodeInvocation from REAL Supabase database */
export async function getNodeInvocation(id: string) {
  const { data } = await getSupabaseClient().from("NodeInvocation").select("*").eq("node_invocation_id", id).single()
  return data
}

/** Retrieve Message from REAL Supabase database */
export async function getMessage(id: string) {
  const { data } = await getSupabaseClient().from("Message").select("*").eq("msg_id", id).single()
  return data
}
