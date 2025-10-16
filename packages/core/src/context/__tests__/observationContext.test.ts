import { describe, expect, it } from "vitest"
import { AgentObserver } from "../../utils/observability/AgentObserver"
import { ObserverRegistry } from "../../utils/observability/ObserverRegistry"
import {
  emitAgentEnd,
  emitAgentError,
  emitAgentStart,
  emitAgentToolEnd,
  emitAgentToolStart,
} from "../../utils/observability/agentEvents"
import { getObservationContext, withObservationContext } from "../observationContext"

describe("ObservationContext Integration", () => {
  it("should provide observation context within async scope", async () => {
    const randomId = "test-random-id"
    const observer = new AgentObserver()
    const events: any[] = []

    observer.subscribe((event) => {
      events.push(event)
    })

    await withObservationContext({ randomId, observer }, async () => {
      const ctx = getObservationContext()

      expect(ctx).toBeDefined()
      expect(ctx?.randomId).toBe(randomId)
      expect(ctx?.observer).toBe(observer)
    })
  })

  it("should emit events from within observation context", async () => {
    const randomId = "workflow-123"
    const observer = new AgentObserver()
    const events: any[] = []

    observer.subscribe((event) => {
      events.push(event)
    })

    await withObservationContext({ randomId, observer }, async () => {
      // Emit events using helper functions
      emitAgentStart("node1", "Test Node")
      emitAgentToolStart("node1", "web_search", { query: "test" })
      emitAgentToolEnd("node1", "web_search", 1500)
      emitAgentEnd("node1", 2000, 0.01)
    })

    // Verify all events were captured
    expect(events).toHaveLength(4)
    expect(events[0].type).toBe("agent.start")
    expect(events[1].type).toBe("agent.tool.start")
    expect(events[2].type).toBe("agent.tool.end")
    expect(events[3].type).toBe("agent.end")
  })

  it("should handle errors gracefully", async () => {
    const randomId = "workflow-error"
    const observer = new AgentObserver()
    const events: any[] = []

    observer.subscribe((event) => {
      events.push(event)
    })

    await withObservationContext({ randomId, observer }, async () => {
      emitAgentStart("node1", "Failing Node")

      try {
        throw new Error("Something went wrong")
      } catch (error) {
        emitAgentError("node1", error as Error)
      }
    })

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe("agent.start")
    expect(events[1].type).toBe("agent.error")
    expect(events[1].error).toBe("Something went wrong")
  })

  it("should work with ObserverRegistry", async () => {
    const registry = ObserverRegistry.getInstance()
    const randomId = "registry-test"
    const observer = new AgentObserver()

    // Register observer
    registry.register(randomId, observer)

    const events: any[] = []
    observer.subscribe((event) => {
      events.push(event)
    })

    // Emit events within context
    await withObservationContext({ randomId, observer }, async () => {
      emitAgentStart("node1", "Registry Test")
      emitAgentEnd("node1", 500, 0.005)
    })

    // Retrieve observer from registry
    const retrieved = registry.get(randomId)
    expect(retrieved).toBe(observer)
    expect(retrieved?.getEvents()).toHaveLength(2)

    // Cleanup
    registry.dispose(randomId)
    expect(registry.get(randomId)).toBeUndefined()
  })

  it("should not emit events outside observation context", async () => {
    const observer = new AgentObserver()
    const events: any[] = []

    observer.subscribe((event) => {
      events.push(event)
    })

    // Try to emit without context
    emitAgentStart("node1", "No Context")

    // Should not receive any events
    expect(events).toHaveLength(0)
  })

  it("should isolate contexts for concurrent workflows", async () => {
    const observer1 = new AgentObserver()
    const observer2 = new AgentObserver()
    const events1: any[] = []
    const events2: any[] = []

    observer1.subscribe((event) => events1.push(event))
    observer2.subscribe((event) => events2.push(event))

    // Run two workflows concurrently
    await Promise.all([
      withObservationContext({ randomId: "wf1", observer: observer1 }, async () => {
        emitAgentStart("node1", "Workflow 1")
        await new Promise((resolve) => setTimeout(resolve, 10))
        emitAgentEnd("node1", 100, 0.001)
      }),
      withObservationContext({ randomId: "wf2", observer: observer2 }, async () => {
        emitAgentStart("node2", "Workflow 2")
        await new Promise((resolve) => setTimeout(resolve, 5))
        emitAgentEnd("node2", 50, 0.0005)
      }),
    ])

    // Each workflow should only see its own events
    expect(events1).toHaveLength(2)
    expect(events2).toHaveLength(2)
    expect(events1[0].nodeId).toBe("node1")
    expect(events2[0].nodeId).toBe("node2")
  })
})
