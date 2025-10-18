import { createSecretResolver } from "@/features/secret-management/lib/secretResolver"
import { requireAuthWithApiKey } from "@/lib/api-auth"
import { withExecutionContext } from "@lucky/core/context/executionContext"
import { createLLMRegistry } from "@lucky/models"
import { streamText } from "ai"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuthWithApiKey(req)
    if (authResult instanceof Response) return authResult
    const principal = authResult

    const { contextType, prompt, currentState, operation: _operation } = await req.json()

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

The configuration is in JSONC format (JSON with comments support).
When making changes:
1. Preserve any existing comments where possible
2. Maintain the structure with "mcpServers" as the root object
3. Each server needs "command" and "args" properties
4. Optional "env" property for environment variables
5. Return ONLY the complete updated configuration as valid JSON (not JSONC)
6. Include all servers, not just changed ones

Respond with a JSON object containing:
- changes: the complete updated configuration
- explanation: a brief explanation of what was changed`
        break

      case "workflow":
        systemPrompt += `
The user wants to modify their workflow DAG structure.
Current workflow:
${JSON.stringify(currentState, null, 2)}

When making changes:
1. Maintain valid DAG structure (no cycles)
2. Preserve node IDs unless changing them is necessary
3. Update edges appropriately when adding/removing nodes
4. Return the complete updated workflow

Respond with a JSON object containing:
- changes: the complete updated workflow configuration
- explanation: a brief explanation of what structural changes were made`
        break

      default:
        systemPrompt += `
Current state:
${JSON.stringify(currentState, null, 2)}

Make appropriate changes based on the user's request.

Respond with a JSON object containing:
- changes: the complete updated configuration
- explanation: a brief explanation of what was changed`
    }

    return withExecutionContext({ principal, secrets, apiKeys, llmRegistry }, async () => {
      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: principal.clerk_id,
        models: ["openai#gpt-4o"],
      })

      const result = streamText({
        model: userModels.model("openai#gpt-4o"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      })

      // Get the complete text response
      let fullText = ""
      for await (const chunk of result.textStream) {
        fullText += chunk
      }

      // Try to parse the response as JSON
      try {
        // Find JSON in the response (it might be wrapped in markdown code blocks)
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error("No JSON found in response")
        }

        const parsed = JSON.parse(jsonMatch[0])

        if (!parsed.changes) {
          throw new Error("Response missing 'changes' field")
        }

        return Response.json({
          success: true,
          changes: parsed.changes,
          explanation: parsed.explanation || "Configuration updated",
        })
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError)
        console.error("Raw response:", fullText)

        return Response.json({
          success: false,
          error: "Failed to parse AI response. Please try again.",
        })
      }
    })
  } catch (error) {
    console.error("AI handler error:", error)
    return Response.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
