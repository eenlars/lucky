# @lucky/models Documentation

Complete documentation for the `@lucky/models` package - a multi-provider model registry with tier-based abstraction, flexible execution strategies, and runtime validation.

## 📚 Documentation Index

### Getting Started

- **[README.md](./README.md)** - Package overview and quick start
- **[INTEGRATION.md](./INTEGRATION.md)** - Integration guide for core application
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Complete implementation details and architecture

### Configuration

- **[CONFIG_GUIDE.md](./CONFIG_GUIDE.md)** - Configuration file format and examples
- **[TIER_RESOLUTION.md](./TIER_RESOLUTION.md)** - Tier-based model abstraction system

### Advanced Topics

- **[INFERENCE.md](./INFERENCE.md)** - Vendor management & inference system analysis
- **[DELIVERY.md](./DELIVERY.md)** - Delivery notes and feature completion status

## Package Overview

The `@lucky/models` package provides:

### Multi-Provider Support
- OpenAI (direct API)
- Anthropic (direct API)
- OpenRouter (unified provider gateway)
- Groq (fast inference)
- Local models via Ollama

### Tier-Based Abstraction
Instead of hard-coding provider-specific models, use semantic tiers:
- `nano` - Fastest, cheapest models
- `low` - Fast models with good quality
- `medium` - Balanced quality/speed
- `high` - Best quality models
- `reasoning` - Extended thinking models
- And more...

### Execution Strategies
- **`first`** - Use first provider (standard production)
- **`race`** - Start all providers, return fastest
- **`fallback`** - Sequential retry for reliability
- **`consensus`** - Compare multiple results for quality

### Runtime Validation
All configurations validated with Zod schemas for type safety and helpful error messages.

## Quick Start

```typescript
import { createModels } from '@lucky/models'

const models = createModels({
  providers: {
    openai: {
      id: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      enabled: true
    },
    anthropic: {
      id: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      enabled: true
    }
  },
  tiers: {
    fast: {
      strategy: 'race',
      models: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'anthropic', model: 'claude-3-5-haiku' }
      ]
    },
    quality: {
      strategy: 'first',
      models: [
        { provider: 'anthropic', model: 'claude-3-5-sonnet' }
      ]
    }
  },
  defaultTier: 'fast',
  trackPerformance: true,
  trackCost: true
})

// Get a model
const model = await models.model('tier:fast', {
  requestId: crypto.randomUUID()
})

// Use with Vercel AI SDK
import { generateText } from 'ai'

const result = await generateText({
  model,
  prompt: 'Hello, world!'
})
```

## Core Architecture

### Package Structure

```
packages/models/          # Generic, reusable package
├── src/
│   ├── models.ts        # Main Models class
│   ├── config/          # Configuration loader
│   ├── providers/       # Provider registry
│   ├── types/           # TypeScript types
│   └── types/schemas.ts # Zod validation schemas
└── configs/             # Example configurations

core/src/vendor/         # Application integration layer
├── models-instance.ts   # Singleton for core app
├── model-wrapper.ts     # Feature flag wrapper
├── tier-config-builder.ts # Dynamic tier generation
└── tier-resolver.ts     # Tier resolution utilities
```

### Integration Patterns

**Singleton Instance** (`core/src/vendor/models-instance.ts`)
- Pre-configured instance for the core application
- Dynamically builds tiers from `DEFAULT_MODELS`
- Exports ready-to-use `models` singleton

**Feature Flag Wrapper** (`core/src/vendor/model-wrapper.ts`)
- Gradual rollout with instant rollback
- Test users, percentage-based rollout
- Falls back to legacy model factory

**Dynamic Tier Configuration** (`core/src/vendor/tier-config-builder.ts`)
- Automatically syncs with runtime model settings
- No manual tier configuration required
- Supports all tier types

## Configuration Examples

See example configurations in `packages/models/configs/`:

1. **complete-example.yaml** - Comprehensive reference (10 experiments)
2. **researcher-example.yaml** - ML research workflows
3. **production-example.yaml** - Production deployment patterns
4. **local-dev-example.yaml** - Local development with Ollama
5. **example.yaml** - Simple starter template

## Testing & Validation

### Tier Configuration Validation

```typescript
import { validateTierConfig } from '@core/vendor/validate-tier-config'

const result = validateTierConfig()
// Checks:
// - All DEFAULT_MODELS tiers exist in registry
// - All tiers have valid models
// - Tier resolver bidirectional mapping works
// - No orphaned tiers
```

### Runtime Validation

All configurations are validated at runtime with Zod:
- Constructor validation
- Provider update validation
- YAML config validation
- Model spec format validation

## Migration & Rollout

### Gradual Rollout

```typescript
import {
  enableModels,
  setRolloutPercent,
  addTestUser
} from '@core/vendor/model-wrapper'

// Phase 1: Test users
addTestUser('researcher-1')

// Phase 2: Gradual rollout
setRolloutPercent(25)

// Phase 3: Full rollout
enableModels()

// Rollback if needed
disableModels()
```

### Legacy Compatibility

The models registry is designed for seamless coexistence with the legacy model factory:
- Feature flags control migration
- Automatic fallback to legacy system
- No breaking changes
- Zero downtime deployment

## Next Steps

1. Read [INTEGRATION.md](./INTEGRATION.md) for integration patterns
2. Check [CONFIG_GUIDE.md](./CONFIG_GUIDE.md) for configuration options
3. Review [IMPLEMENTATION.md](./IMPLEMENTATION.md) for architecture details
4. Explore example configs in `packages/models/configs/`
5. Run validation tests with `bun -C core run test:unit`

## Support

For issues, questions, or contributions:
- Review documentation in this directory
- Check example configurations
- Run validation tools
- Consult the implementation guide

---

**Package**: `@lucky/models`
**Version**: See `packages/models/package.json`
**License**: See root LICENSE file
