import { CodeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
import { beforeEach, describe, expect, it } from "vitest"

describe("CodeToolAutoDiscovery", () => {
  let autoDiscovery: CodeToolAutoDiscovery

  beforeEach(() => {
    autoDiscovery = new CodeToolAutoDiscovery()
    autoDiscovery.reset()
  })

  it("should discover at least one tool", async () => {
    const tools = await autoDiscovery.discoverTools()

    expect(tools).toBeDefined()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
  })

  it("should return valid tool definitions", async () => {
    const tools = await autoDiscovery.discoverTools()

    if (tools.length > 0) {
      const tool = tools[0]
      expect(tool).toHaveProperty("name")
      expect(tool).toHaveProperty("description")
      expect(tool).toHaveProperty("parameters")
      expect(tool).toHaveProperty("execute")
      expect(typeof tool.name).toBe("string")
      expect(typeof tool.description).toBe("string")
      expect(typeof tool.execute).toBe("function")
    }
  })

  it("should setup code tools and register them", async () => {
    const tools = await autoDiscovery.setupCodeTools()

    expect(tools).toBeDefined()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)

    const stats = autoDiscovery.getStats()
    expect(stats.discovered).toBe(true)
  })
})
