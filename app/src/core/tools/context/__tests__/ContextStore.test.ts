import { createContextStore } from "@/core/utils/persistence/memory/ContextStore"
import { InMemoryContextStore } from "@/core/utils/persistence/memory/MemoryStore"
import { SupabaseContextStore } from "@/core/utils/persistence/memory/SupabaseStore"
import { describe, expect, it } from "vitest"

describe("ContextStore", () => {
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
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", {
        theme: "dark",
        mode: "production",
      })
      const summary = await store.getSummary("workflow", "config")

      expect(summary).toContain("dark")
      // Small data (<200 bytes) returns the data directly, not a summary with "bytes"
      expect(summary).toBeTruthy()
    })

    it("should provide detailed file information", async () => {
      const store = createContextStore("memory", "test-workflow")

      await store.set("workflow", "config", { theme: "dark" })
      await store.set("workflow", "settings", [1, 2, 3])

      const info = await store.listWithInfo("workflow")

      expect(info).toHaveLength(2)
      expect(
        info.some((i) => i.key === "config" && i.dataType === "object")
      ).toBe(true)
      expect(
        info.some((i) => i.key === "settings" && i.dataType === "array")
      ).toBe(true)
      expect(info.every((i) => i.created && i.modified && i.size > 0)).toBe(
        true
      )
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
  })

  describe("Factory function", () => {
    it("should create memory store", () => {
      const store = createContextStore("memory", "test-workflow")
      expect(store).toBeInstanceOf(InMemoryContextStore)
    })

    it("should create supabase store for supabase", () => {
      const store = createContextStore("supabase", "test-workflow-123")
      expect(store).toBeInstanceOf(SupabaseContextStore)
    })

    it("should handle invalid backend", () => {
      expect(() => createContextStore("invalid" as any, "test")).toThrow()
    })
  })
})
