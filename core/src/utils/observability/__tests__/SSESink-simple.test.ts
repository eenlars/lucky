/**
 * Simple SSESink Test - Basic functionality verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { SSESink } from "@core/utils/observability/sinks/SSESink"

// Simple mock controller
class TestController {
  public messages: Uint8Array[] = []
  public closed = false

  enqueue(data: Uint8Array) {
    if (!this.closed) {
      this.messages.push(data)
    }
  }

  close() {
    this.closed = true
  }

  getLastMessage(): string | null {
    if (this.messages.length === 0) return null
    const lastMessage = this.messages[this.messages.length - 1]
    return new TextDecoder().decode(lastMessage)
  }
}

describe("SSESink - Simple Test", () => {
  let sink: SSESink
  let controller: TestController

  beforeEach(() => {
    sink = new SSESink()
    controller = new TestController()
  })

  afterEach(() => {
    // Clean up connections
    sink.getConnections().forEach((conn) => sink.removeConnection(conn.id))
  })

  it("should add and remove connections", () => {
    // Act
    sink.addConnection("test-client", controller as any, {})

    // Assert
    expect(sink.getConnectionCount()).toBe(1)

    // Remove
    sink.removeConnection("test-client")
    expect(sink.getConnectionCount()).toBe(0)
  })

  it("should broadcast simple events", () => {
    // Arrange
    sink.addConnection("test-client", controller as any, {})

    const testEvent = { event: "test:simple", message: "hello" }

    // Act
    sink.event(testEvent)

    // Assert
    expect(controller.messages.length).toBe(1)
    const message = controller.getLastMessage()
    expect(message).toContain("test:simple")
    expect(message).toContain("hello")
  })

  it("should handle no connections gracefully", () => {
    // Act & Assert - Should not throw
    expect(() => {
      sink.event({ event: "test:orphan", message: "no listeners" })
    }).not.toThrow()
  })
})
