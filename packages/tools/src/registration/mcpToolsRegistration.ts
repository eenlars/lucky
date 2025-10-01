/**
 * MCP Tool Registration File
 *
 * This file organizes all available MCP (Model Context Protocol) servers into logical groups.
 * Each group contains related MCP servers that work together to accomplish specific tasks.
 *
 * MCP servers are external processes that provide tools via the MCP protocol.
 * Configuration for server commands comes from mcp-secret.json
 */

export type MCPServerConfig = {
  command: string
  args: string[]
  env?: Record<string, string>
}

export type MCPToolDefinition = {
  toolName: string
  serverName: string // The key in mcp-secret.json
  description: string
}

export type MCPToolGroup = {
  groupName: string
  description: string
  tools: MCPToolDefinition[]
}

/**
 * MCP Tool registration structure with grouped tools
 * Same structure as code tools for easy maintenance
 */
export const mcpToolGroups: {
  groups: MCPToolGroup[]
} = {
  groups: [
    {
      groupName: "web-search",
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
      groupName: "web-scraping",
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
      groupName: "filesystem",
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
      groupName: "proxy",
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
 * Get all MCP tools flattened from all groups
 */
export function getAllMCPTools(): MCPToolDefinition[] {
  return mcpToolGroups.groups.flatMap(group => group.tools)
}

/**
 * Get MCP tools by group name
 */
export function getMCPToolsByGroup(groupName: string): MCPToolDefinition[] {
  const group = mcpToolGroups.groups.find(g => g.groupName === groupName)
  return group?.tools ?? []
}

/**
 * Get a specific MCP tool by name
 */
export function getMCPToolByName(toolName: string): MCPToolDefinition | null {
  for (const group of mcpToolGroups.groups) {
    const tool = group.tools.find(t => t.toolName === toolName)
    if (tool) return tool
  }
  return null
}

/**
 * Get all unique MCP server names needed
 */
export function getAllMCPServerNames(): string[] {
  const serverNames = new Set<string>()
  for (const group of mcpToolGroups.groups) {
    for (const tool of group.tools) {
      serverNames.add(tool.serverName)
    }
  }
  return Array.from(serverNames)
}
