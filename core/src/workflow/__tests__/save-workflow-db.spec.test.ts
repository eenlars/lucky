import { describe, expect, it } from "vitest"

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

// Minimal integration test: verify that a one-node workflow persists to the database
// Reuses existing persistence helpers to avoid new code paths
describe("Workflow DB integration - single node persistence", () => {
  it("should persist WorkflowVersion and NodeVersion for a one-node workflow", async () => {
    const [
      { ensureWorkflowExists, createWorkflowVersion },
      { saveNodeVersionToDB },
      { supabase },
      { getDefaultModels },
    ] = await Promise.all([
      import("@core/utils/persistence/workflow/registerWorkflow"),
      import("@core/utils/persistence/node/saveNode"),
      import("@core/utils/clients/supabase/client"),
      import("@runtime/settings/models"),
    ])

    // Unique identifiers per test run to avoid collisions
    const uniqueSuffix = Date.now().toString()
    const workflowId = `int-test-save-1node-${uniqueSuffix}`
    const workflowVersionId = `wf_ver_${uniqueSuffix}`

    // Minimal one-node workflow config
    const nodeId = "node-1"
    const config: WorkflowConfig = {
      nodes: [
        {
          nodeId,
          description: "Single-node workflow for DB persistence test",
          systemPrompt: "Return the word 'ok' and do nothing else.",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          waitingFor: [],
        },
      ],
      entryNodeId: nodeId,
    }

    // Create Workflow and WorkflowVersion
    await ensureWorkflowExists("Integration test: single-node workflow", workflowId)
    await createWorkflowVersion({
      workflowVersionId,
      workflowConfig: config,
      commitMessage: "single-node-db-persist",
      workflowId,
    })

    // Persist NodeVersion for the single node
    await saveNodeVersionToDB({ config: config.nodes[0], workflowVersionId })

    // Assert WorkflowVersion exists with correct DSL
    const { data: wfVersionRow, error: wfVersionError } = await supabase
      .from("WorkflowVersion")
      .select("wf_version_id, dsl")
      .eq("wf_version_id", workflowVersionId)
      .single()

    expect(wfVersionError).toBeNull()
    expect(wfVersionRow?.wf_version_id).toBe(workflowVersionId)
    const dsl = wfVersionRow?.dsl as unknown as WorkflowConfig
    expect(Array.isArray(dsl?.nodes)).toBe(true)
    expect(dsl.nodes.length).toBe(1)
    expect(dsl.nodes[0]?.nodeId).toBe(nodeId)

    // Assert NodeVersion exists for the persisted node and workflow version
    const { data: nodeRows, error: nodeError } = await supabase
      .from("NodeVersion")
      .select("node_id, wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .eq("node_id", nodeId)

    expect(nodeError).toBeNull()
    expect(nodeRows).toBeDefined()
    expect((nodeRows ?? []).length).toBeGreaterThan(0)

    // Optional cleanup (best-effort; ignore errors)
    // Order matters due to FKs: NodeVersion -> WorkflowVersion -> Workflow
    await supabase.from("NodeVersion").delete().eq("wf_version_id", workflowVersionId).eq("node_id", nodeId)
    await supabase.from("WorkflowVersion").delete().eq("wf_version_id", workflowVersionId)
    await supabase.from("Workflow").delete().eq("wf_id", workflowId)
  }, 60_000)
})
