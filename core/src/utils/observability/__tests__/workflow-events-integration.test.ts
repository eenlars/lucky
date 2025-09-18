/**
 * Integration Test - Real Workflow Event Emission
 *
 * Tests that workflow events actually flow through the observability system
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { obs, setSink } from "@core/utils/observability/obs"
import { SSESink } from "@core/utils/observability/sinks/SSESink"
import { WorkflowEventContext } from "@core/utils/observability/WorkflowEventContext"

// Simple test controller
class TestController {
  public messages: string[] = []

  enqueue(data: Uint8Array) {
    const message = new TextDecoder().decode(data)
    this.messages.push(message)
  }

  close() {}

  getEvents() {
    return this.messages.map((msg) => {
      // Parse SSE format: "data: {...}\n\n"
      const jsonStr = msg.replace(/^data: /, "").replace(/\n\n$/, "")
      return JSON.parse(jsonStr)
    })
  }
}

describe("Workflow Events Integration", () => {
  let sseSink: SSESink
  let controller: TestController

  beforeEach(() => {
    sseSink = new SSESink()
    setSink(sseSink)
    controller = new TestController()
  })

  afterEach(() => {
    // Clean up
    sseSink.destroy()
  })

  it("should emit workflow events through obs system", async () => {
    // Arrange
    sseSink.addConnection("test-client", controller as any, {})

    const testContext = {
      wfId: "test-workflow",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation",
    }

    // Act - Emit events within workflow scope
    await obs.scope(testContext, async () => {
      const eventContext = new WorkflowEventContext(testContext)

      eventContext.workflowStarted({
        nodeCount: 2,
        entryNodeId: "start",
        goal: "Integration test",
      })

      eventContext.nodeExecutionStarted({
        nodeId: "test-node",
        nodeType: "test-type",
        attempt: 1,
      })

      eventContext.nodeExecutionCompleted({
        nodeId: "test-node",
        nodeType: "test-type",
        duration: 100,
        cost: 0.001,
        status: "success",
      })

      eventContext.workflowCompleted({
        duration: 200,
        totalCost: 0.001,
        nodeInvocations: 1,
        status: "success",
      })
    })

    // Assert
    expect(controller.messages.length).toBe(4)

    const events = controller.getEvents()

    // Check workflow started
    expect(events[0]).toMatchObject({
      event: "workflow:started",
      wfId: "test-workflow",
      invocationId: "test-invocation",
      nodeCount: 2,
      goal: "Integration test",
    })

    // Check node execution started
    expect(events[1]).toMatchObject({
      event: "node:execution:started",
      nodeId: "test-node",
      nodeType: "test-type",
      attempt: 1,
    })

    // Check node execution completed
    expect(events[2]).toMatchObject({
      event: "node:execution:completed",
      nodeId: "test-node",
      status: "success",
      duration: 100,
    })

    // Check workflow completed
    expect(events[3]).toMatchObject({
      event: "workflow:completed",
      status: "success",
      nodeInvocations: 1,
    })
  })

  it("should maintain context correlation across events", async () => {
    // Arrange
    sseSink.addConnection("test-client", controller as any, {})

    const testContext = {
      wfId: "context-test",
      wfVersionId: "v1.0.0",
      invocationId: "context-invocation",
    }

    // Act
    await obs.scope(testContext, async () => {
      const eventContext = new WorkflowEventContext(testContext)

      // Emit events in nested node context
      await eventContext.withNodeContext("nested-node", async () => {
        eventContext.nodeExecutionStarted({
          nodeId: "nested-node",
          nodeType: "nested-type",
          attempt: 1,
        })

        // Verify context is available
        const currentContext = obs.getWorkflowContext()
        expect(currentContext?.nodeId).toBe("nested-node")
        expect(currentContext?.wfId).toBe("context-test")
      })
    })

    // Assert
    const events = controller.getEvents()
    expect(events.length).toBe(1)

    // All events should have consistent workflow context
    events.forEach((event) => {
      expect(event.wfId).toBe("context-test")
      expect(event.invocationId).toBe("context-invocation")
    })
  })

  it("should handle multiple concurrent workflows", async () => {
    // Arrange
    sseSink.addConnection("test-client", controller as any, {})

    // Act - Run multiple workflows concurrently
    const workflow1Promise = obs.scope(
      {
        wfId: "workflow-1",
        invocationId: "invocation-1",
      },
      async () => {
        const eventContext = new WorkflowEventContext({
          wfId: "workflow-1",
          wfVersionId: "v1.0.0",
          invocationId: "invocation-1",
        })

        eventContext.workflowStarted({
          nodeCount: 1,
          entryNodeId: "start-1",
          goal: "Workflow 1",
        })
      }
    )

    const workflow2Promise = obs.scope(
      {
        wfId: "workflow-2",
        invocationId: "invocation-2",
      },
      async () => {
        const eventContext = new WorkflowEventContext({
          wfId: "workflow-2",
          wfVersionId: "v1.0.0",
          invocationId: "invocation-2",
        })

        eventContext.workflowStarted({
          nodeCount: 1,
          entryNodeId: "start-2",
          goal: "Workflow 2",
        })
      }
    )

    await Promise.all([workflow1Promise, workflow2Promise])

    // Assert
    const events = controller.getEvents()
    expect(events.length).toBe(2)

    const workflow1Events = events.filter((e) => e.wfId === "workflow-1")
    const workflow2Events = events.filter((e) => e.wfId === "workflow-2")

    expect(workflow1Events).toHaveLength(1)
    expect(workflow2Events).toHaveLength(1)

    expect(workflow1Events[0].goal).toBe("Workflow 1")
    expect(workflow2Events[0].goal).toBe("Workflow 2")
  })
})
