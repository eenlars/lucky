import { openai } from "@ai-sdk/openai"
import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"
import { envi } from "@core/utils/env.mjs"
import { lgg } from "@core/utils/logging/Logger"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { generateText } from "ai"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { clearMCPClientCache, setupMCPForNode } from "../mcp"

describe("browser session persistence tests", () => {
  beforeAll(() => {
    clearMCPClientCache()
  })

  afterAll(() => {
    clearMCPClientCache()
  })

  it("should maintain browser session across multiple generateText calls", async () => {
    lgg.log("Testing persistent browser session across calls...")

    // Step 1: Navigate to a page in first call
    lgg.log("Step 1: First call - navigate to page...")
    const tools1 = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-1"
    )

    const navResult = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content: "Navigate to https://nos.nl",
        },
      ],
      tools: tools1,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_navigate",
      },
    })

    lgg.log("Navigation completed:", navResult.text)

    // Step 2: Get page state in second call (should reuse same browser)
    lgg.log("Step 2: Second call - get page state...")
    const tools2 = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-2"
    )

    const stateResult = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content: "Get the current page state to see what's on the page",
        },
      ],
      tools: tools2,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_get_state",
      },
    })

    lgg.log("State result:", stateResult.text)

    // Check if we got state from nos.nl (indicating session persistence)
    if (stateResult.toolResults && stateResult.toolResults.length > 0) {
      const toolResult = stateResult.toolResults[0] as any
      const content = toolResult?.result?.content
      if (Array.isArray(content)) {
        const stateText = content.map((c: any) => c.text || "").join("\n")
        const isNosNL =
          stateText.includes("nos.nl") ||
          stateText.includes("nieuws") ||
          stateText.includes("news")
        lgg.log("State contains nos.nl content?", isNosNL)

        if (isNosNL) {
          lgg.log("✅ BROWSER SESSION PERSISTED ACROSS CALLS!")
        } else {
          lgg.log("❌ Browser session may not have persisted")
        }
      }
    }

    // Step 3: Try to extract content in third call
    lgg.log("Step 3: Third call - extract content...")
    const tools3 = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-3"
    )

    const extractResult = await generateText({
      model: openai("gpt-4.1-mini"),
      messages: [
        {
          role: "user",
          content: "Extract anything you can extract",
        },
      ],
      tools: tools3,
      maxSteps: 5,
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    lgg.log("Extract result:", JSON.stringify(extractResult, null, 2))
    if (extractResult.toolResults && extractResult.toolResults.length > 0) {
      const toolResult = extractResult.toolResults[0] as any
      const extractedContent = toolResult?.result?.content?.[0]?.text || ""
      lgg.log("Extracted content:", extractedContent)

      const foundContent = extractedContent !== "No content extracted"
      lgg.log("Successfully extracted content?", foundContent)

      if (foundContent) {
        const hasNewsContent =
          extractedContent.toLowerCase().includes("news") ||
          extractedContent.toLowerCase().includes("article")
        lgg.log("Found news content in extracted content?", hasNewsContent)
      }
    }

    await cleanupBrowser(
      await setupMCPForNode(["browserUse"], "test-browser-sessions-4")
    )
    lgg.log("Persistent session test completed ✓")
  }, 120000)

  it("should test if browser session persists between tool calls", async () => {
    lgg.log("testing browser session persistence...")

    const tools = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-5"
    )

    // Make multiple tool calls in a single generateText call to use the same session
    lgg.log("Making multiple tool calls in single session...")
    const result = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content:
            "Navigate to https://httpbin.org/html, then immediately extract all content from the page. Do both actions in sequence.",
        },
      ],
      tools,
      maxSteps: 3,
      toolChoice: "auto",
    })

    lgg.log("Multi-step result:", result.text)
    lgg.log("Tool calls made:", result.toolCalls?.length)
    lgg.log("Tool results:", JSON.stringify(result.toolResults, null, 2))

    // Process steps using processStepsV2
    const processedSteps = processStepsV2(
      result.steps || [],
      getDefaultModels().default
    )

    // Check if we got content extraction
    const extractResults = processedSteps?.agentSteps.filter(
      (output) =>
        output.type === "tool" && output.name === "browser_extract_content"
    )
    lgg.log("Extract content calls:", extractResults?.length)

    if (extractResults && extractResults.length > 0) {
      const extractResult = extractResults[0]
      const extractedText =
        typeof extractResult.return === "string"
          ? extractResult.return
          : JSON.stringify(extractResult.return)
      lgg.log("Extracted content:", extractedText)

      const hasContent =
        extractedText !== "No content extracted" && extractedText.length > 0
      lgg.log("Successfully extracted content?", hasContent)

      if (hasContent) {
        lgg.log("✅ BROWSER SESSION PERSISTENCE WORKS!")
      } else {
        lgg.log("❌ Still getting 'No content extracted'")
      }
    }

    await cleanupBrowser(tools)
    lgg.log("session persistence test completed ✓")
  }, 60000)
})

describe("advanced browser tests", () => {
  it("should get latest headline from nos.nl", async () => {
    lgg.log("testing browser to get latest headline from nos.nl...")

    const tools = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-6"
    )

    // Navigate to nos.nl
    lgg.log("Step 1: Navigating to nos.nl...")
    await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content: "Navigate to https://nos.nl",
        },
      ],
      tools,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_navigate",
      },
    })

    // Extract the main headline
    lgg.log("Step 2: Extracting latest headline...")
    const headlineResult = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content:
            "Find and extract the main headline from the nos.nl homepage. Look for the most prominent news story.",
        },
      ],
      tools,
      maxSteps: 3,
      toolChoice: "auto",
    })

    lgg.log("Headline extraction result:", headlineResult.text)

    // Verify we got a headline
    const hasHeadline =
      headlineResult.text.length > 10 &&
      !headlineResult.text.toLowerCase().includes("no content extracted")

    lgg.log("=== FINAL RESULT ===")
    lgg.log("Successfully extracted headline?", hasHeadline)
    lgg.log("Headline content:", headlineResult.text)

    await cleanupBrowser(tools)
    lgg.log("nos.nl headline test completed ✓")

    // Test passes if we got a headline
    expect(hasHeadline).toBe(true)
  }, 120000)

  it("should debug why browser_extract_content fails", async () => {
    lgg.log("=== DEBUGGING browser_extract_content ===")

    // Check if OPENAI_API_KEY is available
    const hasOpenAIKey = !!envi.OPENAI_API_KEY
    lgg.log("OPENAI_API_KEY available:", hasOpenAIKey)
    lgg.log("OPENAI_API_KEY length:", envi.OPENAI_API_KEY?.length || 0)

    const tools = await setupMCPForNode(
      ["browserUse"],
      "test-browser-sessions-7"
    )

    // Navigate to a simple page first
    lgg.log("Step 1: Navigate to simple page...")
    await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content:
            "Navigate to https://httpbin.org/html - this is a simple test page with basic HTML content",
        },
      ],
      tools,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_navigate",
      },
    })

    lgg.log("Step 2: Test browser_extract_content on simple page...")
    const extractResult = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content: "Extract all text content from this page",
        },
      ],
      tools,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    lgg.log("Extract result:", JSON.stringify(extractResult, null, 2))

    // Also test with explicit parameters
    lgg.log("Step 3: Test with different query...")
    const extractResult2 = await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content:
            "Use browser_extract_content with query 'all visible text' to extract content",
        },
      ],
      tools,
      maxSteps: 1,
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    lgg.log("Extract result 2:", JSON.stringify(extractResult2, null, 2))

    // Check what tools are actually available
    lgg.log("Available tools:", Object.keys(tools))
    lgg.log(
      "browser_extract_content tool details:",
      JSON.stringify(tools.browser_extract_content, null, 2)
    )

    await cleanupBrowser(tools)
    lgg.log("debug test completed")
  }, 60000)
})

// Helper function for browser cleanup
async function cleanupBrowser(tools: any) {
  lgg.log("closing browser...")
  try {
    await generateText({
      model: openai(getDefaultModels().default),
      messages: [
        {
          role: "user",
          content: "Close the browser",
        },
      ],
      tools,
      maxSteps: 1,
    })
    lgg.log("browser cleanup completed")
  } catch (error) {
    lgg.log("browser cleanup failed (this is okay):", error)
  }
}
