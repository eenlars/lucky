# Tier Resolution System

## Overview

The tier resolution system automatically maps model names to tier abstractions based on your current provider configuration. This provides better abstraction and makes it easier to switch providers or adjust model configurations without changing your code.

## How It Works

### Tier Configuration

Your application defines model tiers in `runtime/settings/models.ts`:

```typescript
export const DEFAULT_MODELS = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1",
    default: "openai/gpt-4.1-nano",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  groq: {
    // Different models for groq provider
  },
  openai: {
    // Direct OpenAI models
  },
}
```

### Automatic Resolution

When you request a model, the tier resolver checks if the model name matches any tier's configured model. If it does, it automatically resolves to that tier.

**Example:**

If `openai/gpt-4.1-mini` is configured as the `medium` tier model:

```typescript
// These two are equivalent:
const model1 = await getModel({ model: 'openai/gpt-4.1-mini' })
const model2 = await getModel({ model: 'tier:medium' })

// Both resolve to tier:medium internally
```

### Why This Matters

1. **Better Abstraction**: Code uses semantic tiers (fast, high, reasoning) instead of hardcoded model names
2. **Easy Configuration**: Change tier models in one place, all code updates automatically
3. **Provider Independence**: Switch providers without touching application code
4. **Flexibility**: Override tier models per user or experiment via YAML configs

## Available Tiers

| Tier | Purpose | Typical Use Case |
|------|---------|------------------|
| `summary` | Quick summaries | Fast, cheap operations |
| `nano` | Ultra-fast, minimal | Simple tasks, high volume |
| `low` | Fast, cheap | Standard operations |
| `medium` | Balanced | General purpose tasks |
| `high` | High quality | Complex reasoning, important tasks |
| `default` | Fallback | When no specific tier is specified |
| `fitness` | Evaluation | Fitness scoring in GP |
| `reasoning` | Deep thinking | Complex problem solving |
| `fallback` | Emergency | When primary models fail |

## Usage Examples

### Basic Usage (Recommended)

Always prefer tier-based requests:

```typescript
import { getModel } from '@core/vendor/model-wrapper'
import { generateText } from 'ai'

// ✅ GOOD: Use semantic tiers
const model = await getModel({ model: 'tier:medium' })
const result = await generateText({ model, prompt: 'Explain quantum computing' })
```

### Direct Model Names (Auto-Resolution)

If you specify a direct model that matches a tier, it auto-resolves:

```typescript
// These all resolve to the same tier if configured that way:
await getModel({ model: 'openai/gpt-4.1-mini' })
await getModel({ model: 'tier:medium' })
await getModel({ model: 'tier:fitness' })

// The resolver automatically finds the matching tier
```

### Checking Tier Mappings

Use the tier resolver utilities:

```typescript
import { tierResolver, isValidTier } from '@core/vendor/tier-resolver'

// Check if a model is a tier model
const isTier = tierResolver.isTierModel('openai/gpt-4.1-mini')  // true

// Get the tier for a model
const tier = tierResolver.getTierForModel('openai/gpt-4.1-mini')  // 'medium'

// Get the model for a tier
const model = tierResolver.getModelForTier('medium')  // 'openai/gpt-4.1-mini'

// Resolve a model spec to tier format
const spec = tierResolver.resolveModelSpec('openai/gpt-4.1-mini')  // 'tier:medium'
```

### User-Specific Configs

Override tier models per user via YAML:

```yaml
# configs/researcher-jane.yaml
name: "Jane's Research Config"

experiments:
  fast_local:
    strategy: fallback
    providers:
      - local/llama-3.3-70b
      - openrouter/google/gemini-2.0-flash
    timeout: 30000

defaults:
  experiment: fast_local
```

```typescript
// Load user config
await orchestrator.loadUserConfig('jane', './configs/researcher-jane.yaml')

// Use user-specific experiment
const model = await getModel({
  model: 'user:jane:fast_local',
  userId: 'jane'
})
```

## Integration with Orchestrator

The tier resolver is integrated into the model wrapper, so when the orchestrator is enabled (via feature flags), all tier resolution happens automatically:

```typescript
// In model-wrapper.ts
export async function getModel(request: ModelRequest): Promise<LanguageModel> {
  if (shouldUseOrchestrator(request.userId)) {
    // Auto-resolve model to tier if it matches a tier's configured model
    const resolvedSpec = tierResolver.resolveModelSpec(request.model)

    const model = await orchestrator.model(resolvedSpec, {
      userId: request.userId,
      experiment: request.experiment,
      requestId: crypto.randomUUID(),
    })
    return model as unknown as LanguageModel
  }

  // Fallback to legacy system...
}
```

## Provider Configuration

Tier models change based on the current provider setting:

```typescript
// In runtime/settings/models.ts
export const MODEL_CONFIG = {
  provider: "openrouter" as const,  // Current provider
  inactive: new Set([...]),
}

// Tier models automatically adjust based on provider
const tier = tierResolver.getTierForModel('openai/gpt-4.1-mini')
// Returns 'medium' when provider is 'openrouter'
// Returns 'high' when provider is 'openai'
```

## Best Practices

### ✅ DO

- Use tier-based requests (`tier:medium`) for all new code
- Configure tier models in `runtime/settings/models.ts`
- Use semantic tier names that describe purpose
- Test tier resolution with multiple providers

### ❌ DON'T

- Hardcode model names throughout your codebase
- Bypass tier resolution unless you have a specific reason
- Mix tier and direct model names in the same feature
- Forget to update tier configs when adding new models

## Debugging

Enable logging to see tier resolution in action:

```typescript
import { tierResolver } from '@core/vendor/tier-resolver'

// Check tier mapping for a model
console.log('Tier for gpt-4.1-mini:', tierResolver.getTierForModel('openai/gpt-4.1-mini'))

// See all available tiers
console.log('All tiers:', tierResolver.getAllTiers())

// Clear cache if configs change at runtime
tierResolver.clearCache()
```

## Migration Path

### Phase 1: Enable Orchestrator with Tier Resolution
```typescript
import { enableOrchestrator, addTestUser } from '@core/vendor/model-wrapper'

enableOrchestrator()
addTestUser('researcher-1')
```

### Phase 2: Migrate Code to Use Tiers
```typescript
// Before
const model = await getLanguageModel('openai/gpt-4.1-mini')

// After
const model = await getModel({ model: 'tier:medium' })
```

### Phase 3: Optimize Tier Configs
Update `runtime/settings/models.ts` to optimize costs and performance per tier.

### Phase 4: User Experiments
Create YAML configs for researchers to test different tier configurations.

## Summary

The tier resolution system provides:
- ✅ Automatic mapping of model names to tiers
- ✅ Provider-independent code
- ✅ Easy configuration changes
- ✅ User-specific overrides
- ✅ Better code semantics
- ✅ Gradual migration path

All tier logic is transparent and happens automatically when using the model wrapper.