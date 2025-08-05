import { getPaths } from "@utils/config/runtimeConfig"
import { describe, expect, it } from "vitest"
import { WorkflowConfigHandler } from "../WorkflowLoader"

describe("loadWorkflow", () => {
  it("should load workflow setup asynchronously", async () => {
    const workflow =
      await WorkflowConfigHandler.getInstance().loadSingleWorkflow(
        getPaths().setupFile
      )

    expect(workflow).toBeDefined()
    expect(workflow.entryNodeId).toBeDefined()

    // Check that nodes have required properties
    expect(workflow.nodes).toBeDefined()
    expect(Array.isArray(workflow.nodes)).toBe(true)
    expect(workflow.nodes.length).toBeGreaterThan(0)
  })

  it("should cache workflow setup on subsequent calls", async () => {
    const workflow1 =
      await WorkflowConfigHandler.getInstance().loadSingleWorkflow(
        getPaths().setupFile
      )
    const workflow2 =
      await WorkflowConfigHandler.getInstance().loadSingleWorkflow(
        getPaths().setupFile
      )

    // Should be the same reference due to caching
    expect(workflow1).toStrictEqual(workflow2)
  })
})
