/**
 * Unit Tests for obs.ts - Core Observability Module
 *
 * Tests the fundamental observability functionality including:
 * - Event emission and sink management
 * - AsyncLocalStorage context management
 * - Context scoping and retrieval
 * - WorkflowEvent type safety
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  obs,
  setSink,
  MemorySink,
  StdoutSink,
  TeeSink,
  withSpan,
} from "@core/utils/observability/obs"
import type { Sink } from "@core/utils/observability/obs"
import {
  WorkflowEventBuilder,
  ContextBuilder,
  AsyncTestUtils,
} from "@core/__tests__/test-data-builders"

describe("obs - Core Observability Module", () => {
  let memorySink: MemorySink
  let mockSink: Sink

  beforeEach(() => {
    // Reset to clean state
    memorySink = new MemorySink()
    setSink(memorySink)

    // Create mock sink for verification
    mockSink = {
      event: vi.fn(),
    }
  })

  afterEach(() => {
    // Clean up any pending async operations
    vi.clearAllMocks()
  })

  describe("Event Emission", () => {
    it("should emit events to the configured sink", () => {
      // Arrange
      setSink(mockSink)
      const testEvent = { key: "test-value", timestamp: Date.now() }

      // Act
      obs.event("test-event", testEvent)

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "test-event",
          key: "test-value",
          timestamp: testEvent.timestamp,
        })
      )
    })

    it("should emit events with context when in scope", async () => {
      // Arrange
      setSink(mockSink)
      const context = ContextBuilder.create().withWorkflowContext().build()
      const testEvent = { action: "test-action" }

      // Act
      await obs.scope(context, () => {
        obs.event("scoped-event", testEvent)
      })

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "scoped-event",
          action: "test-action",
          wfId: expect.any(String),
          invocationId: expect.any(String),
        })
      )
    })

    it("should emit events without context when outside scope", () => {
      // Arrange
      setSink(mockSink)
      const testEvent = { action: "unscoped-action" }

      // Act
      obs.event("unscoped-event", testEvent)

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith({
        name: "unscoped-event",
        attrs: testEvent,
      })
      expect((mockSink.event as any).mock.calls[0][0].ctx).toBeUndefined()
    })
  })

  describe("WorkflowEvent Emission", () => {
    it("should emit typed workflow events correctly", () => {
      // Arrange
      setSink(mockSink)
      const workflowEvent = WorkflowEventBuilder.create()
        .workflowStarted()
        .build()

      // Act
      obs.workflowEvent(workflowEvent)

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "workflow:started",
        })
      )
    })

    it("should emit node execution events with proper structure", () => {
      // Arrange
      setSink(mockSink)
      const nodeEvent = WorkflowEventBuilder.create()
        .nodeExecutionStarted({ nodeId: "test-node-123" })
        .build()

      // Act
      obs.workflowEvent(nodeEvent)

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        "node:execution:started",
        expect.objectContaining({
          event: "node:execution:started",
          nodeId: "test-node-123",
          wfId: "test-workflow-001",
          invocationId: "test-invocation-001",
        })
      )
    })

    it("should handle workflow completion events", () => {
      // Arrange
      setSink(mockSink)
      const completionEvent = WorkflowEventBuilder.create()
        .workflowCompleted({
          status: "success",
          duration: 5000,
          totalCost: 0.05,
        })
        .build()

      // Act
      obs.workflowEvent(completionEvent)

      // Assert
      expect(mockSink.event).toHaveBeenCalledWith(
        undefined,
        "workflow:completed",
        expect.objectContaining({
          event: "workflow:completed",
          status: "success",
          duration: 5000,
          totalCost: 0.05,
        })
      )
    })
  })

  describe("Context Management (AsyncLocalStorage)", () => {
    it("should maintain context within scope", async () => {
      // Arrange
      const context = ContextBuilder.create()
        .withWorkflowContext({
          wfId: "scope-test-workflow",
          invocationId: "scope-test-invocation",
        })
        .build()

      // Act & Assert
      await obs.scope(context, () => {
        const retrievedContext = obs.getWorkflowContext()
        expect(retrievedContext).toEqual(context)

        const workflowContext = obs.getWorkflowContext()
        expect(workflowContext).toEqual({
          wfId: "scope-test-workflow",
          wfVersionId: "v1.0.0",
          invocationId: "scope-test-invocation",
          nodeId: undefined,
        })
      })
    })

    it("should maintain nested context scopes correctly", async () => {
      // Arrange
      const outerContext = ContextBuilder.create()
        .withWorkflowContext({ wfId: "outer-workflow" })
        .build()
      const innerContext = ContextBuilder.create()
        .withNodeContext("inner-node", { wfId: "outer-workflow" })
        .build()

      // Act & Assert
      await obs.scope(outerContext, async () => {
        const outerRetrieved = obs.getWorkflowContext()
        expect(outerRetrieved?.wfId).toBe("outer-workflow")
        expect(outerRetrieved?.nodeId).toBeUndefined()

        await obs.scope({ nodeId: "inner-node" }, () => {
          const innerRetrieved = obs.getWorkflowContext()
          expect(innerRetrieved?.wfId).toBe("outer-workflow")
          expect(innerRetrieved?.nodeId).toBe("inner-node")
        })

        // Verify outer context restored
        const restoredOuter = obs.getWorkflowContext()
        expect(restoredOuter?.wfId).toBe("outer-workflow")
        expect(restoredOuter?.nodeId).toBeUndefined()
      })
    })

    it("should handle async operations within scope", async () => {
      // Arrange
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId: "async-test-invocation" })
        .build()

      // Act & Assert
      await obs.scope(context, async () => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10))

        const retrievedContext = obs.getWorkflowContext()
        expect(retrievedContext?.invocationId).toBe("async-test-invocation")

        // Emit event during async operation
        obs.event("async-event", { step: "middle" })
        expect(mockSink.event).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "async-event",
            ctx: expect.objectContaining({
              invocationId: "async-test-invocation",
            }),
          })
        )
      })
    })

    it("should return undefined context when outside scope", () => {
      // Act
      const context = obs.getWorkflowContext()
      const workflowContext = obs.getWorkflowContext()

      // Assert
      expect(context.wfId).toBeUndefined()
      expect(context.wfVersionId).toBeUndefined()
      expect(context.invocationId).toBeUndefined()
      expect(context.nodeId).toBeUndefined()
      expect(workflowContext).toEqual({
        wfId: undefined,
        wfVersionId: undefined,
        invocationId: undefined,
        nodeId: undefined,
      })
    })
  })

  describe("Sink Management", () => {
    it("should switch sinks correctly", () => {
      // Arrange
      const sink1 = new MemorySink()
      const sink2 = new MemorySink()

      // Act & Assert
      setSink(sink1)
      obs.event("test-1", { value: 1 })
      expect(sink1.events).toHaveLength(1)
      expect(sink2.events).toHaveLength(0)

      setSink(sink2)
      obs.event("test-2", { value: 2 })
      expect(sink1.events).toHaveLength(1)
      expect(sink2.events).toHaveLength(1)
    })

    it("should work with TeeSink for multiple outputs", () => {
      // Arrange
      const sink1 = new MemorySink()
      const sink2 = new MemorySink()
      const teeSink = new TeeSink([sink1, sink2])

      // Act
      setSink(teeSink)
      obs.event("tee-test", { broadcast: true })

      // Assert
      expect(sink1.events).toHaveLength(1)
      expect(sink2.events).toHaveLength(1)
      expect(sink1.events[0]).toEqual(sink2.events[0])
    })

    it("should handle StdoutSink without errors", () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
      const stdoutSink = new StdoutSink()

      // Act
      setSink(stdoutSink)
      obs.event("stdout-test", { message: "test output" })

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("stdout-test")
      )

      consoleSpy.mockRestore()
    })
  })

  describe("Span Management", () => {
    it("should create and manage spans correctly", async () => {
      // Arrange
      setSink(mockSink)
      const context = ContextBuilder.create().withWorkflowContext().build()

      // Act
      await obs.scope(context, async () => {
        await withSpan(
          undefined,
          "test-operation",
          { operationType: "test" },
          async () => {
            obs.event("span-event", { action: "inside-span" })
          }
        )
      })

      // Assert
      const calls = (mockSink.event as any).mock.calls
      expect(calls).toHaveLength(3) // span-start, span-event, span-end

      expect(calls[0][0]).toMatchObject({
        event: "test-operation:start",
      })

      expect(calls[2][0]).toMatchObject({
        event: "timed-operation:end",
        duration_ms: expect.any(Number),
      })
    })

    it("should measure span duration correctly", async () => {
      // Arrange
      setSink(mockSink)
      const delayMs = 50

      // Act
      await withSpan(undefined, "timed-operation", {}, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      })

      // Assert
      const calls = (mockSink.event as any).mock.calls
      const endEvent = calls.find(
        (call: any) => call[0].event === "timed-operation:end"
      )

      expect(endEvent[0].duration_ms).toBeGreaterThanOrEqual(delayMs - 10)
      expect(endEvent[0].duration_ms).toBeLessThan(delayMs + 50)
    })
  })

  describe("Error Handling", () => {
    it("should handle sink errors gracefully", () => {
      // Arrange
      const faultySink: Sink = {
        event: vi.fn().mockImplementation(() => {
          throw new Error("Sink error")
        }),
      }
      setSink(faultySink)

      // Act & Assert - Should throw since emit does not catch errors
      expect(() => {
        obs.event("error-test", { data: "test" })
      }).toThrow("Sink error")
    })

    it("should handle async scope errors correctly", async () => {
      // Arrange
      const context = ContextBuilder.create().withWorkflowContext().build()

      // Act & Assert
      await expect(
        obs.scope(context, async () => {
          throw new Error("Scope error")
        })
      ).rejects.toThrow("Scope error")

      // Context should be cleaned up
      const contextAfterError = obs.getWorkflowContext()
      expect(contextAfterError.wfId).toBeUndefined()
    })

    it("should handle malformed workflow events", () => {
      // Arrange
      setSink(mockSink)
      const malformedEvent = { invalid: "event-structure" } as any

      // Act & Assert - Should not throw
      expect(() => {
        obs.workflowEvent(malformedEvent)
      }).not.toThrow()
    })
  })

  describe("Performance & Memory", () => {
    it("should not leak memory with many contexts", async () => {
      // Arrange
      const contextCount = 1000
      const contexts: any[] = []

      // Act
      for (let i = 0; i < contextCount; i++) {
        const context = ContextBuilder.create()
          .withWorkflowContext({ invocationId: `test-${i}` })
          .build()

        await obs.scope(context, () => {
          contexts.push(obs.getWorkflowContext())
        })
      }

      // Assert
      expect(contexts).toHaveLength(contextCount)

      // Verify context is cleaned up outside scope
      const finalContext = obs.getWorkflowContext()
      expect(finalContext.wfId).toBeUndefined()
    })

    it("should handle high-frequency event emission", () => {
      // Arrange
      setSink(memorySink)
      const eventCount = 10000

      // Act
      const startTime = performance.now()
      for (let i = 0; i < eventCount; i++) {
        obs.event(`high-freq-${i}`, { index: i })
      }
      const duration = performance.now() - startTime

      // Assert
      expect(memorySink.events).toHaveLength(eventCount)
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })
  })
})
