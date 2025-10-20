import type { AgentEvent } from "@lucky/shared"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AgentObserver } from "../AgentObserver"
import { ObserverRegistry } from "../ObserverRegistry"

describe("AgentObserver", () => {
  let observer: AgentObserver

  beforeEach(() => {
    observer = new AgentObserver()
  })

  afterEach(() => {
    observer.dispose()
  })

  it("should buffer events in ring buffer", () => {
    const event1: AgentEvent = {
      type: "agent.start",
      nodeId: "n1",
      nodeName: "Test Node",
      timestamp: Date.now(),
    }

    const event2: AgentEvent = {
      type: "agent.end",
      nodeId: "n1",
      duration: 1000,
      cost: 0.01,
      timestamp: Date.now(),
    }

    observer.emit(event1)
    observer.emit(event2)

    const buffered = observer.getEvents()
    expect(buffered).toHaveLength(2)
    expect(buffered[0]).toEqual(event1)
    expect(buffered[1]).toEqual(event2)
  })

  it("should notify subscribers when events are emitted", () => {
    const events: AgentEvent[] = []

    const unsubscribe = observer.subscribe(event => {
      events.push(event)
    })

    observer.emit({
      type: "agent.start",
      nodeId: "n1",
      nodeName: "Test",
      timestamp: Date.now(),
    })

    observer.emit({
      type: "agent.end",
      nodeId: "n1",
      duration: 500,
      cost: 0.005,
      timestamp: Date.now(),
    })

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe("agent.start")
    expect(events[1].type).toBe("agent.end")

    unsubscribe()
  })

  it("should allow unsubscribe", () => {
    const events: AgentEvent[] = []

    const unsubscribe = observer.subscribe(event => {
      events.push(event)
    })

    observer.emit({
      type: "agent.start",
      nodeId: "n1",
      nodeName: "Test",
      timestamp: Date.now(),
    })

    unsubscribe()

    observer.emit({
      type: "agent.end",
      nodeId: "n1",
      duration: 500,
      cost: 0.005,
      timestamp: Date.now(),
    })

    // Only first event should be received
    expect(events).toHaveLength(1)
  })

  it("should enforce ring buffer max size", () => {
    // Emit 1100 events (max is 1000)
    for (let i = 0; i < 1100; i++) {
      observer.emit({
        type: "agent.start",
        nodeId: `n${i}`,
        nodeName: `Node ${i}`,
        timestamp: Date.now() + i,
      })
    }

    const buffered = observer.getEvents()
    expect(buffered).toHaveLength(1000)

    // First 100 should be dropped, so first event should be n100
    expect(buffered[0].nodeId).toBe("n100")
    expect(buffered[999].nodeId).toBe("n1099")
  })

  it("should filter events by timestamp", () => {
    const now = Date.now()

    observer.emit({
      type: "agent.start",
      nodeId: "n1",
      nodeName: "Node 1",
      timestamp: now,
    })

    observer.emit({
      type: "agent.start",
      nodeId: "n2",
      nodeName: "Node 2",
      timestamp: now + 1000,
    })

    observer.emit({
      type: "agent.start",
      nodeId: "n3",
      nodeName: "Node 3",
      timestamp: now + 2000,
    })

    const filtered = observer.getEvents(now + 500)
    expect(filtered).toHaveLength(2)
    expect(filtered[0].nodeId).toBe("n2")
    expect(filtered[1].nodeId).toBe("n3")
  })

  it("should not emit after disposal", () => {
    const events: AgentEvent[] = []

    observer.subscribe(event => {
      events.push(event)
    })

    observer.emit({
      type: "agent.start",
      nodeId: "n1",
      nodeName: "Test",
      timestamp: Date.now(),
    })

    observer.dispose()

    observer.emit({
      type: "agent.end",
      nodeId: "n1",
      duration: 500,
      cost: 0.005,
      timestamp: Date.now(),
    })

    // Only first event should be received
    expect(events).toHaveLength(1)
    expect(observer.isActiveObserver()).toBe(false)
  })

  it("should handle tool events", () => {
    const toolStart: AgentEvent = {
      type: "agent.tool.start",
      nodeId: "n1",
      toolName: "web_search",
      args: { query: "test" },
      timestamp: Date.now(),
    }

    const toolEnd: AgentEvent = {
      type: "agent.tool.end",
      nodeId: "n1",
      toolName: "web_search",
      duration: 1500,
      timestamp: Date.now(),
    }

    observer.emit(toolStart)
    observer.emit(toolEnd)

    const events = observer.getEvents()
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe("agent.tool.start")
    expect(events[1].type).toBe("agent.tool.end")
  })

  it("should handle error events", () => {
    const errorEvent: AgentEvent = {
      type: "agent.error",
      nodeId: "n1",
      error: "Something went wrong",
      stack: "Error stack trace",
      timestamp: Date.now(),
    }

    observer.emit(errorEvent)

    const events = observer.getEvents()
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("agent.error")
    expect((events[0] as any).error).toBe("Something went wrong")
  })
})

describe("ObserverRegistry", () => {
  let registry: ObserverRegistry

  beforeEach(() => {
    registry = ObserverRegistry.getInstance()
    // Clear all observers
    for (const id of registry.getActiveIds()) {
      registry.dispose(id)
    }
  })

  it("should register and retrieve observers", () => {
    const observer = new AgentObserver()
    const randomId = "test-123"

    registry.register(randomId, observer)

    expect(registry.get(randomId)).toBe(observer)
    expect(registry.getActiveCount()).toBe(1)
    expect(registry.getActiveIds()).toContain(randomId)
  })

  it("should dispose observers", () => {
    const observer = new AgentObserver()
    const randomId = "test-456"

    registry.register(randomId, observer)
    expect(registry.get(randomId)).toBe(observer)

    registry.dispose(randomId)

    expect(registry.get(randomId)).toBeUndefined()
    expect(registry.getActiveCount()).toBe(0)
  })

  it("should handle multiple observers", () => {
    const observer1 = new AgentObserver()
    const observer2 = new AgentObserver()
    const observer3 = new AgentObserver()

    registry.register("id1", observer1)
    registry.register("id2", observer2)
    registry.register("id3", observer3)

    expect(registry.getActiveCount()).toBe(3)
    expect(registry.get("id1")).toBe(observer1)
    expect(registry.get("id2")).toBe(observer2)
    expect(registry.get("id3")).toBe(observer3)

    registry.dispose("id2")
    expect(registry.getActiveCount()).toBe(2)
    expect(registry.get("id2")).toBeUndefined()
  })

  it("should return undefined for non-existent observer", () => {
    expect(registry.get("non-existent")).toBeUndefined()
  })

  it("should be a singleton", () => {
    const instance1 = ObserverRegistry.getInstance()
    const instance2 = ObserverRegistry.getInstance()

    expect(instance1).toBe(instance2)
  })
})
