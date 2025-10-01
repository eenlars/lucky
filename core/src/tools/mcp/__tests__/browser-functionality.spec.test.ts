import { getDefaultModels } from "@core/core-config/compat"
import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"
import { llmGuard } from "@core/utils/common/llmGuard"
import { lgg } from "@core/utils/logging/Logger"
import { openrouter } from "@openrouter/ai-sdk-provider"
import { generateText, stepCountIs } from "ai"
import { describe, expect, it } from "vitest"
import { setupMCPForNode } from "../mcp"

describe.skip("browser functionality tests", () => {
  // TODO: These are integration tests that require actual browser automation and internet access.
  // They should be in a separate integration test suite, not mixed with unit tests.
  // Also, they depend on external website (nos.nl) which can change and break tests.
  it("should extract headlines from nos.nl", async () => {
    lgg.log("setting up browserUse mcp for nos.nl headline extraction test...")

    const tools = await setupMCPForNode(["browserUse"], "test-browser-functionality-headlines")
    expect(Object.keys(tools)).toContain("browser_extract_content")
    lgg.log("browser_extract_content tool available")

    // Navigate to nos.nl
    lgg.log("Navigating to nos.nl...")
    const navResult = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Navigate to https://nos.nl and wait for the page to fully load",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_navigate",
      },
    })

    lgg.log("Navigation completed:", navResult.text)
    await new Promise(resolve => setTimeout(resolve, 2000))
    // TODO: Using arbitrary sleep times is unreliable. Should wait for specific page elements
    // or use proper page load detection instead of hardcoded delays.

    // Test content extraction with different prompts
    lgg.log("Testing browser_extract_content for headline extraction...")

    const extractTest1 = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Extract all headlines from the current page",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    const extractTest2 = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Extract main article titles and headlines, focusing on news content",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    const extractTest3 = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Find and extract breaking news headlines and article titles from this Dutch news site",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_extract_content",
      },
    })

    // Analyze results
    const analyzeExtraction = (result: any) => {
      // TODO: Using 'any' type defeats TypeScript's purpose. Should define proper types
      // for the result structure to ensure type safety.
      if (result?.toolResults?.length > 0) {
        const toolResult = result.toolResults[0]
        lgg.log("Tool call successful:", toolResult.toolName === "browser_extract_content")

        const content = toolResult.result?.content
        if (Array.isArray(content)) {
          const extractedText = content.map((c: any) => c.text || "").join(" ")
          lgg.log("Extracted content length:", extractedText.length)
          lgg.log("First 200 chars:", extractedText.substring(0, 200))
          return extractedText
        } else if (typeof content === "string") {
          lgg.log("Content is string:", content)
          return content
        } else {
          lgg.log("Content type:", typeof content)
          lgg.log("Content value:", content)
          return ""
        }
      }
      return ""
    }

    const content1 = analyzeExtraction(extractTest1)
    const content2 = analyzeExtraction(extractTest2)
    const content3 = analyzeExtraction(extractTest3)

    const anyContentExtracted = content1.length > 0 || content2.length > 0 || content3.length > 0
    lgg.log("Any content extracted?", anyContentExtracted)

    const allContent = `${extractTest1.text} ${extractTest2.text} ${extractTest3.text} ${content1} ${content2} ${content3}`

    // Validate content is actually news using llmGuard
    lgg.log("Validating extracted content is news content using llmGuard...")
    const newsGuard = await llmGuard(
      allContent,
      `The content must be news-related content from a Dutch news website. It should contain news headlines, article titles, or breaking news information. The content should NOT be generic website navigation, advertisements, or non-news content.`,
    )

    lgg.log("News content validation result:", newsGuard.isValid)
    if (!newsGuard.isValid) {
      lgg.log("News validation failed. Reason:", newsGuard.reason)
    }

    const foundNewsContent =
      allContent.toLowerCase().includes("nieuws") ||
      allContent.toLowerCase().includes("breaking") ||
      allContent.toLowerCase().includes("live")
    lgg.log("Found news-related keywords?", foundNewsContent)
    // TODO: This keyword search is language-specific (Dutch) and brittle.
    // The test will fail if the website changes its content or language.

    expect(extractTest1.toolCalls?.length).toBeGreaterThan(0)
    expect(extractTest1.toolCalls?.[0]?.toolName).toBe("browser_extract_content")

    if (!anyContentExtracted) {
      lgg.log("WARNING: browser_extract_content is returning 'No content extracted' for all attempts")
      // TODO: This test can pass even when no content is extracted! The test should fail
      // if extraction doesn't work, not just log a warning.
    } else {
      expect(newsGuard.isValid).toBe(true)
    }

    // Clean up
    await cleanupBrowser(tools)
    lgg.log("nos.nl headline extraction test completed ✓")
  }, 60000)
  // TODO: 60 second timeout suggests this test is slow and resource-intensive.
  // Should be moved to E2E test suite with proper test infrastructure.

  it("should get page state from nos.nl", async () => {
    lgg.log("setting up browserUse mcp for nos.nl page state test...")

    const tools = await setupMCPForNode(["browserUse"], "test-browser-functionality-state")
    expect(Object.keys(tools)).toContain("browser_get_state")
    lgg.log("browser_get_state tool available")

    // Navigate to nos.nl
    const _navResult = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Navigate to https://nos.nl and wait for the page to fully load",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_navigate",
      },
    })

    lgg.log("Navigation completed")
    await new Promise(resolve => setTimeout(resolve, 3000))
    // TODO: Another hardcoded sleep - 3 seconds this time. Inconsistent with 2 seconds above.

    // Get page state
    lgg.log("Getting page state...")
    const stateResult = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Get the current page state to see all elements and text on the page",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_get_state",
      },
    })

    lgg.log("State result text:", stateResult.text)

    // Process steps using processStepsV2
    const processedSteps = processStepsV2(stateResult.steps || [], getDefaultModels().default)

    const stateResults = processedSteps?.agentSteps.filter(
      output => output.type === "tool" && output.name === "browser_get_state",
    )

    if (stateResults && stateResults.length > 0) {
      const result = stateResults[0]
      lgg.log("Tool result:", JSON.stringify(result, null, 2))

      const content = typeof result.return === "object" ? (result.return as any) : null
      if (content && Array.isArray(content.content)) {
        const stateText = content.content.map((c: any) => c.text || "").join("\n")
        lgg.log("=== PAGE STATE ===")
        lgg.log(stateText)
        lgg.log("=== END PAGE STATE ===")

        // Validate page state contains news content using llmGuard
        lgg.log("Validating page state contains news content using llmGuard...")
        const stateNewsGuard = await llmGuard(
          stateText,
          `The content must be from a Dutch news website page state. It should contain news headlines, article titles, navigation elements typical of news sites, or breaking news information. The content should NOT be generic error pages, blank pages, or non-news content.`,
        )

        lgg.log("Page state news validation result:", stateNewsGuard.isValid)
        if (!stateNewsGuard.isValid) {
          lgg.log("Page state news validation failed. Reason:", stateNewsGuard.reason)
        }

        const foundNewsContent =
          stateText.toLowerCase().includes("nieuws") || stateText.toLowerCase().includes("breaking")
        lgg.log("Found news content keywords in page state?", foundNewsContent)

        const hasTextContent = stateText.trim().length > 50
        lgg.log("Has substantial text content?", hasTextContent)

        if (hasTextContent) {
          expect(stateNewsGuard.isValid).toBe(true)
        }
        // TODO: This conditional expectation means the test can pass without actually
        // validating anything if hasTextContent is false.
      } else {
        const stateText = typeof result.return === "string" ? result.return : JSON.stringify(result.return)
        lgg.log("=== PAGE STATE (as string) ===")
        lgg.log(stateText)
        lgg.log("=== END PAGE STATE ===")
      }
    }

    // Try clicking around to see if content loads dynamically
    lgg.log("Checking for dynamic content...")
    const clickResult = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Click on any news article headline to see if more content loads",
        },
      ],
      tools,
      stopWhen: stepCountIs(2),
      toolChoice: "auto",
    })

    lgg.log("Click exploration result:", clickResult.text)

    // Get state again after interaction
    const _finalStateResult = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Get the page state again to see if any new content appeared",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
      toolChoice: {
        type: "tool",
        toolName: "browser_get_state",
      },
    })

    lgg.log("Final state check completed")

    await cleanupBrowser(tools)
    lgg.log("nos.nl page state test completed ✓")
  }, 60000)
  // TODO: Another 60 second timeout. Pattern of slow integration tests mixed with unit tests.

  it("should navigate and extract headlines in single session", async () => {
    lgg.log("Testing browser session functionality for headline extraction...")

    const tools = await setupMCPForNode(["browserUse"], "test-browser-functionality-session")

    const result = await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content:
            "Navigate to https://nos.nl and extract all the main headlines from the page. First navigate to the site, then extract news headlines and article titles.",
        },
      ],
      tools,
      stopWhen: stepCountIs(8),
      toolChoice: "auto",
    })

    lgg.log("Result:", result.text)
    lgg.log("Tool calls made:", result.toolCalls?.length || 0)

    // Validate session result contains news content using llmGuard
    lgg.log("Validating session result contains news headlines using llmGuard...")
    const sessionNewsGuard = await llmGuard(
      result.text,
      `The result must contain extracted news headlines or article titles from a Dutch news website. It should include actual news content, headlines, or breaking news information. The content should NOT be navigation errors, technical issues, or non-news content.`,
    )

    lgg.log("Session news validation result:", sessionNewsGuard.isValid)
    if (!sessionNewsGuard.isValid) {
      lgg.log("Session news validation failed. Reason:", sessionNewsGuard.reason)
    }

    const foundNewsContent =
      result.text.toLowerCase().includes("nieuws") ||
      result.text.toLowerCase().includes("breaking") ||
      result.text.toLowerCase().includes("headline")
    lgg.log("Found news content keywords?", foundNewsContent)

    expect(sessionNewsGuard.isValid).toBe(true)

    await cleanupBrowser(tools)
    lgg.log("Headline extraction test completed")
  }, 120000)
  // TODO: 120 second timeout! This is way too long for a regular test.
  // Definitely belongs in a separate E2E/integration test suite.
})

// Helper function for browser cleanup
async function cleanupBrowser(tools: any) {
  // TODO: Using 'any' type again. Should define proper tool types.
  lgg.log("closing browser...")
  try {
    await generateText({
      model: openrouter(getDefaultModels().medium),
      messages: [
        {
          role: "user",
          content: "Close the browser",
        },
      ],
      tools,
      stopWhen: stepCountIs(1),
    })
    lgg.log("browser cleanup completed")
  } catch (error) {
    lgg.log("browser cleanup failed (this is okay):", error)
    // TODO: Silently ignoring cleanup failures can lead to resource leaks.
    // Should at least track/report these failures for debugging.
  }
}
