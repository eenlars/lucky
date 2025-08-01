import { describe, expect, it, vi } from "vitest"

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

// Mock the database functions
vi.mock("@/trace-visualization/db/Workflow/retrieveWorkflow", () => ({
  ensureWorkflowExists: vi.fn(),
  saveWorkflowVersion: vi.fn(),
}))

describe("JSONEditor", () => {
  it("should import without errors", async () => {
    const jsonEditorModule = await import("../JSONEditor")
    expect(jsonEditorModule.default).toBeTypeOf("function")
  })
})
