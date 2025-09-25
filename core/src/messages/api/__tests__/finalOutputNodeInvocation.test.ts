import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { describe, expect, it, vi } from "vitest"

// TODO: Extensive environment mocking indicates tight coupling to config
// Consider dependency injection or test helpers
// Minimal runtime mocks to prevent env/config imports from erroring in isolated runs
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    SERPAPI_API_KEY: "test-serp-key",
    TAVILY_API_KEY: "test-tavily-key",
    FIRECRAWL_API_KEY: "test-firecrawl-key",
    SUPABASE_ANON_KEY: "test-supabase-key",
    SUPABASE_PROJECT_ID: "test-project-id",
    OPENROUTER_API_KEY: "test-openrouter-key",
    XAI_API_KEY: "test-xai-key",
    MAPBOX_TOKEN: "test-mapbox-token",
    HF_TOKEN: "test-hf-token",
    HUGGING_FACE_API_KEY: "test-hf-key",
    WEBSHARE_API_KEY: "test-webshare-key",
  },
}))

vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential" as const,
    logging: { override: {} },
    workflow: { handoffContent: "full" as const },
    tools: { experimentalMultiStepLoop: false },
    limits: { rateWindowMs: 10000, maxRequestsPerWindow: 100 },
  },
}))

// TODO: Only tests happy path - need tests for error cases
// TODO: No tests for empty steps array or all non-text steps
describe("getFinalOutputNodeInvocation (preset AgentSteps)", () => {
  it("returns only the final text, ignoring any preceding prepare step", async () => {
    const { getFinalOutputNodeInvocation } = await import("@core/messages/api/processResponse")
    const steps: AgentSteps = [
      { type: "prepare", return: "analysis: do X, then Y" },
      { type: "reasoning", return: "thinking..." },
      { type: "text", return: "final answer text" },
    ]

    const result = getFinalOutputNodeInvocation(steps)
    expect(result).toBe("final answer text")
    expect(result).not.toContain("analysis")
  })

  it("skips empty text and falls back to the last tool output (ignores prepare)", async () => {
    const { getFinalOutputNodeInvocation } = await import("@core/messages/api/processResponse")
    const steps: AgentSteps = [
      { type: "prepare", return: "setup thoughts" },
      {
        type: "tool",
        name: "someTool",
        args: { foo: "bar" },
        return: "tool result value",
      },
      // TODO: Test reveals that whitespace-only text is considered empty
      // Should document this behavior or make it configurable
      { type: "text", return: "   " }, // empty/whitespace → should be skipped
    ]

    const result = getFinalOutputNodeInvocation(steps)
    expect(result).toBe("tool result value")
    expect(result).not.toContain("setup thoughts")
  })
})
