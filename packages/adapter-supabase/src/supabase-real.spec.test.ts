import type { IPersistence } from "@lucky/adapter-supabase"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  build,
  cleanupTestRun,
  createNodeVersion,
  createRealPersistence,
  getMessage,
  getNodeInvocation,
} from "./__tests__/test-utils"

describe("Supabase Adapter - REAL Integration Tests", () => {
  let p: IPersistence

  beforeEach(() => {
    p = createRealPersistence()
  })

  afterEach(async () => {
    await cleanupTestRun()
  })

  it("REAL: workflow version + invocation lifecycle", async () => {
    const wfv = build.wfVersion()
    const wfvId = wfv.wf_version_id!
    const workflowId = wfv.workflow_id!

    // Create workflow in REAL Supabase
    await p.ensureWorkflowExists(workflowId, "test")

    // Create workflow version in REAL Supabase
    await p.createWorkflowVersion(wfv)

    // Verify version exists via persistence query
    expect(await p.workflowVersionExists(wfvId)).toBe(true)

    // Verify retrievable from database
    const retrieved = await p.getWorkflowVersion(wfvId)
    expect(retrieved).toBeDefined()

    // Create invocation
    const wfi = build.wfInvocation(wfvId)
    await p.createWorkflowInvocation(wfi as any)

    // Load config (verifies relationship)
    const config = await p.loadWorkflowConfig(wfvId)
    expect(config).toBeDefined()
  })

  it("REAL: node execution from start to completion", async () => {
    // Setup: Create workflow + version
    const wfv = build.wfVersion()
    const wfvId = wfv.wf_version_id!
    await p.ensureWorkflowExists(wfv.workflow_id!, "test")
    await p.createWorkflowVersion(wfv)

    // Setup: Create invocation
    const wfi = build.wfInvocation(wfvId)
    const wfiId = wfi.wf_invocation_id!
    await p.createWorkflowInvocation(wfi as any)

    // Setup: Create node version (required FK for NodeInvocation)
    const nv = build.nodeVersion(wfvId)
    const nvId = await createNodeVersion(nv)

    // Act: Start node execution in REAL Supabase
    const nodeStart = build.nodeStart(wfvId, wfiId, nvId)
    const { nodeInvocationId } = await p.nodes.createNodeInvocationStart(nodeStart)

    // Verify: Node is in running state
    const started = await getNodeInvocation(nodeInvocationId)
    expect(started.status).toBe("running")
    expect(started.start_time).toBeDefined()

    // Act: Complete node execution with output
    const nodeEnd = build.nodeEnd(nodeInvocationId, { value: 42 })
    await p.nodes.updateNodeInvocationEnd(nodeEnd)

    // Verify: Node is completed with output and timing
    const completed = await getNodeInvocation(nodeInvocationId)
    expect(completed.status).toBe("completed")
    expect(completed.output.value).toBe(42)
    expect(completed.end_time).toBeDefined()
    expect(new Date(completed.end_time).getTime()).toBeGreaterThanOrEqual(new Date(completed.start_time).getTime())
  })

  it("REAL: message routing between nodes", async () => {
    // Setup: Create workflow + invocation
    const wfv = build.wfVersion()
    const wfvId = wfv.wf_version_id!
    await p.ensureWorkflowExists(wfv.workflow_id!, "test")
    await p.createWorkflowVersion(wfv)

    const wfi = build.wfInvocation(wfvId)
    const wfiId = wfi.wf_invocation_id!
    await p.createWorkflowInvocation(wfi as any)

    // Act: Create message A → B in REAL Supabase
    const msg1 = build.message(wfiId, "nodeA", "nodeB")
    await p.messages.save(msg1)

    // Verify: Message persisted with correct routing
    const saved = await getMessage(msg1.messageId)
    expect(saved.from_node_id).toBe("nodeA")
    expect(saved.to_node_id).toBe("nodeB")
    expect(saved.wf_invocation_id).toBe(wfiId)
    expect(saved.seq).toBe(1)

    // Act: Update message status
    await p.messages.update(msg1.messageId, {
      messageId: msg1.messageId,
      role: "result",
    })

    // Verify: Update persisted in database
    const updated = await getMessage(msg1.messageId)
    expect(updated.role).toBe("result")

    // Act: Create response message B → A in same invocation
    const msg2 = build.message(wfiId, "nodeB", "nodeA")
    await p.messages.save(msg2)

    // Verify: Response message with correct seq (sequence per invocation)
    const response = await getMessage(msg2.messageId)
    expect(response.from_node_id).toBe("nodeB")
    expect(response.to_node_id).toBe("nodeA")
    expect(response.wf_invocation_id).toBe(wfiId)
    expect(response.seq).toBe(2)
  })
})
