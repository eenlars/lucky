# Integration Guide: Adding Model Orchestrator to Existing System

This guide shows how to integrate `@lucky/@lucky/models` into your existing codebase with **zero breaking changes** and gradual migration.

## Key Features

- ✅ **Multi-provider support** - Use OpenAI, Anthropic, OpenRouter, Groq, and local models simultaneously
- ✅ **Automatic tier resolution** - Model names auto-resolve to semantic tiers based on config (see `core/docs/TIER_RESOLUTION.md`)
- ✅ **Feature flags** - Gradual rollout from 0% to 100% with instant rollback
- ✅ **Zod validation** - Runtime safety for all configs with detailed error messages
- ✅ **AI SDK native** - Works perfectly with `generateText` and `streamText`
- ✅ **User configs** - Researchers can define experiments via YAML files

## Phase 1: Basic Setup (Week 1)

### 1. Install the Package

Already done! The package is part of your workspace at `packages/@lucky/models`.

### 2. Create Orchestrator Instance

Create a new file: `core/vendor/orchestrator-instance.ts`

```typescript
import { createModels } from '@lucky/@lucky/models'
import { envi } from '../utils/env.mjs'

export const orchestrator = createModels({
  providers: {
    openai: {
      id: 'openai',
      apiKey: envi.OPENAI_API_KEY,
      enabled: true,
    },
    anthropic: {
      id: 'anthropic',
      apiKey: envi.ANTHROPIC_API_KEY,
      enabled: true,
    },
    openrouter: {
      id: 'openrouter',
      apiKey: envi.OPENROUTER_API_KEY,
      baseUrl: 'https://openrouter.ai/api/v1',
      enabled: true,
    },
    groq: {
      id: 'groq',
      apiKey: envi.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      enabled: true,
    },
    local: {
      id: 'local',
      baseUrl: 'http://localhost:11434/v1',
      enabled: false, // Enable when Ollama is running
    },
  },
  trackPerformance: true,
  trackCost: true,
})
```

### 3. Create Migration Wrapper

Create: `core/vendor/model-wrapper.ts`

```typescript
import type { LanguageModelV1 } from 'ai'
import { orchestrator } from './orchestrator-instance'
import { getLanguageModel } from '../messages/api/modelFactory' // Your existing function

interface ModelRequest {
  model: string
  userId?: string
  experiment?: string
}

/**
 * Feature flag to control orchestrator rollout
 */
function shouldUseOrchestrator(userId?: string): boolean {
  // Start with 0%, gradually increase
  if (!userId) return false

  // Enable for specific test users
  const testUsers = ['researcher-1', 'test-user']
  if (testUsers.includes(userId)) return true

  // Gradual rollout: hash userId and enable for X%
  const hash = simpleHash(userId)
  const rolloutPercent = 10 // Start with 10%

  return (hash % 100) < rolloutPercent
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Get model using orchestrator or legacy system
 * This is your new public API
 */
export async function getModel(
  request: ModelRequest
): Promise<LanguageModelV1> {
  // Use orchestrator if enabled
  if (shouldUseOrchestrator(request.userId)) {
    return models.model(request.model, {
      userId: request.userId,
      experiment: request.experiment,
      requestId: crypto.randomUUID(),
    })
  }

  // Fallback to legacy system
  return getLanguageModel(request.model as any)
}
```

### 4. Gradual Migration

Replace calls one by one:

```typescript
// OLD
const model = getLanguageModel('gpt-4')

// NEW
const model = await getModel({ model: 'openai/gpt-4' })
```

## Phase 2: Multi-Provider Usage (Week 2)

### 1. Define Tiers

Update your orchestrator config:

```typescript
export const orchestrator = createModels({
  providers: { /* ... */ },
  tiers: {
    fast: {
      strategy: 'race',
      models: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'groq', model: 'llama-3.1-8b' },
      ],
    },
    medium: {
      strategy: 'first',
      models: [
        { provider: 'openai', model: 'gpt-4o' },
      ],
    },
    high: {
      strategy: 'first',
      models: [
        { provider: 'anthropic', model: 'claude-3.5-sonnet' },
      ],
    },
  },
  defaultTier: 'fast',
})
```

### 2. Use Tiers

```typescript
// Use tier instead of specific model
const model = await getModel({ model: 'tier:fast' })
```

## Phase 3: User Configurations (Week 3)

### 1. Create User Configs

Create `configs/researchers/`:

```yaml
# configs/researchers/john.yaml
name: "John's Research Config"
experiments:
  local_first:
    strategy: fallback
    providers:
      - local/llama-3.3
      - openrouter/google/gemini-2.0-flash
defaults:
  experiment: local_first
```

### 2. Load User Configs

```typescript
// At startup or when user logs in
await models.loadUserConfig(
  'researcher-john',
  './configs/researchers/john.yaml'
)
```

### 3. Use User Configs

```typescript
const model = await getModel({
  model: 'user:researcher-john:local_first',
  userId: 'researcher-john',
})
```

## Phase 4: Automatic Pricing (Week 4)

### 1. Fetch Pricing Data

```bash
# Run this script daily via cron
bun run fetch-pricing
```

This creates `pricing-cache.json` with latest pricing.

### 2. Use Pricing in Your Code

```typescript
import pricingCache from './pricing-cache.json'

// Calculate cost for a request
const pricing = pricingCache.models['openai/gpt-4o']
const cost =
  (inputTokens * pricing.inputPerMillion / 1_000_000) +
  (outputTokens * pricing.outputPerMillion / 1_000_000)
```

## Monitoring & Rollback

### Check Current Rollout

```typescript
// Add logging to track usage
console.log(`Orchestrator usage: ${getOrchestratorUsagePercent()}%`)
```

### Instant Rollback

```typescript
// In model-wrapper.ts, set rollout to 0%
const rolloutPercent = 0 // Instant rollback
```

### Compare Results

```typescript
// Run both systems in parallel for validation
const [newResult, oldResult] = await Promise.all([
  models.model('openai/gpt-4').then(m => generateText({ model: m, prompt })),
  getLanguageModel('gpt-4').then(m => generateText({ model: m, prompt })),
])

// Log for comparison
if (newResult.text !== oldResult.text) {
  console.log('Difference detected:', { newResult, oldResult })
}
```

## Benefits

1. ✅ **Zero Breaking Changes**: Existing code continues to work
2. ✅ **Gradual Rollout**: Control rollout percentage per user
3. ✅ **Instant Rollback**: Set rollout to 0% immediately
4. ✅ **A/B Testing**: Easy comparison between systems
5. ✅ **Multi-Provider**: Use multiple providers simultaneously
6. ✅ **User Configs**: Researchers can customize via YAML

## Next Steps

- [ ] Week 1: Deploy with 0% rollout, test with specific users
- [ ] Week 2: Increase to 10% rollout
- [ ] Week 3: Add user configs for research team
- [ ] Week 4: Reach 100% rollout
- [ ] Remove legacy system once stable

## Troubleshooting

### Models Not Loading

Check provider initialization:
```typescript
console.log(models.getProviderConfig('openai'))
```

### Pricing Not Updating

Run pricing fetcher manually:
```bash
bun run packages/@lucky/models/scripts/fetch-pricing.ts
```

### Performance Issues

Enable performance tracking and check metrics:
```typescript
// Coming soon: models.getMetrics()
```