# PR Idea: Dynamic Provider Detection for Pre-flight Validation

**Status:** Ready for Implementation
**Priority:** High
**Effort:** Medium (2-3 days)
**Owner:** Unassigned

## Problem Statement

Currently, the pre-flight validation in `/api/workflow/invoke` checks **all** common provider API keys (OpenRouter, OpenAI, Anthropic, Groq) regardless of which providers the workflow actually uses:

```typescript
// Current code (line 58-64)
if (!apiKeys.OPENROUTER_API_KEY) {
  missingKeys.push("OPENROUTER_API_KEY")
}
if (!apiKeys.OPENAI_API_KEY) {
  missingKeys.push("OPENAI_API_KEY")
}
// TODO: Parse workflow to determine exact providers needed
```

**Issues:**
1. **False blocking:** Users are blocked from running workflows that only need OpenAI if they don't have OpenRouter configured
2. **Poor UX:** Error messages list providers the workflow doesn't even use
3. **Scalability:** Adding new providers requires updating this hardcoded list
4. **Incomplete:** Doesn't check Anthropic or Groq (which we support)

## Proposed Solution

Parse the workflow DSL before execution to determine which providers are actually needed, then validate only those keys.

### Implementation Plan

#### 1. Create Provider Extraction Utility

**File:** `packages/core/src/workflow/provider-extraction.ts`

```typescript
import type { WorkflowDSL } from "@lucky/shared/contracts/workflow"

export type RequiredProviders = {
  providers: Set<string>          // e.g., ["openai", "openrouter"]
  models: Map<string, string[]>   // provider -> model names
}

/**
 * Extract all providers required by a workflow by analyzing node configs
 */
export function extractRequiredProviders(dsl: WorkflowDSL): RequiredProviders {
  const providers = new Set<string>()
  const models = new Map<string, string[]>()

  for (const [nodeId, nodeConfig] of Object.entries(dsl.nodes)) {
    const model = nodeConfig.llm_model
    if (!model) continue

    // Parse model spec: "openai:gpt-4" or "openrouter:anthropic/claude-3-5-sonnet"
    const [provider, modelName] = model.split(":", 2)
    if (!provider || !modelName) {
      console.warn(`[extractProviders] Invalid model format in node ${nodeId}: ${model}`)
      continue
    }

    providers.add(provider)
    if (!models.has(provider)) {
      models.set(provider, [])
    }
    models.get(provider)!.push(modelName)
  }

  return { providers, models }
}

/**
 * Map provider names to their API key environment variable names
 */
export function getProviderKeyName( string): string {
  const mapping: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    groq: "GROQ_API_KEY",
  }
  return mapping[provider] || `${provider.toUpperCase()}_API_KEY`
}
```

#### 2. Add Unit Tests

**File:** `packages/core/src/workflow/provider-extraction.test.ts`

```typescript
import { describe, expect, it } from "vitest"
import { extractRequiredProviders, getProviderKeyName } from "./provider-extraction"

describe("extractRequiredProviders", () => {
  it("should extract single provider", () => {
    const dsl = {
      nodes: {
        agent1: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] }
      }
    }
    const result = extractRequiredProviders(dsl)
    expect(result.providers).toEqual(new Set(["openai"]))
    expect(result.models.get("openai")).toEqual(["gpt-4"])
  })

  it("should extract multiple providers", () => {
    const dsl = {
      nodes: {
        agent1: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] },
        agent2: { llm_model: "openrouter:anthropic/claude-3-5-sonnet", system_prompt: "test", tools: [] }
      }
    }
    const result = extractRequiredProviders(dsl)
    expect(result.providers).toEqual(new Set(["openai", "openrouter"]))
  })

  it("should handle invalid model formats gracefully", () => {
    const dsl = {
      nodes: {
        agent1: { llm_model: "invalid-format", system_prompt: "test", tools: [] }
      }
    }
    const result = extractRequiredProviders(dsl)
    expect(result.providers.size).toBe(0)
  })

  it("should deduplicate models from same provider", () => {
    const dsl = {
      nodes: {
        agent1: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] },
        agent2: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] }
      }
    }
    const result = extractRequiredProviders(dsl)
    expect(result.models.get("openai")).toEqual(["gpt-4", "gpt-4"]) // or dedupe if desired
  })
})

describe("getProviderKeyName", () => {
  it("should map known providers", () => {
    expect(getProviderKeyName("openai")).toBe("OPENAI_API_KEY")
    expect(getProviderKeyName("openrouter")).toBe("OPENROUTER_API_KEY")
    expect(getProviderKeyName("anthropic")).toBe("ANTHROPIC_API_KEY")
    expect(getProviderKeyName("groq")).toBe("GROQ_API_KEY")
  })

  it("should generate key name for unknown providers", () => {
    expect(getProviderKeyName("custom")).toBe("CUSTOM_API_KEY")
  })
})
```

#### 3. Update Pre-flight Validation

**File:** `apps/web/src/app/api/workflow/invoke/route.ts`

```typescript
// Add import
import { extractRequiredProviders, getProviderKeyName } from "@core/workflow/provider-extraction"

// Replace lines 52-64 with:
if (principal.auth_method === "session") {
  // Extract providers actually used by this workflow
  let requiredProviderKeys: string[]
  try {
    const { providers } = extractRequiredProviders(input.workflow.dsl)
    requiredProviderKeys = Array.from(providers).map(getProviderKeyName)
    console.log("[workflow/invoke] Workflow requires providers:", Array.from(providers))
    console.log("[workflow/invoke] Required API keys:", requiredProviderKeys)
  } catch (error) {
    console.error("[workflow/invoke] Failed to extract providers:", error)
    // Fallback to checking common providers if DSL parsing fails
    requiredProviderKeys = ["OPENROUTER_API_KEY", "OPENAI_API_KEY"]
  }

  const missingKeys = requiredProviderKeys.filter(keyName => !apiKeys[keyName])

  if (missingKeys.length > 0) {
    console.error("[workflow/invoke] ❌ Missing required API keys for UI user:", missingKeys)
    return NextResponse.json(
      {
        error: "Missing API Keys",
        message: `This workflow requires API keys that aren't configured: ${missingKeys.join(", ")}`,
        missingKeys,
        action: "Go to Settings > Provider Settings to add your API keys",
      },
      { status: 400 },
    )
  }
}
```

#### 4. Add Integration Test

**File:** `apps/web/src/app/api/workflow/invoke/route.test.ts`

```typescript
import { describe, expect, it, beforeEach } from "vitest"

describe("POST /api/workflow/invoke - Pre-flight Validation", () => {
  it("should allow workflow with only OpenAI when OpenRouter is missing", async () => {
    const workflow = {
      dsl: {
        nodes: {
          agent1: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] }
        }
      }
    }
    // Mock: user has OPENAI_API_KEY but not OPENROUTER_API_KEY
    // Should NOT block execution
  })

  it("should block workflow requiring OpenRouter when key is missing", async () => {
    const workflow = {
      dsl: {
        nodes: {
          agent1: { llm_model: "openrouter:anthropic/claude-3-5-sonnet", system_prompt: "test", tools: [] }
        }
      }
    }
    // Mock: user has no OPENROUTER_API_KEY
    // Should return 400 with specific error
  })

  it("should check all required providers for multi-provider workflows", async () => {
    const workflow = {
      dsl: {
        nodes: {
          agent1: { llm_model: "openai:gpt-4", system_prompt: "test", tools: [] },
          agent2: { llm_model: "anthropic:claude-3-5-sonnet", system_prompt: "test", tools: [] }
        }
      }
    }
    // Mock: user has OPENAI_API_KEY but not ANTHROPIC_API_KEY
    // Should return 400 listing only ANTHROPIC_API_KEY as missing
  })

  it("should fallback gracefully if DSL parsing fails", async () => {
    const workflow = { dsl: { nodes: {} } } // malformed
    // Should not crash, should check common providers as fallback
  })
})
```

## Success Criteria

- [ ] `extractRequiredProviders()` correctly parses workflow DSL and identifies all providers
- [ ] Unit tests pass with 100% coverage for new utility functions
- [ ] Pre-flight validation only checks providers actually used by the workflow
- [ ] Error messages are specific to the workflow's requirements
- [ ] Integration tests verify behavior with various workflow configurations
- [ ] No regressions: existing workflows continue to work
- [ ] Documentation updated in code comments

## Benefits

1. **Better UX:** Users only configure keys they actually need
2. **Clearer errors:** "This workflow needs OpenRouter" vs. "You need OpenRouter and OpenAI"
3. **Scalability:** Adding new providers doesn't require updating validation logic
4. **Performance:** Fewer unnecessary key lookups from database
5. **Security:** More precise validation reduces attack surface

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| DSL parsing fails on malformed workflows | Fallback to checking common providers + log error |
| Model spec format changes | Unit tests will catch this; update parser |
| Performance impact of parsing | Parsing is O(n) where n = node count (trivial) |
| Provider name mismatches (e.g., "openai" vs "OpenAI") | Normalize to lowercase in parser |

## Testing Strategy

1. **Unit tests:** Provider extraction logic with various DSL shapes
2. **Integration tests:** Full API route with mocked auth and secrets
3. **Manual testing:**
   - Create workflow using only OpenAI → verify OpenRouter not required
   - Create multi-provider workflow → verify all providers checked
   - Trigger validation error → verify error message is specific

## Migration Notes

- **Breaking changes:** None (this is purely additive)
- **Database changes:** None
- **Deployment:** Standard deployment, no special steps
- **Rollback plan:** Revert commit (no data changes)

## Follow-up Work

After this PR, consider:
1. **Provider capability detection:** Warn if workflow uses features provider doesn't support
2. **Cost estimation:** Pre-calculate estimated cost based on models used
3. **Provider health checks:** Validate keys are active before workflow starts
4. **Caching:** Cache provider extraction results for identical workflows

## References

- Current implementation: `apps/web/src/app/api/workflow/invoke/route.ts:52-77`
- Workflow DSL type: `packages/shared/src/contracts/workflow.ts`
- Provider registry: `packages/models/src/providers/registry.ts`
- Related PR: #139 (OpenRouter/Groq fixes and pre-flight validation)

---

**Ready to implement?** Assign yourself and create a branch: `feat/dynamic-provider-validation`
