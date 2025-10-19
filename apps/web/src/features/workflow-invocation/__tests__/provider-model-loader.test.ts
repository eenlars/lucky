import type { Principal } from "@/lib/auth/principal"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { LLMRegistry } from "@lucky/models"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MissingApiKeysError, NoEnabledModelsError, loadProvidersAndModels } from "../lib/provider-model-loader"

// Mock all dependencies
vi.mock("../lib/config-loader", () => ({
  loadWorkflowConfigFromInput: vi.fn(),
}))

vi.mock("../lib/input-schema-validation", () => ({
  validateInvocationInputSchema: vi.fn(),
}))

vi.mock("../lib/provider-validation", () => ({
  getRequiredProviderKeys: vi.fn(),
  validateProviderKeys: vi.fn().mockReturnValue([]),
  formatMissingProviders: vi.fn().mockImplementation((keys: string[]) => keys),
  FALLBACK_PROVIDER_KEYS: ["openai", "groq", "openrouter"],
}))

vi.mock("../lib/user-provider-settings", () => ({
  fetchUserProviderSettings: vi.fn(),
}))

vi.mock("../lib/model-resolver", () => ({
  resolveAvailableModels: vi.fn(),
  getAllAvailableModels: vi.fn(),
}))

vi.mock("@lucky/models", () => ({
  createLLMRegistry: vi.fn().mockReturnValue({
    forUser: vi.fn().mockReturnValue({}),
  }),
}))

describe("loadProvidersAndModels", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { validateProviderKeys } = await import("../lib/provider-validation")
    vi.mocked(validateProviderKeys).mockReturnValue([])
  })

  it("should load providers and models successfully with workflow config", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { getRequiredProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")
    const { createLLMRegistry } = await import("@lucky/models")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(new Map([["openai", ["gpt-4o", "gpt-3.5-turbo"]]]))

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
      fallbacksUsed: new Map(),
    })

    const mockRegistry = {
      forUser: vi.fn().mockReturnValue({ models: [] }),
      fallbackKeys: {},
    }
    vi.mocked(createLLMRegistry).mockReturnValue(mockRegistry as unknown as LLMRegistry)

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test",
      }),
    }

    const result = await loadProvidersAndModels(input, principal, secrets)

    expect(result.providers).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4o"])
    expect(result.apiKeys.OPENAI_API_KEY).toBe("sk-test")
  })

  it("should use fallback providers when no workflow config", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { FALLBACK_PROVIDER_KEYS } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { getAllAvailableModels } = await import("../lib/model-resolver")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [] as const,
    } satisfies Partial<WorkflowConfig>

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: null,
      source: "none",
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(
      new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
    )

    vi.mocked(getAllAvailableModels).mockReturnValue({
      providers: new Set(["openai", "groq"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
      fallbacksUsed: new Map(),
    })

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test",
        GROQ_API_KEY: "gsk-test",
      }),
    }

    const result = await loadProvidersAndModels(input, principal, secrets)

    expect(result.providers.size).toBe(2)
    expect(secrets.getAll).toHaveBeenCalledWith(FALLBACK_PROVIDER_KEYS, "environment-variables")
  })

  it("should throw MissingApiKeysError for session auth when keys are missing", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { getRequiredProviderKeys, validateProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [] as const,
    } satisfies Partial<WorkflowConfig>

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai", "groq"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(
      new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
    )

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(["openai", "groq"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
      fallbacksUsed: new Map(),
    })

    vi.mocked(validateProviderKeys).mockReturnValue(["groq"])

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test",
        // GROQ_API_KEY missing
      }),
    }

    await expect(loadProvidersAndModels(input, principal, secrets)).rejects.toThrow(MissingApiKeysError)
  })

  it("should not throw MissingApiKeysError for api_key auth", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { getRequiredProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")
    const { createLLMRegistry } = await import("@lucky/models")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(new Map([["openai", ["gpt-4o"]]]))

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
      fallbacksUsed: new Map(),
    })

    const mockRegistry = {
      forUser: vi.fn().mockReturnValue({}),
      fallbackKeys: {},
    }
    vi.mocked(createLLMRegistry).mockReturnValue(mockRegistry as unknown as LLMRegistry)

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({}), // No keys
    }

    // Should not throw even with missing keys for api_key auth
    await expect(loadProvidersAndModels(input, principal, secrets)).resolves.toBeDefined()
  })

  it("should throw NoEnabledModelsError when no providers available", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { getRequiredProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(new Map()) // No enabled models

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(),
      models: new Map(),
      fallbacksUsed: new Map(),
    })

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test",
      }),
    }

    await expect(loadProvidersAndModels(input, principal, secrets)).rejects.toThrow(NoEnabledModelsError)
  })

  it("should validate input schema", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { validateInvocationInputSchema } = await import("../lib/input-schema-validation")
    const { getRequiredProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")
    const { createLLMRegistry } = await import("@lucky/models")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
      },
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(new Map([["openai", ["gpt-4o"]]]))

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(["openai"]),
      models: new Map([["openai", ["gpt-4o"]]]),
      fallbacksUsed: new Map(),
    })

    const mockRegistry = {
      forUser: vi.fn().mockReturnValue({}),
      fallbackKeys: {},
    }
    vi.mocked(createLLMRegistry).mockReturnValue(mockRegistry as unknown as LLMRegistry)

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "mcp-invoke" as const,
        goal: "Test",
        workflowId: "test",
        inputData: { question: "What is AI?" },
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test",
      }),
    }

    await loadProvidersAndModels(input, principal, secrets)

    expect(validateInvocationInputSchema).toHaveBeenCalledWith(input, mockConfig)
  })

  it("should create LLM registry with correct configuration", async () => {
    const { loadWorkflowConfigFromInput } = await import("../lib/config-loader")
    const { getRequiredProviderKeys } = await import("../lib/provider-validation")
    const { fetchUserProviderSettings } = await import("../lib/user-provider-settings")
    const { resolveAvailableModels } = await import("../lib/model-resolver")
    const { createLLMRegistry } = await import("@lucky/models")

    const mockConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    } satisfies WorkflowConfig

    vi.mocked(loadWorkflowConfigFromInput).mockResolvedValue({
      config: mockConfig,
      source: "dsl",
    })

    vi.mocked(getRequiredProviderKeys).mockReturnValue({
      providers: new Set(["openai", "groq"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
    })

    vi.mocked(fetchUserProviderSettings).mockResolvedValue(
      new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
    )

    vi.mocked(resolveAvailableModels).mockReturnValue({
      providers: new Set(["openai", "groq"]),
      models: new Map([
        ["openai", ["gpt-4o"]],
        ["groq", ["llama-3.1-8b"]],
      ]),
      fallbacksUsed: new Map(),
    })

    const mockForUser = vi.fn().mockReturnValue({})
    const mockRegistry = {
      forUser: mockForUser,
      fallbackKeys: {},
    }
    vi.mocked(createLLMRegistry).mockReturnValue(mockRegistry as unknown as LLMRegistry)

    const input = {
      dslConfig: mockConfig,
      evalInput: {
        type: "prompt-only",
        goal: "test",
        workflowId: "test",
      },
    } satisfies InvocationInput

    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const secrets = {
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({
        OPENAI_API_KEY: "sk-test-openai",
        GROQ_API_KEY: "gsk-test-groq",
        OPENROUTER_API_KEY: "or-test",
      }),
    }

    await loadProvidersAndModels(input, principal, secrets)

    expect(createLLMRegistry).toHaveBeenCalledWith({
      fallbackKeys: {
        openai: "sk-test-openai",
        groq: "gsk-test-groq",
        openrouter: "or-test",
      },
    })

    expect(mockForUser).toHaveBeenCalledWith({
      mode: "byok",
      userId: "user_123",
      models: ["gpt-4o", "llama-3.1-8b"],
      apiKeys: {
        openai: "sk-test-openai",
        groq: "gsk-test-groq",
        openrouter: "or-test",
      },
    })
  })
})
