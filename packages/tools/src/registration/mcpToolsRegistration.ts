/**
 * MCP Toolkit Registration File
 *
 * This file organizes all available MCP (Model Context Protocol) servers into logical toolkits.
 * Each toolkit contains related MCP servers that work together to accomplish specific tasks.
 *
 * MCP servers are external processes that provide tools via the MCP protocol.
 * Configuration for server commands comes from mcp-secret.json
 */

import type { ToolkitRegistry } from "@lucky/tools"
import type { MCPServerToolDefinition, ToolkitDefinition } from "@lucky/tools/registration/customToolsRegistration"

export type MCPServerConfig = {
  command: string
  args: string[]
  env?: Record<string, string>
}

/**
 * MCP toolkit registration structure.
 * Each MCP server IS a toolkit that provides tools.
 * The tools array is optional - we don't always know what tools an MCP server provides upfront.
 */
export const mcpToolkits: ToolkitRegistry<"mcp"> = {
  toolkits: [
    {
      type: "mcp",
      toolkitName: "tavily",
      description: "AI-powered web search engine providing multiple search tools",
      tools: [
        {
          toolName: "tavily_search",
          description: "Search the web using Tavily",
        },
        {
          toolName: "tavily_extract",
          description: "Extract data from the web using Tavily",
        },
      ],
    },
    {
      type: "mcp",
      toolkitName: "serpAPI",
      description: "Search the web using SerpAPI (Google, Bing, etc.)",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "googleScholar",
      description: "Search Google Scholar for academic papers and research",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "firecrawl",
      description: "Web scraping and structured data extraction using Firecrawl",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "browserUse",
      description: "Browser automation to navigate URLs and extract HTML (slower but works for hard websites)",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "playwright",
      description: "Browser automation, navigation, and data extraction using Playwright",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "filesystem",
      description: "File system operations for reading and writing files",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "proxy",
      description: "HTTP proxy for making web requests",
      tools: [],
    },
    {
      type: "mcp",
      toolkitName: "composio-googledrive",
      description: "Search Google Drive for files and folders",
      tools: [],
    },
  ],
}

/**
 * Get all MCP tools flattened from all toolkits
 */
export function getAllMCPTools(): MCPServerToolDefinition[] {
  return mcpToolkits.toolkits.flatMap((toolkit: ToolkitDefinition<"mcp">) => {
    if (toolkit.type === "mcp") {
      return toolkit.tools
    }
    return []
  })
}

/**
 * Get MCP tools by toolkit name
 */
export function getMCPToolsByToolkit(toolkitName: string): MCPServerToolDefinition[] {
  const toolkit = mcpToolkits.toolkits.find(t => t.type === "mcp" && t.toolkitName === toolkitName)
  return toolkit?.tools ?? []
}

/**
 * Get a specific MCP tool by name
 */
export function getMCPToolByName(toolName: string): MCPServerToolDefinition | null {
  for (const toolkit of mcpToolkits.toolkits) {
    if (toolkit.type === "mcp") {
      const tool = toolkit.tools.find((t: MCPServerToolDefinition) => t.toolName === toolName)
      if (tool) return tool
    }
  }
  return null
}

/**
 * Get all unique MCP server names needed
 */
export function getAllMCPServerNames(): string[] {
  const serverNames = new Set<string>()
  for (const toolkit of mcpToolkits.toolkits) {
    if (toolkit.type === "mcp") {
      serverNames.add(toolkit.toolkitName)
    }
  }
  return Array.from(serverNames)
}
