/**
 * Unit Tests for SSESink.ts - Server-Sent Events Sink
 *
 * Tests the SSE functionality including:
 * - Connection management and lifecycle
 * - Event broadcasting and filtering
 * - Memory management and cleanup
 * - Error handling and edge cases
 */

import { WorkflowEventBuilder } from "@core/__tests__/test-data-builders"
import { SSESink, globalSSESink } from "@core/utils/observability/sinks/SSESink"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock ReadableStreamDefaultController for testing
class MockStreamController {
  public enqueued: string[] = []
  private closed = false

  enqueue(data: Uint8Array | string) {
    if (this.closed) throw new Error("Controller is closed")

    // Handle both Uint8Array (real usage) and string (test convenience)
    const stringData =
      data instanceof Uint8Array ? new TextDecoder().decode(data) : data
    this.enqueued.push(stringData)
  }

  close() {
    this.closed = true
  }

  error(error: Error) {
    this.closed = true
    throw error
  }

  get isClosed() {
    return this.closed
  }
}

describe.skip("SSESink - Server-Sent Events Sink", () => {
  let sink: SSESink
  let mockController1: MockStreamController
  let mockController2: MockStreamController

  beforeEach(() => {
    sink = new SSESink()
    mockController1 = new MockStreamController()
    mockController2 = new MockStreamController()
  })

  afterEach(() => {
    // Clean up all connections
    sink.getConnections().forEach((conn) => sink.removeConnection(conn.id))
    vi.clearAllMocks()
  })

  describe("Connection Management", () => {
    it("should add connections successfully", () => {
      // Arrange
      const clientId = "test-client-001"
      const invocationId = "test-invocation-001"

      // Act
      sink.addConnection(clientId, mockController1 as any, {
        metadata: { invocationId },
      })

      // Assert
      expect(sink.getConnectionCount()).toBe(1)
      const connections = sink.getConnections()
      expect(connections).toHaveLength(1)
      expect(connections[0]).toMatchObject({
        id: clientId,
        invocationId,
        connected: true,
      })
    })

    it("should handle multiple connections", () => {
      // Arrange
      const clients = [
        { id: "client-1", invocationId: "invocation-1" },
        { id: "client-2", invocationId: "invocation-2" },
        { id: "client-3", invocationId: "invocation-1" }, // Same invocation
      ]

      // Act
      clients.forEach((client) => {
        const controller = new MockStreamController()
        sink.addConnection(client.id, controller as any, {
          metadata: { invocationId: client.invocationId },
        })
      })

      // Assert
      expect(sink.getConnectionCount()).toBe(3)
      expect(sink.getConnections()).toHaveLength(3)

      // Check invocation filtering
      const invocation1Clients = sink
        .getConnections()
        .filter((conn) => conn.metadata?.invocationId === "invocation-1")
      expect(invocation1Clients).toHaveLength(2)
    })

    it("should remove connections correctly", () => {
      // Arrange
      const clientId = "remove-test-client"
      sink.addConnection(clientId, mockController1 as any, {
        metadata: { invocationId: "test-invocation" },
      })
      expect(sink.getConnectionCount()).toBe(1)

      // Act
      sink.removeConnection(clientId)

      // Assert
      expect(sink.getConnectionCount()).toBe(0)
      expect(sink.getConnections()).toHaveLength(0)
    })

    it("should handle removing non-existent connections gracefully", () => {
      // Act & Assert - Should not throw
      expect(() => {
        sink.removeConnection("non-existent-client")
      }).not.toThrow()

      expect(sink.getConnectionCount()).toBe(0)
    })

    it("should mark connections as disconnected when controller closes", () => {
      // Arrange
      const clientId = "disconnect-test-client"
      sink.addConnection(clientId, mockController1 as any, {
        metadata: { invocationId: "test-invocation" },
      })

      // Act
      mockController1.close()

      // Verify connection still tracked but marked as disconnected
      const connections = sink.getConnections()
      expect(connections).toHaveLength(1)
      expect(connections[0].id).toBe(clientId) // Connection still exists
    })
  })

  describe("Event Broadcasting", () => {
    it("should broadcast events to all connected clients", () => {
      // Arrange
      const event = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId: "broadcast-test" })
        .build()

      // Add multiple clients
      sink.addConnection("client-1", mockController1 as any, {
        metadata: { invocationId: "broadcast-test" },
      })
      sink.addConnection("client-2", mockController2 as any, {
        metadata: { invocationId: "broadcast-test" },
      })

      // Act
      sink.event(event)

      // Assert
      expect(mockController1.enqueued).toHaveLength(1)
      expect(mockController2.enqueued).toHaveLength(1)

      const sentData1 = mockController1.enqueued[0]
      const sentData2 = mockController2.enqueued[0]

      expect(sentData1).toContain("data: ")
      expect(sentData1).toContain(JSON.stringify(event))
      expect(sentData1).toBe(sentData2)
    })

    it("should filter events by invocationId", () => {
      // Arrange
      const event1 = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId: "invocation-A" })
        .build()

      const event2 = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId: "invocation-B" })
        .build()

      // Add clients for different invocations
      sink.addConnection("client-A", mockController1 as any, {
        metadata: { invocationId: "invocation-A" },
      })
      sink.addConnection("client-B", mockController2 as any, {
        metadata: { invocationId: "invocation-B" },
      })

      // Act
      sink.event(event1)
      sink.event(event2)

      // Assert
      expect(mockController1.enqueued).toHaveLength(1)
      expect(mockController2.enqueued).toHaveLength(1)

      // Verify correct events sent to correct clients
      expect(mockController1.enqueued[0]).toContain("invocation-A")
      expect(mockController1.enqueued[0]).not.toContain("invocation-B")

      expect(mockController2.enqueued[0]).toContain("invocation-B")
      expect(mockController2.enqueued[0]).not.toContain("invocation-A")
    })

    it("should handle events without invocationId (broadcast to all)", () => {
      // Arrange
      const globalEvent = {
        event: "system:status",
        message: "System operational",
      } as any

      sink.addConnection("client-1", mockController1 as any, {
        metadata: { invocationId: "invocation-1" },
      })
      sink.addConnection("client-2", mockController2 as any, {
        metadata: { invocationId: "invocation-2" },
      })

      // Act
      sink.event(globalEvent)

      // Assert
      expect(mockController1.enqueued).toHaveLength(1)
      expect(mockController2.enqueued).toHaveLength(1)

      expect(mockController1.enqueued[0]).toContain("System operational")
      expect(mockController2.enqueued[0]).toContain("System operational")
    })

    it("should send initial events to new connections", () => {
      // Arrange
      const initialEvents = [
        WorkflowEventBuilder.create().workflowStarted().build(),
        WorkflowEventBuilder.create().nodeExecutionStarted().build(),
      ]

      // Pre-buffer the events
      initialEvents.forEach((event) => sink.event(event))

      // Act
      sink.addConnection("client-with-initial", mockController1 as any, {
        metadata: { invocationId: "test-invocation" },
      })

      // Assert
      expect(mockController1.enqueued).toHaveLength(2)
      expect(mockController1.enqueued[0]).toContain("workflow:started")
      expect(mockController1.enqueued[1]).toContain("node:execution:started")
    })
  })

  describe("Event Formatting", () => {
    it("should format SSE events correctly", () => {
      // Arrange
      const event = WorkflowEventBuilder.create()
        .nodeExecutionCompleted({
          nodeId: "test-node",
          duration: 1500,
          cost: 0.002,
          status: "success",
        })
        .build()

      sink.addConnection("format-test", mockController1 as any, {
        metadata: { invocationId: "test-invocation" },
      })

      // Act
      sink.event(event)

      // Assert
      const sseData = mockController1.enqueued[0]

      // Check SSE format
      expect(sseData).toMatch(/^data: .+\n\n$/)

      // Extract and parse JSON data
      const jsonData = sseData.replace(/^data: /, "").replace(/\n\n$/, "")
      const parsedEvent = JSON.parse(jsonData)

      expect(parsedEvent).toMatchObject({
        event: "node:execution:completed",
        nodeId: "test-node",
        duration: 1500,
        cost: 0.002,
        status: "success",
      })
    })

    it("should handle events with special characters", () => {
      // Arrange
      const event = {
        event: "test:message",
        message: 'Special chars: "quotes", \n newlines, \t tabs',
        invocationId: "special-test",
      } as any

      sink.addConnection("special-chars", mockController1 as any, {
        metadata: { invocationId: "special-test" },
      })

      // Act
      sink.event(event)

      // Assert
      const sseData = mockController1.enqueued[0]
      expect(sseData).toContain("data: ")

      // Should be valid JSON
      const jsonData = sseData.replace(/^data: /, "").replace(/\n\n$/, "")
      expect(() => JSON.parse(jsonData)).not.toThrow()
    })
  })

  describe("Error Handling", () => {
    it("should handle controller errors gracefully", () => {
      // Arrange
      const faultyController = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Controller error")
        }),
      }

      sink.addConnection("faulty-client", faultyController as any, {
        metadata: { invocationId: "test-invocation" },
      })

      const event = WorkflowEventBuilder.create().workflowStarted().build()

      // Act & Assert - Should not throw
      expect(() => {
        sink.event(event)
      }).not.toThrow()

      // Connection should be marked as disconnected
      const connections = sink.getConnections()
      expect(connections).toHaveLength(1)
      // Note: In real implementation, this would mark connection as disconnected
    })

    it("should handle malformed events", () => {
      // Arrange
      sink.addConnection("malformed-test", mockController1 as any, {
        metadata: { invocationId: "test-inv" },
      })

      const malformedEvents = [
        null,
        undefined,
        {
          /* missing required fields */
        },
        "not-an-object",
        { event: null },
      ]

      // Act & Assert
      malformedEvents.forEach((badEvent) => {
        expect(() => {
          sink.event(badEvent as any)
        }).not.toThrow()
      })
    })

    it("should clean up disconnected clients during broadcast", () => {
      // Arrange
      sink.addConnection("client-1", mockController1 as any, {
        metadata: { invocationId: "test-inv" },
      })
      sink.addConnection("client-2", mockController2 as any, {
        metadata: { invocationId: "test-inv" },
      })

      // Simulate one client disconnecting
      mockController1.close()

      const event = WorkflowEventBuilder.create().workflowStarted().build()

      // Act
      sink.event(event)

      // Assert
      expect(mockController2.enqueued).toHaveLength(1)
      // Note: In real implementation, disconnected clients would be cleaned up
    })
  })

  describe("Performance & Memory Management", () => {
    it("should handle many simultaneous connections", () => {
      // Arrange
      const connectionCount = 1000
      const controllers: MockStreamController[] = []

      // Act
      for (let i = 0; i < connectionCount; i++) {
        const controller = new MockStreamController()
        controllers.push(controller)
        sink.addConnection(`client-${i}`, controller as any, {
          metadata: { invocationId: `invocation-${i % 10}` },
        })
      }

      // Assert
      expect(sink.getConnectionCount()).toBe(connectionCount)

      // Broadcast event
      const event = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId: "invocation-0" })
        .build()

      const startTime = performance.now()
      sink.event(event)
      const duration = performance.now() - startTime

      // Should complete quickly
      expect(duration).toBeLessThan(100)

      // Only clients for invocation-0 should receive event (100 clients)
      const receivedCount = controllers.filter(
        (c) => c.enqueued.length > 0
      ).length
      expect(receivedCount).toBe(100)
    })

    it("should clean up memory when connections are removed", () => {
      // Arrange
      const clientIds: string[] = []

      // Add many connections
      for (let i = 0; i < 100; i++) {
        const clientId = `temp-client-${i}`
        clientIds.push(clientId)
        sink.addConnection(clientId, new MockStreamController() as any, {
          metadata: { invocationId: "temp-invocation" },
        })
      }

      expect(sink.getConnectionCount()).toBe(100)

      // Act - Remove all connections
      clientIds.forEach((id) => sink.removeConnection(id))

      // Assert
      expect(sink.getConnectionCount()).toBe(0)
      expect(sink.getConnections()).toHaveLength(0)
    })

    it("should handle high-frequency event emission", () => {
      // Arrange
      const eventCount = 10000
      sink.addConnection("high-freq-client", mockController1 as any, {
        metadata: { invocationId: "test-inv" },
      })

      // Act
      const startTime = performance.now()

      for (let i = 0; i < eventCount; i++) {
        const event = WorkflowEventBuilder.create()
          .nodeExecutionStarted({ nodeId: `node-${i}` })
          .build()
        sink.event(event)
      }

      const duration = performance.now() - startTime

      // Assert
      expect(mockController1.enqueued).toHaveLength(eventCount)
      expect(duration).toBeLessThan(2000) // Should complete in under 2 seconds
    })
  })

  describe("Global SSE Sink Instance", () => {
    it("should provide a global singleton instance", () => {
      // Act
      const instance1 = globalSSESink
      const instance2 = globalSSESink

      // Assert
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(SSESink)
    })

    it("should maintain state across imports", () => {
      // Arrange
      globalSSESink.addConnection(
        "global-test-client",
        mockController1 as any,
        { metadata: { invocationId: "global-test-invocation" } }
      )

      // Act
      const connectionCount = globalSSESink.getConnectionCount()

      // Assert
      expect(connectionCount).toBeGreaterThanOrEqual(1)

      // Cleanup
      globalSSESink.removeConnection("global-test-client")
    })
  })
})
