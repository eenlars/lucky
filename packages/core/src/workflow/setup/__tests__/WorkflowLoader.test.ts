import { getPaths } from "@utils/config/runtimeConfig"
import { describe, expect, it } from "vitest"
import { WorkflowConfigHandler, loadSingleWorkflow } from "../WorkflowLoader"

describe("WorkflowConfigHandler", () => {
  it("should load single workflow successfully", async () => {
    const loader = WorkflowConfigHandler.getInstance()
    const workflow = await loader.loadSingleWorkflow()

    expect(workflow).toBeDefined()
    expect(workflow.entryNodeId).toBeDefined()
    expect(workflow.nodes).toBeDefined()
    expect(Array.isArray(workflow.nodes)).toBe(true)
    expect(workflow.nodes.length).toBeGreaterThan(0)
  })

  it("should use singleton pattern", () => {
    const loader1 = WorkflowConfigHandler.getInstance()
    const loader2 = WorkflowConfigHandler.getInstance()

    expect(loader1).toBe(loader2)
  })

  it("should export convenience function", async () => {
    const workflow = await loadSingleWorkflow(getPaths().setupFile)

    expect(workflow).toBeDefined()
    expect(workflow.entryNodeId).toBeDefined()
    expect(workflow.nodes).toBeDefined()
  })
})
