# How Models Work in This Codebase

## Critical Learning: Model IDs ≠ Provider Names

**TL;DR:** Never parse the model ID string to determine the provider. Always look it up in the catalog.

## The Model System Architecture

### 1. Model IDs Are Just Identifiers

Model IDs follow a naming convention like `"provider/model-name"`, but this is **purely for human readability**. The string format does NOT determine which API provider will be used.

```typescript
// Examples of model IDs:
"openrouter#openai/gpt-4.1-nano"           // Uses OpenAI API ✓
"anthropic/claude-sonnet-4"     // Uses OpenRouter API! ✓
"openrouter#openai/gpt-oss-20b"            // Uses Groq API! ✓
```

### 2. The Model Catalog Is the Source of Truth

Every model is defined in `packages/models/src/pricing/catalog.ts` with this structure:

```typescript
export interface ModelEntry {
  id: string              // Full ID: "anthropic/claude-sonnet-4"
  provider: string        // Which API to use: "openrouter"
  model: string           // Model identifier for the API
  input: number           // Cost per 1M input tokens
  output: number          // Cost per 1M output tokens
  // ... capabilities, context length, etc.
}
```

Example from the catalog:

```typescript
{
  id: "anthropic/claude-sonnet-4",
  provider: "openrouter",  // ← The ACTUAL provider API to use!
  model: "anthropic/claude-sonnet-4",
  input: 3,
  output: 15,
  // ...
}
```

### 3. Why Model IDs Don't Match Providers

Some models are only available through aggregator services like OpenRouter:

- **Direct Access**: `"openrouter#openai/gpt-4.1-nano"` → provider: `"openai"` → OpenAI API
- **Via OpenRouter**: `"anthropic/claude-sonnet-4"` → provider: `"openrouter"` → OpenRouter API
- **Via Groq**: `"openrouter#openai/gpt-oss-20b"` → provider: `"groq"` → Groq API

The model ID keeps the original vendor name for clarity, but the `provider` field tells you which API to actually call.

## How to Determine Which Provider a Model Uses

### ❌ WRONG: String Parsing

```typescript
// This is COMPLETELY WRONG - DO NOT DO THIS
const modelId = "anthropic/claude-sonnet-4"
const [provider] = modelId.split("/")  // provider = "anthropic"
// But this model actually uses OpenRouter! ❌
```

### ✅ CORRECT: Catalog Lookup

```typescript
import { MODEL_CATALOG } from "@lucky/models/pricing/catalog"

const modelId = "anthropic/claude-sonnet-4"
const catalogEntry = MODEL_CATALOG.find(entry => entry.id === modelId)
const provider = catalogEntry.provider  // "openrouter" ✓
```

## Provider API Key Mapping

Each provider requires its own API key:

```typescript
const PROVIDER_TO_KEY = {
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
}
```

## Real-World Example

When a workflow uses these models:
```typescript
nodes: [
  { modelName: "openrouter#openai/gpt-4.1-nano" },        // Requires OPENAI_API_KEY
  { modelName: "anthropic/claude-sonnet-4" },  // Requires OPENROUTER_API_KEY
  { modelName: "openrouter#openai/gpt-oss-20b" },         // Requires GROQ_API_KEY
]
```

The system must:
1. Look up each model in `MODEL_CATALOG`
2. Extract the `provider` field from each entry
3. Map to the required API keys: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`

## Common Pitfalls

### ❌ Pitfall 1: Assuming model ID format reveals provider
```typescript
if (modelId.startsWith("anthropic/")) {
  // This assumes it uses Anthropic API - WRONG!
  // It might use OpenRouter instead
}
```

### ❌ Pitfall 2: Parsing with string split
```typescript
const [provider, model] = modelId.split("/", 2)
// What if modelId is "openrouter#anthropic/claude-3-5-sonnet"?
// You get provider="openrouter", model="anthropic"
// But that's not the right split!
```

### ❌ Pitfall 3: Hardcoding provider lists
```typescript
// Don't hardcode which models use which provider
if (modelId === "anthropic/claude-sonnet-4") {
  provider = "anthropic"  // WRONG - it's "openrouter"
}
```

## Best Practices

1. **Always use the catalog**: Import `MODEL_CATALOG` and look up the model
2. **Never parse strings**: The model ID format is for humans, not code
3. **Trust the provider field**: The catalog is the single source of truth
4. **Handle missing models**: Not all model IDs are guaranteed to be in the catalog

## Code Example: Provider Extraction

```typescript
import { MODEL_CATALOG } from "@lucky/models/pricing/catalog"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"

function extractRequiredProviders(config: WorkflowConfig) {
  const providers = new Set<string>()

  for (const node of config.nodes) {
    const modelId = node.modelName
    if (!modelId) continue

    // Look up in catalog
    const entry = MODEL_CATALOG.find(e => e.id === modelId)
    if (!entry) {
      console.warn(`Model not in catalog: ${modelId}`)
      continue
    }

    // Use the provider field, not string parsing!
    providers.add(entry.provider)
  }

  return providers
}
```

## Related Files

- **Model Catalog**: `packages/models/src/pricing/catalog.ts`
- **Model Registry**: `packages/models/src/registry/model-registry.ts`
- **Provider Extraction**: `packages/core/src/workflow/provider-extraction.ts`
- **Workflow Schema**: `packages/shared/src/contracts/workflow.ts`

## History

This learning was documented after a critical bug was discovered where provider extraction was incorrectly parsing model ID strings instead of looking them up in the catalog. This would have caused complete failure in production for any workflow using models served through aggregator APIs like OpenRouter.
