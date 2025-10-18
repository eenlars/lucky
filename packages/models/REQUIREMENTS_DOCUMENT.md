# Models Package Requirements

## Overview

Simplified AI model management package providing a thin wrapper around the AI SDK, supporting multiple providers, user-specific model selection, and both BYOK (Bring Your Own Key) and shared API key scenarios.

## Core Design Principles

- **Extremely simple** - Direct pass-through to AI SDK
- **No validation** - Let AI SDK handle errors
- **Sync methods** - Everything returns immediately
- **User isolation** - Each user gets their own instance
- **Flexible keys** - Support both user keys and company keys

## API Design

### Two-Step Pattern

1. **Initialize Registry** - Create once at startup with fallback keys
2. **Create User Instance** - Per-user instances with explicit mode selection

### Package Exports

```typescript
export { createLLMRegistry, LLMRegistry };
export { UserModels };
export type { ModelEntry, FallbackKeys, RegistryConfig, UserConfig };
```

## Key Features

### Supported Providers

- **OpenAI** - Direct API access
- **Groq** - Fast inference models
- **OpenRouter** - Multi-provider gateway

### Model Selection Methods

1. **With provider prefix**: `"openai#gpt-4o-mini"` or `"openrouter#openai/gpt-4o-mini"` - Explicit selection
2. **Auto-detect from name**: `"gpt-4o-mini"` - Finds matching model in user's list
3. **Tier selection**: `tier("cheap")` - Picks from user's models only

### Tier Names

- `cheap` - Lowest cost model from user's list
- `fast` - Fastest model (prefers "fast" speed rating)
- `smart` - Highest intelligence score
- `balanced` - Best intelligence-to-cost ratio

### Error Handling

Always throws errors immediately:

- Model not found in catalog
- Provider not configured
- Model not in user's allowed list
- Tier with empty user models
- BYOK mode without apiKeys

### Model Catalog

- **Build-time generation** from OpenRouter API and static definitions
- **No runtime updates** (keeps methods synchronous)
- **Pricing data** with input/output/cached costs per 1M tokens
- **Capabilities** (tools, vision, streaming, JSON mode)
- **Intelligence scores** (1-10 scale)
- **Speed ratings** (fast/medium/slow)

## Implementation Requirements

### Registry Configuration

- `fallbackKeys` - Company API keys for shared mode
- Clear naming to indicate fallback nature
- Support partial key configuration

### User Configuration

- **Explicit mode selection**: `"byok"` or `"shared"`
- **User ID tracking** for analytics/debugging
- **Model allowlist** - User can only access these models (format: `provider#modelname`)
  - OpenAI: `"openai#gpt-4o"`, `"openai#gpt-4o-mini"`
  - Groq: `"groq#llama-3.1-70b-versatile"`
  - OpenRouter: `"openrouter#openai/gpt-4o"`, `"openrouter#meta-llama/llama-3.1-70b"`
- **API keys** - Required for BYOK, ignored for shared

### Method Signatures (All Synchronous)

- `createLLMRegistry(config)` - Returns registry instance
- `registry.forUser(config)` - Returns UserModels instance
- `userModels.model(name)` - Returns AI SDK LanguageModel
  - Preferred: `"openai#gpt-4o"` (always include provider)
  - Also supports: `"gpt-4o"` (auto-detect from user's list)
- `userModels.tier(tier)` - Returns AI SDK LanguageModel
- `userModels.getCatalog()` - Returns full model catalog array

### Important Constraints

- **User isolation**: Each user's models list is independent
- **Tier constraint**: Tiers select only from user's configured models
- **No validation**: Don't validate API keys (let AI SDK handle it)
- **Sync only**: All methods must be synchronous
- **No `any` types**: Use proper TypeScript types throughout

## Code Examples

### Example 1: Basic Setup

```typescript
import { createLLMRegistry } from "@lucky/models";
import { generateText } from "ai";

// Initialize once at startup
const registry = createLLMRegistry({
  fallbackKeys: {
    openai: process.env.COMPANY_OPENAI_KEY,
    groq: process.env.COMPANY_GROQ_KEY,
    openrouter: process.env.COMPANY_OPENROUTER_KEY,
  },
});

// Per user request handler
function handleUserRequest(userId: string, userConfig: UserConfig) {
  // Create user-specific instance
  const userModels = registry.forUser({
    mode: userConfig.hasOwnKeys ? "byok" : "shared",
    userId: userId,
    models: userConfig.selectedModels, // e.g., ["openai#gpt-4o", "groq#llama-3.1-8b", "openrouter#meta-llama/llama-3.1-70b"]
    apiKeys: userConfig.apiKeys, // Only if mode="byok"
  });

  // Use the model
  const model = userModels.model("openai#gpt-4o"); // Explicit provider selection
  // OR: userModels.model("gpt-4o") - auto-detect finds openai#gpt-4o in user's list
  return generateText({ model, prompt: userConfig.prompt });
}
```

### Example 2: BYOK vs Shared Modes

```typescript
// User with their OWN keys (BYOK)
const byokUser = registry.forUser({
  mode: "byok",
  userId: "user-123",
  models: ["openai#gpt-4o", "groq#llama-3.1-70b-versatile"],
  apiKeys: {
    openai: "sk-user-abc123...",  // User's own OpenAI key
    groq: "gsk-user-xyz789..."     // User's own Groq key
  }
})

// User using COMPANY keys (shared)
const sharedUser = registry.forUser({
  mode: "shared",
  userId: "user-456",
  models: ["openai#gpt-4o-mini", ""groq#openai/gpt-oss-20b""]
  // No apiKeys needed - uses fallbackKeys from registry
})

// Both users can use all selection methods
const model1 = byokUser.model("openai#gpt-4o")              // Direct selection with provider
const model2 = byokUser.model("groq#llama-3.1-70b-versatile") // Full provider#model format
const model3 = sharedUser.tier("cheap")                     // Tier selection
const model4 = sharedUser.model("openai#gpt-4o-mini")       // Always include provider
```

### Example 3: Tier Selection Logic

```typescript
// IMPORTANT: Tiers ONLY select from the user's configured models
// They do NOT access the full catalog

// User has only high-end models configured
const user1 = registry.forUser({
  mode: "shared",
  userId: "user-123",
  models: ["openai#gpt-4o", "openai#gpt-4-turbo"]  // Both expensive models
})

// tier("cheap") picks the cheapest FROM USER'S LIST, not from all available models
const cheapest = user1.tier("cheap")  // Returns gpt-4o ($2.50/$10 cheaper than gpt-4-turbo $10/$30)
// Does NOT return gpt-4o-mini even though it exists in catalog and is cheaper

// User with diverse model selection
const user2 = registry.forUser({
  mode: "shared",
  userId: "user-456",
  models: [
    "openai#gpt-4o",                        // OpenAI direct
    "openai#gpt-4o-mini",                   // OpenAI direct
    "groq#openai/gpt-oss-20b",            // Groq direct
    "openrouter#openai/gpt-4o-mini"         // Same model via OpenRouter
  ]
})

const cheap = user2.tier("cheap")       // Returns llama-3.1-8b (lowest cost)
const smart = user2.tier("smart")       // Returns gpt-4o (highest intelligence)
const fast = user2.tier("fast")         // Returns cheapest "fast" model from list
const balanced = user2.tier("balanced") // Best intelligence/cost ratio
```

## Files to Keep

- ✅ OpenRouter model generation scripts (`scripts/`)
- ✅ Build-time catalog generation (`src/catalog.ts`)
- ✅ Model pricing data (`src/pricing-generation/`)
- ✅ Test suite (`src/__tests__/`)

## Success Criteria

1. All methods are synchronous
2. Clear separation between registry and user instances
3. Explicit mode selection (no implicit behavior)
4. Comprehensive error messages
5. Full test coverage for all requirements
6. TypeScript types from shared contracts
7. No duplication of AI SDK functionality
