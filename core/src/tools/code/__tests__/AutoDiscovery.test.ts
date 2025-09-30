import { CodeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
import { PATHS as EXAMPLES_PATHS } from "@examples/settings/constants"
import { beforeEach, describe, expect, it } from "vitest"

describe("CodeToolAutoDiscovery", () => {
  let autoDiscovery: CodeToolAutoDiscovery

  beforeEach(() => {
    // Create a fresh instance pointed at real example tools and reset discovery state
    autoDiscovery = new CodeToolAutoDiscovery(EXAMPLES_PATHS.codeTools)
    autoDiscovery.reset()
  })

  it("should discover at least one tool", async () => {
    // TODO: This test only verifies that SOME tools are discovered, but doesn't test:
    // 1) Which tools are discovered (are they the expected ones?)
    // 2) Are all available tools discovered (no tools missed?)
    // 3) Are invalid/test tools excluded?
    // 4) What happens if the tool directory is empty or missing?
    const tools = await autoDiscovery.discoverTools()

    expect(tools).toBeDefined()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
  })

  it("should return valid tool definitions", async () => {
    const tools = await autoDiscovery.discoverTools()

    if (tools.length > 0) {
      // TODO: This test has a major flaw - it only tests if tools.length > 0.
      // If no tools are discovered, the test passes without testing anything!
      // Should use expect(tools.length).toBeGreaterThan(0) first.
      const tool = tools[0]
      expect(tool).toHaveProperty("name")
      expect(tool).toHaveProperty("description")
      expect(tool).toHaveProperty("parameters")
      expect(tool).toHaveProperty("execute")
      expect(typeof tool.name).toBe("string")
      expect(typeof tool.description).toBe("string")
      expect(typeof tool.execute).toBe("function")
      // TODO: Doesn't test:
      // 1) Parameter schema structure/validity
      // 2) Tool name uniqueness
      // 3) Description quality/content
      // 4) Execute function behavior
    }
  })

  it("should setup code tools and register them", async () => {
    // TODO: This test doesn't verify that tools are actually "registered" anywhere.
    // What does registration mean? Where are they registered? How can we verify it?
    // The test name promises registration testing but only checks discovery stats.
    const tools = await autoDiscovery.setupCodeTools()

    expect(tools).toBeDefined()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)

    const stats = autoDiscovery.getStats()
    expect(stats.discovered).toBe(true)
    // TODO: Testing only 'discovered' boolean is insufficient. Should test:
    // 1) stats.toolCount matches tools.length
    // 2) stats.errors if any tools failed to load
    // 3) stats timing/performance metrics
    // 4) Tool names in stats match discovered tools
  })
})
