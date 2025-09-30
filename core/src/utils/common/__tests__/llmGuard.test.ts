import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { setupCoreTest } from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { llmGuard } from "../llmGuard"

// Mock the exact module that exports sendAI
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn(),
}))

const mockSendAI = vi.mocked(sendAI)

/**
 * Unit tests for llmGuard function
 * These tests mock the AI calls to test the guard logic without making real API requests
 * For integration tests with real AI calls, see llmGuard.integration.test.ts (if exists)
 */
describe("llmGuard", () => {
  // TODO: test improvements needed:
  // 1. all tests have 10-second timeout which seems excessive for unit tests with mocked API
  // 2. no tests for rate limiting scenarios
  // 3. no tests for partial/malformed API responses
  // 4. no tests for very large content validation
  // 5. no tests for timeout scenarios
  // 6. mock responses might not match actual API response structure
  // 7. no tests for cost tracking validation
  // 8. no tests for different language content validation
  beforeEach(() => {
    setupCoreTest()
    vi.clearAllMocks()
  })

  it("should validate news content and return valid result", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: { status: "OK" } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const newsContent =
      "Breaking news: Dutch parliament discusses new climate policies. Headlines include major environmental reforms and renewable energy initiatives."

    const result = await llmGuard(
      newsContent,
      "The content must be news-related content. It should contain news headlines, article titles, or breaking news information.",
    )

    expect(result.isValid).toBe(true)
    expect(result.reason).toBeUndefined()
  }, 10000)

  it("should reject non-news content and provide reason", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        status: "ERROR",
        reason: "Content contains cooking recipes, not news content",
      } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const nonNewsContent =
      "Welcome to our cooking blog! Here are some delicious recipes for pasta and pizza. Check out our latest cooking tips and kitchen gadgets."

    const result = await llmGuard(
      nonNewsContent,
      "The content must be news-related content from a news website. It should contain news headlines, article titles, or breaking news information. The content should NOT be cooking recipes, blog posts, or non-news content.",
    )

    expect(result.isValid).toBe(false)
    expect(result.reason).toBeDefined()
    expect(typeof result.reason).toBe("string")
    expect(result.reason!.length).toBeGreaterThan(0)
  }, 10000)

  it("should validate technical content correctly", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: { status: "OK" } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const technicalContent = "function calculateSum(a, b) { return a + b; } console.log('Hello World');"

    const result = await llmGuard(
      technicalContent,
      "The content must be JavaScript code. It should contain functions, variables, or programming logic.",
    )

    expect(result.isValid).toBe(true)
    expect(result.reason).toBeUndefined()
  }, 10000)

  it("should reject inappropriate content with detailed reason", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        status: "ERROR",
        reason: "Content contains advertisements and sales pitches, not educational material",
      } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const inappropriateContent =
      "This is some random text about shopping and advertisements. Buy now! Special offers available!"

    const result = await llmGuard(
      inappropriateContent,
      "The content must be educational or informational content. It should NOT contain advertisements, promotional material, or sales pitches.",
    )

    expect(result.isValid).toBe(false)
    expect(result.reason).toBeDefined()
    expect(typeof result.reason).toBe("string")
    expect(result.reason!.length).toBeGreaterThan(0)
  }, 10000)

  it("should handle whitespace-only content", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        status: "ERROR",
        reason: "Content contains only whitespace characters",
      } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const whitespaceContent = "   \n\t   "

    const result = await llmGuard(
      whitespaceContent,
      "The content must contain meaningful non-whitespace text. Content with only spaces, tabs, and newlines is not allowed.",
    )

    expect(result.isValid).toBe(false)
    expect(result.reason).toBeDefined()
  }, 10000)

  it("should validate Dutch news content specifically", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: { status: "OK" } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const dutchNewsContent =
      "Nieuws vandaag: Regering kondigt nieuwe maatregelen aan. Breaking: Belangrijke ontwikkelingen in de politiek."

    const result = await llmGuard(
      dutchNewsContent,
      "The content must be Dutch news content. It should contain Dutch news headlines, article titles, or breaking news information in Dutch language.",
    )

    expect(result.isValid).toBe(true)
    expect(result.reason).toBeUndefined()
  }, 10000)

  it("should provide specific reason for language mismatch", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        status: "ERROR",
        reason: "Content is in English, but only Dutch language is allowed",
      } as any,
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    } as any)

    const englishContent = "Breaking news: New policies announced by government officials today."

    const result = await llmGuard(
      englishContent,
      "The content must be in Dutch language only. English content is not allowed.",
    )

    expect(result.isValid).toBe(false)
    expect(result.reason).toBeDefined()
    expect(typeof result.reason).toBe("string")
    expect(result.reason!.length).toBeGreaterThan(0)
  }, 10000)

  it("should default to valid when API call fails", async () => {
    mockSendAI.mockResolvedValue({
      success: false,
      data: undefined as any,
      error: "API call failed",
      usdCost: 0,
    } as any)

    const content = "Any content"
    const result = await llmGuard(content, "Some guard rules")

    expect(result.isValid).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it("should handle missing data in successful response", async () => {
    mockSendAI.mockResolvedValue({
      success: true,
      data: null as any,
      usdCost: 0,
    } as any)

    const content = "Any content"
    const result = await llmGuard(content, "Some guard rules")

    expect(result.isValid).toBe(true)
    expect(result.reason).toBeUndefined()
  })
})
