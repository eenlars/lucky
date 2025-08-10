import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { lgg } from "@core/utils/logging/Logger"
import { getDefaultModels } from "@runtime/settings/models"
import { describe, expect, it } from "vitest"
import { setupMCPForNode } from "../mcp"

describe("MCP Integration Tests", () => {
  it("should make a real AI call using tavily MCP tools", async () => {
    // Setup tavily MCP tools
    const tools = await setupMCPForNode(["tavily"], "integration-test-tavily")

    expect(tools).toBeTypeOf("object")
    const toolCount = Object.keys(tools).length
    expect(toolCount).toBeGreaterThan(0)

    lgg.log(`Loaded ${toolCount} tavily tools for integration test`)

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
    } else {
      throw new Error(`AI request failed: ${response.error}`)
    }
  }, 60000) // Longer timeout for integration test
})
