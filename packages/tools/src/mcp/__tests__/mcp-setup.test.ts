import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { MCPToolName } from "@lucky/tools/client"
import { type ToolSet, tool } from "ai"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Simple logger replacement
const lgg = {
  log: (...args: any[]) => console.log(...args),
  info: (...args: any[]) => console.log(...args),
  error: (...args: any[]) => console.error(...args),
}

// Create a temporary external MCP config and mock MCP transport/client
// so unit tests don't require real binaries or network access.
let tempConfigPath: string
let prevMcpSecretPath: string | undefined
type SetupMCPForNodeFn = (toolNames: MCPToolName[], workflowId: string) => Promise<ToolSet>
let setupMCPForNode: SetupMCPForNodeFn

vi.mock("@ai-sdk/mcp/mcp-stdio", () => {
  interface MockTransportOptions {
    command: string
    args: string[]
    env?: Record<string, string | undefined>
  }
  class Experimental_StdioMCPTransport {
    opts: MockTransportOptions
    constructor(opts: MockTransportOptions) {
      this.opts = opts
    }
  }
  return { Experimental_StdioMCPTransport }
})

vi.mock("@ai-sdk/mcp", () => {
  interface MockTransportOptions {
    command: string
    args: string[]
    env?: Record<string, string | undefined>
  }
  return {
    tool: vi.fn((config: any) => config),
    experimental_createMCPClient: ({ transport }: { transport: { opts: MockTransportOptions } }) => {
      const mcpName = transport.opts.env?.MCP_NAME
      const client = {
        tools: async (): Promise<ToolSet> => {
          switch (mcpName) {
            case "tavily":
              return {
                "tavily-search": tool({
                  description: "mock tavily search",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
              }
            case "googleScholar":
              return {
                search_google_scholar_key_words: tool({
                  description: "mock gs kw",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
                search_google_scholar_advanced: tool({
                  description: "mock gs adv",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
                get_author_info: tool({
                  description: "mock gs author",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
              }
            case "browserUse":
              return {
                open_url: tool({
                  description: "mock open url",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
                click: tool({
                  description: "mock click",
                  inputSchema: z.object({}),
                  execute: async () => ({}),
                }),
              }
            default:
              return {}
          }
        },
      }
      return client
    },
  }
})

beforeAll(async () => {
  // Write a temporary mcp-secret.json and point loader to it
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-test-"))
  tempConfigPath = path.join(tmpDir, "mcp-secret.json")
  fs.writeFileSync(
    tempConfigPath,
    JSON.stringify(
      {
        mcpServers: {
          tavily: {
            command: "dummy",
            args: [],
            env: { MCP_NAME: "tavily" },
          },
          googleScholar: {
            command: "dummy",
            args: [],
            env: { MCP_NAME: "googleScholar" },
          },
          browserUse: {
            command: "dummy",
            args: [],
            env: { MCP_NAME: "browserUse" },
          },
        },
      },
      null,
      2,
    ),
  )

  prevMcpSecretPath = process.env.MCP_SECRET_PATH
  process.env.MCP_SECRET_PATH = tempConfigPath

  // Import after env and mocks so the module reads our temp config
  const mod = await import("../setup")
  setupMCPForNode = mod.setupMCPForNode
})

afterAll(() => {
  try {
    if (tempConfigPath && fs.existsSync(tempConfigPath)) {
      fs.rmSync(path.dirname(tempConfigPath), { recursive: true, force: true })
    }
    // restore previous env to avoid leaking state across other tests
    if (prevMcpSecretPath !== undefined) {
      process.env.MCP_SECRET_PATH = prevMcpSecretPath
    } else {
      process.env.MCP_SECRET_PATH = undefined
    }
  } catch {}
})

describe("setupMCPForNode", () => {
  it("should set up the tavily MCP tool without errors", async () => {
    await expect(setupMCPForNode(["tavily"], "test-mcp-setup-tavily")).resolves.toBeTypeOf("object")

    const tools = await setupMCPForNode(["tavily"], "test-mcp-setup-tavily")
    expect(Object.keys(tools).length).toBeGreaterThan(0)
  }, 30000)

  it.skip("should set up the proxy MCP tool without errors", async () => {
    // skip this test as it requires external MCP proxy server to be running
    // TODO: Skipped tests indicate incomplete test coverage. Should either:
    // 1) Mock the external dependency, or 2) Move to integration test suite
    await expect(setupMCPForNode(["proxy"], "test-mcp-setup-proxy")).resolves.toBeTypeOf("object")

    const tools = await setupMCPForNode(["proxy"], "test-mcp-setup-proxy")
    expect(Object.keys(tools).length).toBeGreaterThan(0)
  }, 30000)
})

describe("browserUse MCP", () => {
  it("should load browserUse tools", async () => {
    lgg.log("testing browserUse mcp...")

    // setup mcp client for browserUse
    const tools = await setupMCPForNode(["browserUse"], "test-mcp-setup-browserUse")

    // check if tools were loaded
    const toolNames = Object.keys(tools)
    lgg.log("available browserUse tools:", toolNames)

    expect(toolNames.length).toBeGreaterThan(0)

    // log tool details
    for (const [name, tool] of Object.entries(tools)) {
      lgg.log(`tool: ${name}`)
      lgg.log("  description:", tool.description)
      lgg.log("  parameters:", JSON.stringify(tool.inputSchema, null, 2))
    }

    lgg.log("browserUse mcp test passed ✓")
  }, 30000)
})

describe("External MCP Configuration", () => {
  it("should load googleScholar MCP from external config", async () => {
    // This test verifies that external MCP configs work
    // Since we have mcp-secret.json with googleScholar configured,
    // it should load the tools successfully
    const tools = await setupMCPForNode(["googleScholar"], "test-mcp-external-config")

    expect(tools).toBeTypeOf("object")

    const toolCount = Object.keys(tools).length
    const toolNames = Object.keys(tools)
    lgg.log(`googleScholar tools loaded: ${toolCount}`)
    lgg.log(`Tool names: ${toolNames.join(", ")}`)

    expect(toolCount).toBe(3)
    expect(toolNames).toContain("search_google_scholar_key_words")
    expect(toolNames).toContain("search_google_scholar_advanced")
    expect(toolNames).toContain("get_author_info")
  }, 30000)

  it("should load tavily MCP from external config (not built-in)", async () => {
    // This test verifies that built-in MCPs can be moved to external config
    // Tavily is now defined in mcp-secret.json instead of being built-in

    const tools = await setupMCPForNode(["tavily"], "test-tavily-external")

    expect(tools).toBeTypeOf("object")

    const toolCount = Object.keys(tools).length
    const toolNames = Object.keys(tools)
    lgg.log(`tavily tools loaded from external config: ${toolCount}`)
    lgg.log(`Tool names: ${toolNames.join(", ")}`)

    expect(toolCount).toBeGreaterThan(0)
    expect(toolNames).toContain("tavily-search")
  }, 30000)

  it("should handle missing MCP config gracefully for valid tool names", async () => {
    // Request a valid MCP tool name that is not present in our temp config
    // This simulates missing external config for a known tool
    const tools = await setupMCPForNode(["filesystem"], "test-missing-config")

    expect(tools).toBeTypeOf("object")
    expect(Object.keys(tools).length).toBe(0)
  }, 10000)
})
