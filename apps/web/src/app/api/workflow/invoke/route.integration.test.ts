import { FALLBACK_PROVIDER_KEYS } from "@/lib/workflow/provider-validation"
import { extractRequiredProviders, getProviderKeyName } from "@lucky/core/workflow/provider-extraction"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { describe, expect, it } from "vitest"

/**
 * Integration tests for workflow invoke API route provider validation logic
 * These tests verify the provider extraction and validation flow used in the API routes
 */
describe("Workflow Invoke API - Provider Validation", () => {
  describe("Single provider workflows", () => {
    it("should extract only OpenAI provider for OpenAI-only workflow", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "You are a helpful assistant",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      expect(providers.size).toBe(1)
      expect(providers.has("openai")).toBe(true)
      expect(requiredKeys).toEqual(["OPENAI_API_KEY"])
    })

    it("should extract only OpenRouter provider for OpenRouter-served model", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "Anthropic model via OpenRouter",
            systemPrompt: "You are a helpful assistant",
            modelName: "anthropic/claude-sonnet-4",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      expect(providers.size).toBe(1)
      expect(providers.has("openrouter")).toBe(true)
      expect(requiredKeys).toEqual(["OPENROUTER_API_KEY"])
    })
  })

  describe("Multi-provider workflows", () => {
    it("should extract all required providers from multi-provider workflow", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "You are a helpful assistant",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: ["agent2"],
          },
          {
            nodeId: "agent2",
            description: "Anthropic model via OpenRouter",
            systemPrompt: "You are a helpful assistant",
            modelName: "anthropic/claude-sonnet-4",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      expect(providers.size).toBe(2)
      expect(providers.has("openai")).toBe(true)
      expect(providers.has("openrouter")).toBe(true)
      expect(requiredKeys).toContain("OPENAI_API_KEY")
      expect(requiredKeys).toContain("OPENROUTER_API_KEY")
    })

    it("should handle workflow with openai and groq providers", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "test",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "agent2",
            description: "Groq agent",
            systemPrompt: "test",
            modelName: "openai/gpt-oss-20b",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      expect(providers.size).toBe(2)
      expect(requiredKeys).toContain("OPENAI_API_KEY")
      expect(requiredKeys).toContain("GROQ_API_KEY")
    })
  })

  describe("Missing key validation simulation", () => {
    it("should identify missing keys for required providers", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "test",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      // Simulate API keys object (user has no keys configured)
      const apiKeys: Record<string, string | undefined> = {}
      const missingKeys = requiredKeys.filter(keyName => !apiKeys[keyName])

      expect(missingKeys).toEqual(["OPENAI_API_KEY"])
    })

    it("should not flag keys as missing when they are present", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "test",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      // Simulate API keys object (user has OpenAI configured)
      const apiKeys: Record<string, string | undefined> = {
        OPENAI_API_KEY: "sk-test-key",
      }
      const missingKeys = requiredKeys.filter(keyName => !apiKeys[keyName])

      expect(missingKeys).toEqual([])
    })

    it("should identify only the missing keys in multi-provider workflow", () => {
      const config: WorkflowConfig = {
        nodes: [
          {
            nodeId: "agent1",
            description: "OpenAI agent",
            systemPrompt: "test",
            modelName: "openai/gpt-4.1-nano",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
          {
            nodeId: "agent2",
            description: "OpenRouter agent",
            systemPrompt: "test",
            modelName: "anthropic/claude-sonnet-4",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "agent1",
      }

      const { providers } = extractRequiredProviders(config)
      const requiredKeys = Array.from(providers).map(getProviderKeyName)

      // Simulate API keys object (user has OpenAI but not OpenRouter)
      const apiKeys: Record<string, string | undefined> = {
        OPENAI_API_KEY: "sk-test-key",
      }
      const missingKeys = requiredKeys.filter(keyName => !apiKeys[keyName])

      expect(missingKeys).toEqual(["OPENROUTER_API_KEY"])
    })
  })

  describe("Fallback behavior", () => {
    it("should use fallback keys when workflow config is malformed", () => {
      // Test uses the real FALLBACK_PROVIDER_KEYS constant from provider-validation
      // This ensures the test fails if the fallback list drifts
      const fallbackKeys = [...FALLBACK_PROVIDER_KEYS]

      expect(fallbackKeys).toContain("OPENROUTER_API_KEY")
      expect(fallbackKeys).toContain("OPENAI_API_KEY")
      expect(fallbackKeys).toContain("ANTHROPIC_API_KEY")
      expect(fallbackKeys).toContain("GROQ_API_KEY")
      expect(fallbackKeys).toHaveLength(4)
    })
  })
})
