import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { lgg } from "@core/utils/logging/Logger"
import { getDefaultModels } from "@runtime/settings/models"
import { existsSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"
import { setupMCPForNode } from "../mcp"

describe("MCP Integration Tests", () => {
  // TODO: Another integration test that makes real API calls. Should be in a separate
  // integration test suite, not mixed with unit tests.
  it.skipIf(
    !process.env.TAVILY_API_KEY ||
      !existsSync(
        resolve(__dirname, "../../../../node_modules/.bin/tavily-mcp")
      )
  )(
    "should make a real AI call using tavily MCP tools",
    async () => {
      // TODO: This test depends on external API availability and API keys.
      // It can fail due to network issues, rate limits, or API changes.
      // Also costs money to run (uses API credits).
      // Setup tavily MCP tools
      const tools = await setupMCPForNode(["tavily"], "integration-test-tavily")

      expect(tools).toBeTypeOf("object")
      const toolCount = Object.keys(tools).length
      expect(toolCount).toBeGreaterThan(0)

      lgg.log(`Loaded ${toolCount} tavily tools for integration test`)
      // TODO: Using console.log for debugging instead of proper test output

      // Make an AI call using the tavily tools
      const response = await sendAI({
        mode: "tool",
        messages: [
          {
            role: "user",
            content:
              "Search for recent news about artificial intelligence breakthroughs in 2024. Use tavily search.",
          },
        ],
        model: getDefaultModels().nano,
        opts: {
          tools,
          maxSteps: 5,
        },
      })

      expect(response).toBeDefined()
      expect(response.success).toBe(true)

      if (response.success) {
        expect(response.data).toBeDefined()
        expect(response.data.text).toBeDefined()
        expect(response.data.text.length).toBeGreaterThan(0)

        lgg.log(
          "AI response received:",
          response.data.text.substring(0, 200) + "..."
        )
        // TODO: More logging for debugging

        // Check if tools were actually used
        if (response.data.steps && response.data.steps.length > 0) {
          lgg.log(`Steps executed: ${response.data.steps.length}`)
          for (const step of response.data.steps) {
            if (step.toolCalls && step.toolCalls.length > 0) {
              for (const toolCall of step.toolCalls) {
                lgg.log(`Tool used: ${toolCall.toolName}`)
              }
            }
          }
          expect(
            response.data.steps.some(
              (step) => step.toolCalls && step.toolCalls.length > 0
            )
          ).toBe(true)
        } else {
          lgg.log("No tools were used in this response")
        }

        // Verify the response contains relevant content
        expect(response.data.text.toLowerCase()).toMatch(
          /artificial|intelligence|ai|2024|search|news|breakthrough/i
        )
        // TODO: This assertion is brittle - it assumes the AI will use specific words.
        // The AI might describe the same content using different terms.
        // Also, this will fail in 2025 when "2024" is no longer recent.
      } else {
        throw new Error(`AI request failed: ${response.error}`)
      }
    },
    60000
  ) // Longer timeout for integration test
  // TODO: 60 second timeout confirms this is a slow integration test
})
