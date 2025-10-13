import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for MCP server configuration
const mcpServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
})

// Schema for the complete MCP configuration
const mcpConfigResponseSchema = z.object({
  config: z.object({
    mcpServers: z.record(mcpServerSchema),
  }),
  explanation: z.string(),
  changes: z.object({
    added: z.array(z.string()),
    modified: z.array(z.string()),
    removed: z.array(z.string()),
  }),
})

export async function POST(req: Request) {
  try {
    const { contextType, prompt, currentState } = await req.json()

    if (!contextType || !prompt) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Create system prompt based on context type
    let systemPrompt = `You are an AI assistant helping to modify ${contextType} configurations.\n`

    switch (contextType) {
      case "mcp-config":
        systemPrompt += `
The user wants to modify their MCP (Model Context Protocol) server configuration.
Current configuration:
${JSON.stringify(currentState, null, 2)}

MCP servers are external tool servers that extend AI capabilities. Common examples:
- filesystem: File system access (@modelcontextprotocol/server-filesystem)
- brave-search: Web search (Brave browser search API)
- github: GitHub integration (@modelcontextprotocol/server-github)
- postgres: Database access (@modelcontextprotocol/server-postgres)
- puppeteer: Browser automation (@modelcontextprotocol/server-puppeteer)
- slack: Slack integration (@modelcontextprotocol/server-slack)
- tavily: Tavily search API (tavily-mcp)
- firecrawl: Web scraping (firecrawl-mcp)

When making changes:
1. Preserve the existing structure with "mcpServers" as the root object
2. Each server needs "command" and "args" properties
3. Optional "env" property for environment variables
4. Track which servers are added, modified, or removed
5. Return the COMPLETE updated configuration (not just changes)

Example configurations:
- Filesystem server:
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allow"]
  }

- Tavily search server:
  "tavily": {
    "command": "npx",
    "args": ["-y", "tavily-mcp"],
    "env": {
      "TAVILY_API_KEY": "\${TAVILY_API_KEY}"
    }
  }

- Firecrawl server:
  "firecrawl": {
    "command": "npx",
    "args": ["-y", "firecrawl-mcp"],
    "env": {
      "FIRECRAWL_API_KEY": "\${FIRECRAWL_API_KEY}"
    }
  }

- GitHub server:
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "\${GITHUB_PERSONAL_ACCESS_TOKEN}"
    }
  }

IMPORTANT: Always return the COMPLETE config object, not partial updates.`
        break

      default:
        systemPrompt += `
Current state:
${JSON.stringify(currentState, null, 2)}

Make appropriate changes based on the user's request.`
    }

    // Simple non-streaming call
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: mcpConfigResponseSchema,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    })

    // Return simple JSON response like the workflow endpoint
    return Response.json({
      success: true,
      data: result.object,
    })
  } catch (error) {
    console.error("AI handler error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
