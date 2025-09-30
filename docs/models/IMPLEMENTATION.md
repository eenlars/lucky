# Models Registry - Implementation Guide

This document describes the complete implementation of the `@lucky/models` package and its integration into the core application.

## Overview

The models registry provides a unified abstraction for managing multiple AI providers and models, with support for:
- Multi-provider model management (OpenAI, Anthropic, OpenRouter, Groq, local)
- Tier-based model abstraction (nano, low, medium, high, reasoning, etc.)
- Flexible execution strategies (first, race, fallback, consensus)
- YAML-based user configurations for A/B testing
- Runtime Zod validation for type safety
- Feature flags for gradual rollout

## Architecture

### Package Structure

```
packages/models/          # Generic, reusable models registry package
├── src/
│   ├── models.ts        # Main Models class
│   ├── config/          # YAML configuration loader
│   ├── providers/       # Provider registry
│   ├── types/           # TypeScript types & Zod schemas
│   └── middleware/      # Future middleware support
├── configs/             # Example YAML configurations
└── examples/            # Usage examples

core/src/vendor/         # App-specific integration layer
├── models-instance.ts   # Singleton instance for core app
├── model-wrapper.ts     # Feature flag wrapper
├── tier-config-builder.ts # Builds tiers from DEFAULT_MODELS
├── tier-resolver.ts     # Tier resolution utilities
└── validate-tier-config.ts # Validation utilities
```

### Key Components

#### 1. Models Registry (`@lucky/models`)

The main `Models` class provides:

```typescript
import { createModels } from '@lucky/models'

const models = createModels({
  providers: { /* provider configs */ },
  tiers: { /* tier configs */ },
  defaultTier: 'medium',
  trackPerformance: true,
  trackCost: true
})

// Get a model
const model = await models.model('tier:fast', { requestId: '...' })
```

**Features:**
- Provider management (OpenAI, Anthropic, OpenRouter, Groq, local/Ollama)
- Tier-based abstraction
- User-specific YAML configurations
- Runtime provider updates
- Performance and cost tracking

#### 2. Dynamic Tier Configuration

**File:** `core/src/vendor/tier-config-builder.ts`

Automatically generates tier configuration from `DEFAULT_MODELS` in `runtime/settings/models.ts`:

```typescript
import { buildTierConfig, getDefaultTierName } from './tier-config-builder'

// Dynamically builds tier config
const tierConfig = buildTierConfig()
// Returns all tiers: summary, nano, low, medium, high, default, fitness, reasoning, fallback
```

**Benefits:**
- No hardcoding - everything syncs with runtime settings
- Supports all 9 tiers automatically
- Smart strategy selection (race for fast tiers, first for others)
- Provider-aware (uses current MODEL_CONFIG.provider)

#### 3. Tier Resolution System

**File:** `core/src/vendor/tier-resolver.ts`

Bidirectional mapping between model names and tiers:

```typescript
import { tierResolver } from '@core/vendor/tier-resolver'

// Model → Tier
tierResolver.getTierForModel('openai/gpt-4.1-mini')  // 'medium'

// Tier → Model
tierResolver.getModelForTier('medium')  // 'openai/gpt-4.1-mini'

// Auto-resolution
tierResolver.resolveModelSpec('openai/gpt-4.1-mini')  // 'tier:medium'
tierResolver.resolveModelSpec('tier:fast')  // 'tier:fast' (passthrough)
```

**Integration:**
Integrated into `model-wrapper.ts` for automatic tier resolution:

```typescript
const resolvedSpec = tierResolver.resolveModelSpec(request.model)
const model = await models.model(resolvedSpec, { ... })
```

#### 4. Feature Flag Wrapper

**File:** `core/src/vendor/model-wrapper.ts`

Provides gradual rollout with instant rollback:

```typescript
import {
  getModel,
  enableModels,
  setRolloutPercent,
  addTestUser
} from '@core/vendor/model-wrapper'

// Enable for specific users
addTestUser('researcher-1')

// Gradual rollout
setRolloutPercent(25)  // 25% of users

// Global enable/disable
enableModels()   // Enable globally
disableModels()  // Instant rollback

// Use the model
const model = await getModel({
  model: 'tier:fast',
  userId: 'user-123'
})
```

**Rollout Strategy:**
- Test users always get models registry
- Other users use deterministic hash-based rollout
- Fallback to legacy system when disabled

#### 5. Singleton Instance

**File:** `core/src/vendor/models-instance.ts`

Pre-configured singleton for the core application:

```typescript
import { models } from '@core/vendor/models-instance'

// Use directly
const model = await models.model('tier:medium', { requestId: '...' })

// Load user config
await models.loadUserConfig('user-123', './configs/researcher.yaml')
const userModel = await models.model('user:user-123:quick', { userId: 'user-123' })
```

**Configuration:**
- All providers (OpenAI, Anthropic, OpenRouter, Groq, local)
- Dynamic tiers from DEFAULT_MODELS
- Performance and cost tracking enabled

## Zod Validation

All configurations are validated at runtime with Zod schemas.

### Validated Points

1. **Constructor** - `ModelsConfig` validation
2. **Provider Updates** - `ProviderConfig` validation
3. **YAML Configs** - `UserConfig` validation
4. **Model Specs** - Format validation (`provider/model`, `tier:name`, `user:userId:experiment`)

### Schemas

**File:** `packages/models/src/types/schemas.ts`

- `modelsConfigSchema` - Main configuration
- `providerConfigSchema` - Provider settings
- `tierConfigSchema` - Tier configuration
- `userConfigSchema` - YAML user configs
- `modelSpecSchema` - Model specifications
- `modelResultSchema` - Execution results

### Validation Helpers

```typescript
import {
  validateModelsConfig,
  safeValidateModelsConfig
} from '@lucky/models'

// Throws on error
const config = validateModelsConfig(data)

// Returns { success, data, error }
const result = safeValidateModelsConfig(data)
if (!result.success) {
  console.error(result.error)
}
```

## YAML Configuration System

User-specific configurations for A/B testing and experimentation.

### Example Configs

**Location:** `packages/models/configs/`

1. **complete-example.yaml** - Comprehensive reference (10 experiments)
2. **researcher-example.yaml** - ML research (4 experiments)
3. **production-example.yaml** - Production deployment (4 experiments)
4. **local-dev-example.yaml** - Local development with Ollama (3 experiments)
5. **example.yaml** - Simple starter

### Configuration Format

```yaml
name: "My Config"

experiments:
  fast:
    strategy: race
    providers:
      - openrouter/google/gemini-2.5-flash-lite
      - groq/llama-3.3-70b-versatile
    timeout: 10000
    maxCost: 0.01

  production:
    strategy: fallback
    providers:
      - openrouter/openai/gpt-4.1-mini
      - openrouter/anthropic/claude-3-5-haiku
      - openrouter/google/gemini-2.5-flash-lite

defaults:
  experiment: fast
  maxConcurrent: 50
  timeout: 30000
  costLimit: 100.00

performanceTracking: true
```

### Execution Strategies

- **`first`** - Use first provider (standard production)
- **`race`** - Start all, return fastest (speed optimization)
- **`fallback`** - Try sequentially until success (reliability)
- **`consensus`** - Call all, compare results (quality validation)

### Loading Configs

```typescript
import { models } from '@core/vendor/models-instance'

// Load for user
await models.loadUserConfig('user-123', './configs/researcher.yaml')

// Use experiment
const model = await models.model('user:user-123:fast', {
  userId: 'user-123',
  requestId: crypto.randomUUID()
})

// Use default experiment
const defaultModel = await models.model('user:user-123', {
  userId: 'user-123'
})
```

## Validation & Testing

### Tier Configuration Validation

**File:** `core/src/vendor/validate-tier-config.ts`

Validates synchronization between `DEFAULT_MODELS` and models registry:

```typescript
import { validateTierConfig, printValidationResults } from '@core/vendor/validate-tier-config'

// Run validation
const result = validateTierConfig()
// Returns: { success, errors, warnings, info }

// Print results
printValidationResults()
```

**Checks:**
- All tiers from DEFAULT_MODELS exist in registry
- All tiers have valid models
- Tier resolver bidirectional mapping
- No orphaned tiers

### Unit Tests

**Location:** `core/src/vendor/__tests__/tier-config.test.ts`

Tests for:
- Dynamic tier config generation
- Tier resolver forward/reverse lookups
- Provider-specific configurations
- Edge cases

Run tests:
```bash
bun -C core run test:unit
```

## Migration Guide

### From Legacy Model Factory

The `model-wrapper.ts` provides gradual migration:

```typescript
// Before (legacy)
import { getLanguageModel } from '@core/messages/api/modelFactory'
const model = getLanguageModel('openai/gpt-4.1-mini')

// After (with feature flag)
import { getModel } from '@core/vendor/model-wrapper'
const model = await getModel({ model: 'tier:medium' })

// Still works during migration (auto-fallback)
const model = await getModel({ model: 'openai/gpt-4.1-mini' })
```

### Gradual Rollout Strategy

1. **Phase 1**: Test users only
   ```typescript
   addTestUser('researcher-1')
   addTestUser('dev-team')
   ```

2. **Phase 2**: Gradual rollout
   ```typescript
   setRolloutPercent(10)  // 10% of users
   ```

3. **Phase 3**: Monitor & increase
   ```typescript
   setRolloutPercent(50)  // 50% of users
   ```

4. **Phase 4**: Full rollout
   ```typescript
   enableModels()  // 100% of users
   ```

5. **Rollback**: Instant disable
   ```typescript
   disableModels()  // Back to legacy
   ```

## Key Benefits

1. **Centralized Configuration** - Single source of truth in DEFAULT_MODELS
2. **Automatic Synchronization** - No manual tier config updates
3. **Runtime Validation** - Zod ensures type safety
4. **Flexible Experimentation** - YAML configs for A/B testing
5. **Zero Downtime** - Feature flags enable instant rollback
6. **Provider Abstraction** - Semantic tiers (fast/medium/high) instead of provider-specific models
7. **Multi-Strategy Support** - Choose right execution strategy per use case
8. **Cost & Performance Tracking** - Built-in metrics

## Next Steps

- [ ] Enable models registry for test users
- [ ] Load YAML configs for A/B testing
- [ ] Monitor performance metrics
- [ ] Gradually increase rollout percentage
- [ ] Implement consensus strategy for critical paths
- [ ] Add retry middleware
- [ ] Set up cost alerts

## References

- Package README: `packages/models/README.md`
- Integration Guide: `packages/models/INTEGRATION.md`
- Delivery Notes: `packages/models/DELIVERY.md`
- Tier Resolution: `core/docs/TIER_RESOLUTION.md`
- Config Examples: `packages/models/configs/README.md`
