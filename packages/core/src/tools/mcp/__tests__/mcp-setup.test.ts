import { lgg } from "@/utils/logging/Logger"
import { describe, expect, it } from "vitest"
import { setupMCPForNode } from "../mcp"

describe("setupMCPForNode", () => {
  it("should set up the tavily MCP tool without errors", async () => {
    await expect(
      setupMCPForNode(["tavily"], "test-mcp-setup-tavily")
    ).resolves.toBeTypeOf("object")

    const tools = await setupMCPForNode(["tavily"], "test-mcp-setup-tavily")
    expect(Object.keys(tools).length).toBeGreaterThan(0)
  }, 30000)

  it.skip("should set up the proxy MCP tool without errors", async () => {
    // skip this test as it requires external MCP proxy server to be running
    await expect(
      setupMCPForNode(["proxy"], "test-mcp-setup-proxy")
    ).resolves.toBeTypeOf("object")

    const tools = await setupMCPForNode(["proxy"], "test-mcp-setup-proxy")
    expect(Object.keys(tools).length).toBeGreaterThan(0)
  }, 30000)
})

describe("browserUse MCP", () => {
  it("should load browserUse tools", async () => {
    lgg.log("testing browserUse mcp...")

    // setup mcp client for browserUse
    const tools = await setupMCPForNode(
      ["browserUse"],
      "test-mcp-setup-browserUse"
    )

    // check if tools were loaded
    const toolNames = Object.keys(tools)
    lgg.log("available browserUse tools:", toolNames)

    expect(toolNames.length).toBeGreaterThan(0)

    // log tool details
    for (const [name, tool] of Object.entries(tools)) {
      lgg.log(`tool: ${name}`)
      lgg.log("  description:", tool.description)
      lgg.log("  parameters:", JSON.stringify(tool.parameters, null, 2))
    }

    lgg.log("browserUse mcp test passed ✓")
  }, 30000)
})

describe("External MCP Configuration", () => {
  it("should load googleScholar MCP from external config", async () => {
    // This test verifies that external MCP configs work
    // Since we have mcp-config.json with googleScholar configured,
    // it should load the tools successfully

    const tools = await setupMCPForNode(
      ["googleScholar"],
      "test-mcp-external-config"
    )

    expect(tools).toBeTypeOf("object")

    const toolCount = Object.keys(tools).length
    const toolNames = Object.keys(tools)
    lgg.log(`googleScholar tools loaded: ${toolCount}`)
    lgg.log(`Tool names: ${toolNames.join(", ")}`)

    // Google Scholar MCP provides 3 tools when properly configured
    expect(toolCount).toBe(3)
    expect(toolNames).toContain("search_google_scholar_key_words")
    expect(toolNames).toContain("search_google_scholar_advanced")
    expect(toolNames).toContain("get_author_info")
  }, 30000)

  it("should load tavily MCP from external config (not built-in)", async () => {
    // This test verifies that built-in MCPs can be moved to external config
    // Tavily is now defined in mcp-config.json instead of being built-in
    
    const tools = await setupMCPForNode(
      ["tavily"],
      "test-tavily-external"
    )
    
    expect(tools).toBeTypeOf("object")
    
    const toolCount = Object.keys(tools).length
    const toolNames = Object.keys(tools)
    lgg.log(`tavily tools loaded from external config: ${toolCount}`)
    lgg.log(`Tool names: ${toolNames.join(", ")}`)
    
    // Tavily MCP provides multiple tools
    expect(toolCount).toBeGreaterThan(0)
    expect(toolNames).toContain("tavily-search")
  }, 30000)

  it("should handle invalid MCP tool names gracefully", async () => {
    // This test verifies proper error handling for non-existent MCPs
    const tools = await setupMCPForNode(
      ["nonExistentMCP" as any],
      "test-invalid-mcp"
    )
    
    // Should return empty object for invalid tools
    expect(tools).toBeTypeOf("object")
    expect(Object.keys(tools).length).toBe(0)
  }, 10000)
})
