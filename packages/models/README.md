# @lucky/models

Multi-provider AI model management with user isolation, BYOK support, and tier-based selection.

## Overview

Thin wrapper around Vercel AI SDK that handles:

- Per-user model access control
- BYOK (Bring Your Own Key) vs shared API keys
- Tier-based model selection (cheap/fast/smart/balanced)
- Centralized pricing catalog with 50+ models
- Provider instance caching

## Quick Start

```typescript
import { createLLMRegistry } from "@lucky/models";
import { generateText } from "ai";

// 1. Initialize once at startup
const registry = createLLMRegistry({
  fallbackKeys: {
    openai: process.env.OPENAI_API_KEY,
    groq: process.env.GROQ_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  },
});

// 2. Create user instance per request
const userModels = registry.forUser({
  mode: "byok", // or "shared"
  userId: "user-123",
  models: ["openai#gpt-4o", "groq#llama-3.1-70b-versatile"],
  apiKeys: {
    openai: "sk-user-provided-key",
    groq: "gsk-user-provided-key",
  },
});

// 3. Get models
const model = userModels.model("openai#gpt-4o");
const result = await generateText({ model, prompt: "..." });

// Or use tier selection
const cheapest = userModels.tier("cheap"); // picks from user's models
```

## Core Concepts

### User Isolation

Each user gets their own `UserModels` instance with:

- **Allowed models list** - User can only access these models
- **Mode selection** - BYOK (user's keys) or shared (company keys)
- **Tier selection** - Picks from user's models only, not entire catalog

```typescript
// User A with high-end models
const userA = registry.forUser({
  mode: "shared",
  userId: "user-a",
  models: ["openai#gpt-4o", "openai#gpt-4-turbo"]
})

// User B with budget models
const userB = registry.forUser({
  mode: "byok",
  userId: "user-b",
  models: ["openai#gpt-4o-mini", ""groq#openai/gpt-oss-20b""],
  apiKeys: { openai: "sk-...", groq: "gsk-..." }
})

// tier("cheap") returns different models for each user
userA.tier("cheap")  // → gpt-4o (cheapest in user A's list)
userB.tier("cheap")  // → llama-3.1-8b-instant (cheapest in user B's list)
```

### BYOK vs Shared Modes

**BYOK Mode** - User provides their own API keys:

```typescript
const userModels = registry.forUser({
  mode: "byok",
  userId: "user-123",
  models: ["openai#gpt-4o"],
  apiKeys: {
    openai: "sk-user-provided-key", // User's own key
  },
});
```

**Shared Mode** - Uses company's fallback keys:

```typescript
const userModels = registry.forUser({
  mode: "shared",
  userId: "user-456",
  models: ["openai#gpt-4o-mini"],
  // Uses fallbackKeys from registry initialization
});
```

### Tier Selection

Tiers select only from user's configured models:

- **`cheap`** - Lowest cost (avg of input/output pricing)
- **`fast`** - Fastest speed rating, then cheapest among fast
- **`smart`** - Highest intelligence score
- **`balanced`** - Best intelligence-to-cost ratio

```typescript
const userModels = registry.forUser({
  mode: "shared",
  userId: "user-123",
  models: [
    "openai#gpt-4o",           // intelligence: 9, cost: $2.50/$10
    "openai#gpt-4o-mini",      // intelligence: 8, cost: $0.15/$0.60
    ""groq#openai/gpt-oss-20b"" // intelligence: 7, cost: $0.05/$0.08
  ]
})

userModels.tier("cheap")    // → llama-3.1-8b-instant
userModels.tier("smart")    // → gpt-4o
userModels.tier("fast")     // → gpt-4o-mini (if marked as "fast")
userModels.tier("balanced") // → best intelligence/cost ratio
```

## API Reference

### `createLLMRegistry(config)`

Initialize the registry with fallback API keys.

```typescript
const registry = createLLMRegistry({
  fallbackKeys: {
    openai?: string
    groq?: string
    openrouter?: string
  }
})
```

### `registry.forUser(config)`

Create a user-specific models instance.

```typescript
const userModels = registry.forUser({
  mode: "byok" | "shared",
  userId: string,
  models: string[],           // e.g., ["openai#gpt-4o", "groq#llama-3.1-70b-versatile"]
  apiKeys?: {                 // Required for mode="byok"
    openai?: string
    groq?: string
    openrouter?: string
  }
})
```

### `userModels.model(name)`

Get a model by name. Returns AI SDK `LanguageModel`.

```typescript
// With provider prefix (recommended)
const model = userModels.model("openai#gpt-4o");

// Auto-detect from user's list
const model = userModels.model("gpt-4o"); // finds openai#gpt-4o

// OpenRouter models use full path
const model = userModels.model("openrouter#openai/gpt-4o");
```

**Error cases:**

- Model not in catalog → `"Model not found: {name}"`
- Model not in user's list → `"Model \"{name}\" not in user's allowed models"`
- Provider not configured → `"Provider not configured: {provider}"`

### `userModels.tier(tierName)`

Select model by tier from user's models. Returns AI SDK `LanguageModel`.

```typescript
const model = userModels.tier("cheap" | "fast" | "smart" | "balanced");
```

### `userModels.getCatalog()`

Get the full model catalog (all models, not just user's). Returns defensive copy.

```typescript
const catalog = userModels.getCatalog(); // ModelEntry[]
```

## Model Catalog

### Model ID Format

All models use the format: `{provider}#{model}`

- **OpenAI**: `openai#gpt-4o`, `openai#gpt-4o-mini`
- **Groq**: `groq#llama-3.1-70b-versatile`, `"groq#openai/gpt-oss-20b"`
- **OpenRouter**: `openrouter#openai/gpt-4o`, `openrouter#meta-llama/llama-3.1-70b`

### ModelEntry Structure

```typescript
interface ModelEntry {
  id: string; // "openai#gpt-4o"
  provider: "openai" | "groq" | "openrouter";
  model: string; // API model name
  input: number; // $ per 1M input tokens
  output: number; // $ per 1M output tokens
  cachedInput?: number; // $ per 1M cached input tokens
  contextLength: number;
  intelligence: number; // 1-10 scale
  speed: "fast" | "medium" | "slow";
  pricingTier: "low" | "medium" | "high";
  supportsTools: boolean;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  runtimeEnabled: boolean;
}
```

### Catalog Utilities

```typescript
import {
  findModelById,
  findModelByName,
  getCatalog,
  getModelsByProvider,
  getRuntimeEnabledModels,
} from "@lucky/models";

// Find specific model
const model = findModelById("openai#gpt-4o");
const model = findModelByName("gpt-4o"); // searches across providers

// Get all models
const allModels = getCatalog();

// Filter by provider
const openaiModels = getModelsByProvider("openai");

// Only runtime-enabled models
const activeModels = getRuntimeEnabledModels();
```

## Provider Configuration

### Supported Providers

- **OpenAI** - Direct access to GPT models
- **Groq** - Fast inference for Llama and Mixtral models
- **OpenRouter** - Gateway to 50+ models from multiple providers

### Provider Validation

```typescript
import {
  validateProviderKeys,
  getRequiredProviderKeys,
  formatMissingProviders,
} from "@lucky/models";

// Check which providers need keys
const required = getRequiredProviderKeys(); // ["openai", "groq", "openrouter"]

// Validate configuration
const validation = validateProviderKeys({
  openai: process.env.OPENAI_API_KEY,
  groq: undefined, // missing
});

if (!validation.isValid) {
  console.error(formatMissingProviders(validation.missing));
  // "Missing API keys for: Groq (GROQ_API_KEY)"
}
```

## Examples

### Multi-User Application

```typescript
import { createLLMRegistry } from "@lucky/models";

// Initialize once
const registry = createLLMRegistry({
  fallbackKeys: {
    openai: process.env.COMPANY_OPENAI_KEY,
    groq: process.env.COMPANY_GROQ_KEY,
  },
});

// Request handler
app.post("/api/chat", async (req, res) => {
  const user = await getUserFromToken(req);

  const userModels = registry.forUser({
    mode: user.hasOwnKeys ? "byok" : "shared",
    userId: user.id,
    models: user.selectedModels, // from user preferences
    apiKeys: user.hasOwnKeys ? user.apiKeys : undefined,
  });

  const model = userModels.tier(req.body.tier || "balanced");
  const result = await generateText({ model, prompt: req.body.prompt });

  res.json({ result });
});
```

### Tier Selection with Fallback

```typescript
const userModels = registry.forUser({
  mode: "shared",
  userId: "user-123",
  models: ["openai#gpt-4o", "openai#gpt-4o-mini"],
});

try {
  // Try smart tier first
  const model = userModels.tier("smart");
  const result = await generateText({ model, prompt });
} catch (error) {
  // Fallback to cheapest
  const model = userModels.tier("cheap");
  const result = await generateText({ model, prompt });
}
```

### Dynamic Model Selection

```typescript
function getModelForTask(userModels: UserModels, task: string) {
  const taskTiers = {
    "code-generation": "smart",
    translation: "balanced",
    summarization: "cheap",
    "real-time-chat": "fast",
  };

  const tier = taskTiers[task] || "balanced";
  return userModels.tier(tier);
}

const model = getModelForTask(userModels, "code-generation");
```

## Architecture

```
Registry (initialized once)
  ├─ Fallback API keys (company keys)
  └─ forUser() creates UserModels instances

UserModels (per request)
  ├─ User ID
  ├─ Mode (BYOK or shared)
  ├─ Allowed models list
  ├─ API keys (user's or fallback)
  ├─ Provider instances (cached)
  └─ Methods:
      ├─ model(name) → LanguageModel
      ├─ tier(name) → LanguageModel
      └─ getCatalog() → ModelEntry[]
```

## Design Principles

1. **Synchronous by default** - All methods return immediately except AI SDK calls
2. **User isolation** - Each user's instance is independent
3. **Explicit mode selection** - No implicit BYOK/shared detection
4. **Minimal validation** - Let AI SDK handle provider errors
5. **Thin wrapper** - Pass through to AI SDK, don't replace it
6. **Catalog-based** - Build-time model catalog, no runtime updates
