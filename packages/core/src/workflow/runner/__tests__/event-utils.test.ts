import type { WorkflowProgressEvent } from "@lucky/shared"
import { WORKFLOW_PROGRESS_SCHEMA_VERSION } from "@lucky/shared"
import { describe, expect, it, vi } from "vitest"
import { safeEmit, truncateOutput } from "../event-utils"

describe("truncateOutput", () => {
  it("returns empty string for null", () => {
    expect(truncateOutput(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(truncateOutput(undefined)).toBe("")
  })

  it("returns string as-is if under max length", () => {
    const short = "Hello world"
    expect(truncateOutput(short, 200)).toBe("Hello world")
  })

  it("truncates string if over max length", () => {
    const long = "a".repeat(250)
    const result = truncateOutput(long, 200)
    expect(result).toBe(`${"a".repeat(200)}...`)
    expect(result.length).toBe(203)
  })

  it("serializes objects to JSON", () => {
    const obj = { foo: "bar", num: 42 }
    expect(truncateOutput(obj, 200)).toBe(JSON.stringify(obj))
  })

  it("serializes arrays to JSON", () => {
    const arr = [1, 2, 3, 4, 5]
    expect(truncateOutput(arr, 200)).toBe(JSON.stringify(arr))
  })

  it("handles circular references", () => {
    const circular: any = { a: 1 }
    circular.self = circular
    expect(truncateOutput(circular, 200)).toBe("[Non-serializable output]")
  })

  it("detects binary data with null bytes", () => {
    const binary = "Hello\x00World"
    expect(truncateOutput(binary, 200)).toBe("[Binary output]")
  })

  it("detects binary data with replacement characters", () => {
    const binary = "Hello�World"
    expect(truncateOutput(binary, 200)).toBe("[Binary output]")
  })

  it("uses default max length of 200", () => {
    const long = "a".repeat(250)
    const result = truncateOutput(long)
    expect(result).toBe(`${"a".repeat(200)}...`)
  })

  it("handles nested objects", () => {
    const nested = { a: { b: { c: "deep" } } }
    const result = truncateOutput(nested, 200)
    expect(result).toBe(JSON.stringify(nested))
  })
})

describe("safeEmit", () => {
  it("does nothing if handler is undefined", async () => {
    const event: WorkflowProgressEvent = {
      type: "node_started",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    // Should not throw
    await expect(safeEmit(undefined, event, "test")).resolves.toBeUndefined()
  })

  it("calls handler with event", async () => {
    const handler = vi.fn()
    const event: WorkflowProgressEvent = {
      type: "node_started",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    await safeEmit(handler, event, "test")

    expect(handler).toHaveBeenCalledWith(event)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it("handles async handlers", async () => {
    let resolved = false
    const handler = async (_event: WorkflowProgressEvent) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      resolved = true
    }

    const event: WorkflowProgressEvent = {
      type: "node_completed",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      output: "result",
      durationMs: 100,
      costUsd: 0.001,
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    await safeEmit(handler, event, "test")
    expect(resolved).toBe(true)
  })

  it("catches and logs handler errors without throwing", async () => {
    const handler = vi.fn(() => {
      throw new Error("Handler failed")
    })

    const event: WorkflowProgressEvent = {
      type: "node_failed",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      error: "Node error",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    // Should not throw even though handler throws
    await expect(safeEmit(handler, event, "test")).resolves.toBeUndefined()
    expect(handler).toHaveBeenCalledWith(event)
  })

  it("catches async handler errors without throwing", async () => {
    const handler = vi.fn(async () => {
      throw new Error("Async handler failed")
    })

    const event: WorkflowProgressEvent = {
      type: "node_started",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    await expect(safeEmit(handler, event, "test")).resolves.toBeUndefined()
    expect(handler).toHaveBeenCalledWith(event)
  })

  it("handles all event types", async () => {
    const handler = vi.fn()

    const startedEvent: WorkflowProgressEvent = {
      type: "node_started",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    const completedEvent: WorkflowProgressEvent = {
      type: "node_completed",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      output: "result",
      durationMs: 100,
      costUsd: 0.001,
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    const failedEvent: WorkflowProgressEvent = {
      type: "node_failed",
      schemaVersion: WORKFLOW_PROGRESS_SCHEMA_VERSION,
      nodeId: "test",
      nodeName: "Test Node",
      error: "Error message",
      timestamp: Date.now(),
      workflowInvocationId: "test-inv",
    }

    await safeEmit(handler, startedEvent, "test")
    await safeEmit(handler, completedEvent, "test")
    await safeEmit(handler, failedEvent, "test")

    expect(handler).toHaveBeenCalledTimes(3)
    expect(handler).toHaveBeenNthCalledWith(1, startedEvent)
    expect(handler).toHaveBeenNthCalledWith(2, completedEvent)
    expect(handler).toHaveBeenNthCalledWith(3, failedEvent)
  })
})
