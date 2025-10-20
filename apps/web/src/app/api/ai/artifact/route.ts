import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { requireAuthWithApiKey } from "@/lib/api-auth"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { genObject } from "@lucky/core/messages/api/genObject"
import { createLLMRegistry } from "@lucky/models"
import type { NextRequest } from "next/server"
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

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuthWithApiKey(req)
    if (authResult instanceof Response) return authResult
    const principal = authResult

    const { contextType, prompt, currentState } = await req.json()

    if (!contextType || !prompt) {
      return Response.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Setup execution context
    const secrets = createSecretResolver(principal.clerk_id, principal)
    const apiKeys = await secrets.getAll(["OPENAI_API_KEY"], "environment-variables")

    const llmRegistry = createLLMRegistry({
      fallbackKeys: {
        openai: apiKeys.OPENAI_API_KEY,
      },
    })

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

    const modelUsed = "openai#gpt-4o-mini"

    const userModels = llmRegistry.forUser({
      mode: "shared",
      userId: principal.clerk_id,
      models: [modelUsed],
    })

    // Execute within execution context
    return withExecutionContext({ principal, secrets, apiKeys, userModels }, async () => {
      // Use custom genObject wrapper to avoid type inference issues
      const result = await genObject({
        model: modelUsed,
        schema: mcpConfigResponseSchema,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        opts: {
          retries: 2,
          repair: true,
        },
      })

      if (!result.success) {
        return Response.json(
          {
            success: false,
            error: result.error || "Failed to generate configuration",
            errorType: "generation_failed",
          },
          { status: 500 },
        )
      }

      // Return simple JSON response like the workflow endpoint
      return Response.json({
        success: true,
        data: result.data.value,
      })
    })
  } catch (error) {
    // Handle AI SDK errors with better user messages
    if (error && typeof error === "object" && "name" in error) {
      const errorWithName = error as {
        name: string
        message?: string
        statusCode?: number
        lastError?: { statusCode?: number; responseBody?: string }
      }

      // Handle quota/billing errors (429)
      if (errorWithName.name === "AI_RetryError" || errorWithName.name === "AI_APICallError") {
        const statusCode = errorWithName.statusCode ?? errorWithName.lastError?.statusCode
        const errorType = errorWithName.lastError?.responseBody
          ? JSON.parse(errorWithName.lastError.responseBody)?.error?.type
          : null

        if (statusCode === 429 || errorType === "insufficient_quota") {
          console.error("[AI artifact] Quota exceeded:", errorWithName.message)
          return Response.json(
            {
              success: false,
              error: "AI quota exceeded. Please check your OpenAI API key and billing settings.",
              errorType: "quota_exceeded",
            },
            { status: 429 },
          )
        }

        // Handle rate limits
        if (statusCode === 429 || errorType === "rate_limit_exceeded") {
          console.error("[AI artifact] Rate limit:", errorWithName.message)
          return Response.json(
            {
              success: false,
              error: "Rate limit exceeded. Please try again in a moment.",
              errorType: "rate_limit",
            },
            { status: 429 },
          )
        }

        // Handle authentication errors
        if (statusCode === 401 || errorType === "invalid_api_key") {
          console.error("[AI artifact] Auth error:", errorWithName.message)
          return Response.json(
            {
              success: false,
              error: "Invalid API key. Please check your OpenAI API key configuration.",
              errorType: "auth_error",
            },
            { status: 401 },
          )
        }
      }
    }

    // Generic error fallback
    console.error("[AI artifact] Unexpected error:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "AI request failed. Please try again.",
        errorType: "unknown",
      },
      { status: 500 },
    )
  }
}
