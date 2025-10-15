/**
 * MCP Toolkit Registration File
 *
 * This file organizes all available MCP (Model Context Protocol) servers into logical toolkits.
 * Each toolkit contains related MCP servers that work together to accomplish specific tasks.
 *
 * MCP servers are external processes that provide tools via the MCP protocol.
 * Configuration for server commands comes from mcp-secret.json
 */

export type MCPServerConfig = {
  command: string
  args: string[]
  env?: Record<string, string>
}

export type MCPToolkitToolDefinition = {
  toolName: string
  serverName: string // The key in mcp-secret.json
  description: string
}

export type MCPToolkit = {
  toolkitName: string
  description: string
  tools: MCPToolkitToolDefinition[]
}

/**
 * MCP toolkit registration structure with toolkit-based organization
 * Same structure as code toolkits for easy maintenance
 */
export const mcpToolkits: {
  toolkits: MCPToolkit[]
} = {
  toolkits: [
    {
      toolkitName: "web-search",
      description: "Web search and research tools for finding information across the internet",
      tools: [
        {
          toolName: "tavily",
          serverName: "tavily",
          description: "Search the web using Tavily AI-powered search engine",
        },
        {
          toolName: "serpAPI",
          serverName: "serpAPI",
          description: "Search the web using SerpAPI (Google, Bing, etc.)",
        },
        {
          toolName: "googleScholar",
          serverName: "googleScholar",
          description: "Search Google Scholar for academic papers and research",
        },
      ],
    },
    {
      toolkitName: "web-scraping",
      description: "Browser automation and web scraping tools for extracting data from websites",
      tools: [
        {
          toolName: "firecrawl",
          serverName: "firecrawl",
          description: "Search the web and extract structured data using Firecrawl",
        },
        {
          toolName: "browserUse",
          serverName: "browserUse",
          description: "Use a browser to navigate to URLs and return HTML (slower but works for hard websites)",
        },
        {
          toolName: "playwright",
          serverName: "playwright",
          description: "Use Playwright for browser automation, navigation, and data extraction",
        },
      ],
    },
    {
      toolkitName: "filesystem",
      description: "File system operations for reading and writing files",
      tools: [
        {
          toolName: "filesystem",
          serverName: "filesystem",
          description: "Save and load files to/from the filesystem",
        },
      ],
    },
    {
      toolkitName: "proxy",
      description: "HTTP proxy tools for making web requests",
      tools: [
        {
          toolName: "proxy",
          serverName: "proxy",
          description: "Proxy requests to a specific URL",
        },
      ],
    },
  ],
}

/**
 * Get all MCP tools flattened from all toolkits
 */
export function getAllMCPTools(): MCPToolkitToolDefinition[] {
  return mcpToolkits.toolkits.flatMap(toolkit => toolkit.tools)
}

/**
 * Get MCP tools by toolkit name
 */
export function getMCPToolsByToolkit(toolkitName: string): MCPToolkitToolDefinition[] {
  const toolkit = mcpToolkits.toolkits.find(t => t.toolkitName === toolkitName)
  return toolkit?.tools ?? []
}

/**
 * Get a specific MCP tool by name
 */
export function getMCPToolByName(toolName: string): MCPToolkitToolDefinition | null {
  for (const toolkit of mcpToolkits.toolkits) {
    const tool = toolkit.tools.find(t => t.toolName === toolName)
    if (tool) return tool
  }
  return null
}

/**
 * Get all unique MCP server names needed
 */
export function getAllMCPServerNames(): string[] {
  const serverNames = new Set<string>()
  for (const toolkit of mcpToolkits.toolkits) {
    for (const tool of toolkit.tools) {
      serverNames.add(tool.serverName)
    }
  }
  return Array.from(serverNames)
}
