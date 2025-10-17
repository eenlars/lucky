import type { MCPToolkitMap } from "@lucky/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { mergeMCPToolkits } from "../merge-toolkits"

describe("mergeMCPToolkits", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  it("returns undefined when both inputs are undefined", () => {
    const result = mergeMCPToolkits(undefined, undefined)
    expect(result).toBeUndefined()
  })

  it("returns database toolkits when lockbox is undefined", () => {
    const dbToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily", args: [] } } },
    }

    const result = mergeMCPToolkits(dbToolkits, undefined)
    expect(result).toEqual(dbToolkits)
  })

  it("returns lockbox toolkits when database is undefined", () => {
    const lockboxToolkits: MCPToolkitMap = {
      browserUse: { transport: { kind: "stdio" as const, spec: { command: "browser", args: [] } } },
    }

    const result = mergeMCPToolkits(undefined, lockboxToolkits)
    expect(result).toEqual(lockboxToolkits)
  })

  it("merges both toolkits with database taking precedence", () => {
    const dbToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily-db", args: [] } } },
      filesystem: { transport: { kind: "stdio" as const, spec: { command: "fs", args: [] } } },
    }

    const lockboxToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily-lockbox", args: [] } } },
      browserUse: { transport: { kind: "stdio" as const, spec: { command: "browser", args: [] } } },
    }

    const result = mergeMCPToolkits(dbToolkits, lockboxToolkits)

    expect(result).toBeDefined()
    expect(Object.keys(result!)).toHaveLength(3)
    // Database should override lockbox for 'tavily'
    expect(result!.tavily).toBe(dbToolkits.tavily)
    // Both unique toolkits should be present
    expect(result!.filesystem).toBe(dbToolkits.filesystem)
    expect(result!.browserUse).toBe(lockboxToolkits.browserUse)
  })

  it("logs which toolkits are being merged", () => {
    const dbToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily", args: [] } } },
    }

    const lockboxToolkits: MCPToolkitMap = {
      browserUse: { transport: { kind: "stdio" as const, spec: { command: "browser", args: [] } } },
    }

    mergeMCPToolkits(dbToolkits, lockboxToolkits)

    expect(console.log).toHaveBeenCalledWith(
      "[mergeMCPToolkits] Merged MCP toolkits:",
      expect.arrayContaining(["tavily", "browserUse"]),
    )
  })

  it("logs when database overrides lockbox toolkits", () => {
    const dbToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily-db", args: [] } } },
    }

    const lockboxToolkits: MCPToolkitMap = {
      tavily: { transport: { kind: "stdio" as const, spec: { command: "tavily-lockbox", args: [] } } },
    }

    mergeMCPToolkits(dbToolkits, lockboxToolkits)

    expect(console.log).toHaveBeenCalledWith("[mergeMCPToolkits] Database configs override lockbox for: tavily")
  })
})
