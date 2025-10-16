import { setupCoreTest } from "@core/utils/__tests__/setup/coreMocks"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { InMemoryContextStore } from "@core/utils/persistence/memory/MemoryStore"
import { SupabaseContextStore } from "@core/utils/persistence/memory/SupabaseStore"
import { beforeEach, describe, expect, it } from "vitest"

describe("ContextStore", () => {
  // TODO: This test file is testing ContextStore from utils/persistence/memory, not from tools/context.
  // It's in the wrong directory - should be in core/src/utils/persistence/memory/__tests__/
  // This suggests poor test organization or a misunderstanding of the codebase structure.
  beforeEach(() => {
    setupCoreTest()
  })

  describe("InMemoryContextStore", () => {
    it("should implement the enhanced interface with summaries", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", { theme: "dark" })
      await store.set("node", "counter", 42)

      expect(await store.get("workflow", "config")).toEqual({ theme: "dark" })
      expect(await store.get("node", "counter")).toBe(42)
      expect(await store.get("workflow", "missing")).toBeUndefined()

      const workflowKeys = await store.list("workflow")
      const nodeKeys = await store.list("node")

      expect(workflowKeys).toContain("config")
      expect(nodeKeys).toContain("counter")
      expect(workflowKeys).not.toContain("counter")
    })

    it("should provide summaries for stored data", async () => {
      // TODO: This test doesn't actually verify that summaries are generated for large data.
      // The comment says "Small data (<200 bytes) returns the data directly" but the test
      // doesn't test large data that would actually generate summaries.
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", {
        theme: "dark",
        mode: "production",
      })
      const summary = await store.getSummary("workflow", "config")

      expect(summary).toContain("dark")
      // Small data (<200 bytes) returns the data directly, not a summary with "bytes"
      expect(summary).toBeTruthy()
      // TODO: toBeTruthy() is a weak assertion. Should test the actual summary format/content.
      // Also missing test for large data (>200 bytes) that would generate actual summaries.
    })

    it("should provide detailed file information", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", { theme: "dark" })
      await store.set("workflow", "settings", [1, 2, 3])

      const info = await store.listWithInfo("workflow")

      expect(info).toHaveLength(2)
      expect(info.some(i => i.key === "config" && i.dataType === "object")).toBe(true)
      expect(info.some(i => i.key === "settings" && i.dataType === "array")).toBe(true)
      expect(info.every(i => i.created && i.modified && i.size > 0)).toBe(true)
      // TODO: This doesn't test the actual values of created/modified timestamps.
      // Should verify they're valid dates and that modified >= created.
    })

    it("should support delete operations", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", { theme: "dark" })
      expect(await store.get("workflow", "config")).toEqual({ theme: "dark" })

      await store.delete("workflow", "config")
      expect(await store.get("workflow", "config")).toBeUndefined()

      const keys = await store.list("workflow")
      expect(keys).not.toContain("config")
    })

    it("should handle scopes independently", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "key1", "workflow-value")
      await store.set("node", "key1", "node-value")

      expect(await store.get("workflow", "key1")).toBe("workflow-value")
      expect(await store.get("node", "key1")).toBe("node-value")
    })

    it("should correctly report cache status with isCached", async () => {
      const store = createContextStore("memory", "test-workflow")

      // Initially not cached
      expect(store.isCached("workflow", "config")).toBe(false)

      // After setting, should be cached
      await store.set("workflow", "config", { theme: "dark" })
      expect(store.isCached("workflow", "config")).toBe(true)

      // Different scope should not be cached
      expect(store.isCached("node", "config")).toBe(false)

      // After getting, should still be cached
      await store.get("workflow", "config")
      expect(store.isCached("workflow", "config")).toBe(true)

      // After deleting, should not be cached
      await store.delete("workflow", "config")
      expect(store.isCached("workflow", "config")).toBe(false)
    })

    it("should handle cache status for multiple keys", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "key1", "value1")
      await store.set("workflow", "key2", "value2")
      await store.set("node", "key3", "value3")

      expect(store.isCached("workflow", "key1")).toBe(true)
      expect(store.isCached("workflow", "key2")).toBe(true)
      expect(store.isCached("node", "key3")).toBe(true)
      expect(store.isCached("workflow", "key3")).toBe(false)
      expect(store.isCached("node", "key1")).toBe(false)
    })
  })

  describe("Factory function", () => {
    it("should create memory store", () => {
      const store = createContextStore("memory", "test-workflow")
      expect(store).toBeInstanceOf(InMemoryContextStore)
    })

    it("should create supabase store for supabase", () => {
      const store = createContextStore("supabase", "test-workflow-123")
      expect(store).toBeInstanceOf(SupabaseContextStore)
      // TODO: This only tests instance creation, not that the Supabase store actually works.
      // Missing integration tests for Supabase operations (likely because they require setup).
    })

    it("should handle invalid backend", () => {
      expect(() => createContextStore("invalid" as any, "test")).toThrow()
      // TODO: Using 'as any' to bypass TypeScript defeats the purpose of type safety.
      // Also doesn't test the error message content to ensure it's helpful.
    })
  })
})
