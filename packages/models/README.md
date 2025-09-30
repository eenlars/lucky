# @lucky/models

Multi-provider model configuration and registry for Vercel AI SDK. Manage multiple AI providers with tier-based selection, automatic fallbacks, performance tracking, and user-configurable experiments.

## Features

- 🔄 **Multi-Provider**: OpenAI, Anthropic, OpenRouter, local models (Ollama, vLLM)
- ⚡ **Execution Strategies**: Race, fallback, consensus, first-match
- 🎯 **AI SDK Native**: Returns models compatible with `generateText` and `streamText`
- 📊 **Performance Tracking**: Automatic latency and cost tracking
- 🧪 **A/B Testing**: User-specific YAML configs for experiments
- 🏠 **Local Models**: First-class support for Ollama and vLLM

## Installation

```bash
bun add @lucky/models
```

## Quick Start

```typescript
import { createModels } from '@lucky/models'
import { generateText } from 'ai'

// Create models registry
const models = createModels({
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY
    },
    local: {
      baseUrl: 'http://localhost:11434/v1'
    }
  }
})

// Use with AI SDK
const model = await models.model('openai/gpt-4')
const result = await generateText({
  model,
  prompt: 'Hello world'
})
```

## Model Selection

### Direct Provider/Model

```typescript
// Use specific provider and model
const model = await models.model('anthropic/claude-3.5-sonnet')
```

### Tier-Based Selection

```typescript
const models = createModels({
  providers: { /* ... */ },
  tiers: {
    fast: {
      strategy: 'race',
      models: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'local', model: 'llama-3' }
      ]
    },
    quality: {
      strategy: 'first',
      models: [
        { provider: 'anthropic', model: 'claude-3.5-sonnet' }
      ]
    }
  },
  defaultTier: 'fast'
})

// Use tier
const model = await models.model('tier:fast')
```

### User Configurations

Create YAML configs for researchers:

```yaml
# configs/researcher-john.yaml
name: "John's Experiments"

experiments:
  local_first:
    strategy: fallback
    providers:
      - local/llama-3
      - openrouter/google/gemini-2.0-flash

defaults:
  experiment: local_first
```

Load and use:

```typescript
await models.loadUserConfig('john', './configs/researcher-john.yaml')

const model = await models.model('user:john:local_first', {
  userId: 'john',
  requestId: '123'
})
```

## Execution Strategies

### Race Strategy
Run multiple providers simultaneously, return the fastest:

```yaml
experiment:
  strategy: race
  providers:
    - openai/gpt-4o-mini
    - anthropic/claude-3-haiku
    - local/llama-3
```

### Fallback Strategy
Try providers in sequence until one succeeds:

```yaml
experiment:
  strategy: fallback
  providers:
    - local/llama-3      # Try local first
    - openai/gpt-4o-mini # Fallback to cloud
```

### Consensus Strategy
Run multiple models and compare results:

```yaml
experiment:
  strategy: consensus
  providers:
    - anthropic/claude-3.5-sonnet
    - openai/gpt-4o
```

### First Strategy
Use the first provider in the list:

```yaml
experiment:
  strategy: first
  providers:
    - anthropic/claude-3.5-sonnet
```

## Local Models

### Ollama

```typescript
const models = createModels({
  providers: {
    local: {
      baseUrl: 'http://localhost:11434/v1',
      timeout: 60000
    }
  }
})

const model = await models.model('local/llama-3.3')
```

### vLLM

```typescript
const models = createModels({
  providers: {
    vllm: {
      baseUrl: 'http://localhost:8000/v1',
      maxConcurrent: 100
    }
  }
})

const model = await models.model('vllm/mistral-7b')
```

## Configuration

### Provider Configuration

```typescript
interface ProviderConfig {
  id: string
  baseUrl?: string
  apiKey?: string
  maxConcurrent?: number  // Limit concurrent requests
  timeout?: number        // Request timeout in ms
  enabled?: boolean       // Enable/disable at runtime
  headers?: Record<string, string>
}
```

### Runtime Updates

```typescript
// Update provider config without restart
models.updateProvider('openai', {
  enabled: false,  // Disable OpenAI temporarily
  timeout: 120000
})
```

## Integration with Existing Code

### Feature Flag Pattern

```typescript
import { createModels } from '@lucky/models'

const models = createModels({ /* ... */ })

export async function getModel(spec: string, userId?: string) {
  // Gradual rollout
  if (shouldUseModelsRegistry(userId)) {
    return models.model(spec)
  }

  // Fallback to legacy system
  return legacyGetModel(spec)
}
```

### Parallel Migration

Run both systems in parallel and compare:

```typescript
const [newResult, oldResult] = await Promise.all([
  models.model('tier:fast').then(m => generateText({ model: m, prompt })),
  legacySystem.generateText(prompt)
])

// Log comparison for validation
console.log({ newResult, oldResult })
```

## Pricing Management

Automatic pricing updates (coming soon):

```bash
bun run fetch-pricing
```

This will fetch latest pricing from:
- OpenRouter API
- OpenAI API
- Anthropic API

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Watch mode
bun run dev

# Test
bun test

# Fetch latest pricing
bun run fetch-pricing
```

## Architecture

```
┌─────────────────────────────┐
│   Models                    │
│   (Main API)                │
└──────────┬──────────────────┘
           │
    ┌──────┴─────────┐
    │                │
┌───▼────┐    ┌─────▼──────┐
│ Config │    │  Provider  │
│ Loader │    │  Registry  │
└────────┘    └────────────┘
```

- **Models**: Main entry point, resolves model specs
- **ConfigLoader**: Loads and manages YAML configs
- **ProviderRegistry**: Creates and caches AI SDK models

## License

MIT