# Models Registry Configuration Examples

This directory contains example TypeScript configurations for the models registry. Each file demonstrates different use cases and strategies.

**TypeScript configs provide:**
- Type safety at authoring time (IDE autocomplete, validation)
- Runtime Zod validation with detailed error messages
- Immediate feedback on configuration errors
- Better refactoring support

**YAML configs** (`.yaml`, `.yml`) are still supported for backwards compatibility.

## Available Examples

### 1. `complete-example.config.ts` - Comprehensive Reference

**Use this for:** Learning all available features

**Includes:**
- All 4 execution strategies (first, race, fallback, consensus)
- 10+ different experiment configurations
- Cost controls and timeout settings
- Performance tracking setup
- Detailed comments explaining each option

**Usage:**
```typescript
await models.loadUserConfig('user-id', './configs/complete-example.config.ts')
const model = await getModel({
  model: 'user:user-id:fast',  // Use 'fast' experiment
  userId: 'user-id'
})
```

---

### 2. `researcher-example.config.ts` - ML Research

**Use this for:** Machine learning research and experimentation

**Optimized for:**
- Quick iterations with fast models
- Standard experiments with balanced models
- High-stakes experiments with consensus
- Privacy-sensitive local research

**Cost controls:**
- $50 daily limit
- Per-request cost limits
- Quick experiments < $0.005

---

### 3. `production-example.config.ts` - Production Deployment

**Use this for:** Production applications with high reliability

**Optimized for:**
- Fallback chains for reliability
- Priority queues for important requests
- Batch processing for cost optimization
- Emergency fallback with maximum coverage

**Features:**
- 100 concurrent requests
- $500 daily limit
- Multiple fallback providers
- Performance tracking enabled

---

### 4. `local-dev-example.config.ts` - Local Development

**Use this for:** Development with Ollama (no API costs)

**Optimized for:**
- Local-only inference
- Fast iterations with smaller models
- Code-specialized models
- Hybrid local + cloud fallback

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3.3:70b
ollama pull mistral-nemo:12b
ollama pull qwen2.5-coder:32b

# Enable local provider in models-instance.ts
local: {
  id: "local",
  baseUrl: "http://localhost:11434/v1",
  enabled: true,  // ← Set to true
}
```

---

## Configuration Schema

All config files follow this schema (validated with Zod):

```typescript
import { defineConfig } from '@lucky/models/config'

export default defineConfig({
  name: "Config Name",

  experiments: {
    experiment_name: {
      strategy: "first" | "race" | "fallback" | "consensus",
      providers: [
        "provider/model-name",
        "provider/model-name",
      ],
      timeout: 30000,    // Optional: milliseconds
      maxCost: 0.10,     // Optional: USD per request
    },
  },

  defaults: {
    experiment: "experiment_name",  // Optional: default experiment
    maxConcurrent: 50,              // Optional: concurrent requests
    timeout: 30000,                 // Optional: default timeout
    costLimit: 100.00,              // Optional: daily cost limit USD
  },

  performanceTracking: true,        // Optional: track metrics
})
```

**Legacy YAML format** is still supported:
```yaml
name: "Config Name"
experiments:
  experiment_name:
    strategy: first
    providers: [provider/model-name]
```

## Execution Strategies

### `first` - Use First Provider
- **Best for:** Single reliable provider
- **Use case:** Standard production requests
- **Behavior:** Uses first provider in list
```typescript
{
  strategy: "first",
  providers: ["openrouter/openai/gpt-4.1-mini"],
}
```

### `race` - Race Multiple Providers
- **Best for:** Speed optimization
- **Use case:** Fast responses, multiple fast models
- **Behavior:** Starts all providers, returns fastest
```typescript
{
  strategy: "race",
  providers: [
    "openrouter/google/gemini-2.5-flash-lite",
    "groq/llama-3.3-70b-versatile",
  ],
}
```

### `fallback` - Sequential Fallback
- **Best for:** Reliability and uptime
- **Use case:** Production with backup providers
- **Behavior:** Tries providers in order until one succeeds
```typescript
{
  strategy: "fallback",
  providers: [
    "openrouter/openai/gpt-4.1-mini",
    "openrouter/anthropic/claude-3-5-haiku",
    "openrouter/google/gemini-2.5-flash-lite",
  ],
}
```

### `consensus` - Multi-Provider Consensus
- **Best for:** Quality and verification
- **Use case:** Critical decisions, research validation
- **Behavior:** Calls all providers, compares results
```typescript
{
  strategy: "consensus",
  providers: [
    "openrouter/openai/gpt-4.1",
    "anthropic/claude-sonnet-4",
    "openrouter/google/gemini-2.5-pro-preview",
  ],
}
```

## Provider Format

Providers use the format: `provider/model-name`

**Supported providers:**
- `openai/` - Direct OpenAI API
- `anthropic/` - Direct Anthropic API
- `openrouter/` - OpenRouter (with vendor prefix: `openrouter/openai/gpt-4.1`)
- `groq/` - Groq API
- `local/` - Local Ollama models

**Examples:**
```typescript
providers: [
  // OpenRouter (most providers route through here)
  "openrouter/openai/gpt-4.1-mini",
  "openrouter/anthropic/claude-sonnet-4",
  "openrouter/google/gemini-2.5-flash-lite",
  "openrouter/deepseek/deepseek-chat",

  // Direct APIs
  "openai/gpt-4o-mini",
  "anthropic/claude-3-5-haiku",
  "groq/llama-3.3-70b-versatile",

  // Local Ollama
  "local/llama-3.3-70b-instruct",
  "local/mistral-nemo-12b",
  "local/qwen-2.5-coder-32b",
]
```

## Loading Configs

### Option 1: Load User Config

```typescript
import { models } from '@core/vendor/models-instance'
import { getModel } from '@core/vendor/model-wrapper'

// Load TypeScript config for user
await models.loadUserConfig('researcher-1', './configs/researcher-example.config.ts')

// Use experiment from config
const model = await getModel({
  model: 'user:researcher-1:quick',  // Uses 'quick' experiment
  userId: 'researcher-1'
})
```

### Option 2: Use with Feature Flags

```typescript
import { enableModels, addTestUser, getModel } from '@core/vendor/model-wrapper'

// Enable models registry for test user
addTestUser('researcher-1')

// Load their TypeScript config
await models.loadUserConfig('researcher-1', './configs/researcher-example.config.ts')

// User gets their custom experiment
const model = await getModel({
  model: 'user:researcher-1:standard',
  userId: 'researcher-1'
})
```

### Option 3: Default Experiment

```typescript
// If config has defaults.experiment set, use without specifying
const model = await getModel({
  model: 'user:researcher-1',  // Uses defaults.experiment
  userId: 'researcher-1'
})
```

## Cost Controls

### Per-Request Limits
```typescript
experiments: {
  cheap: {
    maxCost: 0.001,  // Max $0.001 per request
  },
}
```

### Daily Limits
```typescript
defaults: {
  costLimit: 100.00,  // Max $100 per day
}
```

### Timeout Limits
```typescript
experiments: {
  quick: {
    timeout: 10000,  // 10 seconds max
  },
}
```

## Performance Tracking

Enable to track latency, costs, and success rates:

```typescript
{
  performanceTracking: true,
}
```

Metrics tracked:
- Request count
- Success/failure rates
- Average latency
- P95 latency
- Total cost
- Per-provider metrics

## Validation

All config files are validated with Zod schemas on load. Invalid configs throw detailed errors:

```typescript
try {
  await models.loadUserConfig('user', './config.config.ts')
} catch (error) {
  console.error('Invalid config:', error)
  // Detailed validation errors with field names and expected types
}
```

**TypeScript configs** validate at authoring time (with `defineConfig()`) and at load time.
**YAML configs** validate only at load time.

## Best Practices

### ✅ DO
- Start with an example config and customize
- Set cost limits to prevent overspending
- Use fallback strategy for production
- Enable performance tracking
- Use descriptive experiment names
- Test configs with test users first

### ❌ DON'T
- Hardcode API keys in configs (use environment variables)
- Set unrealistic timeouts (too short or too long)
- Use consensus for all requests (expensive)
- Skip validation (load configs to check)
- Use same config for dev and production

## Troubleshooting

### "Experiment not found"
- Check experiment name matches config
- Verify config was loaded for user
- Check config syntax is valid (TypeScript or YAML)

### "Provider not found"
- Verify provider is enabled in models-instance.ts
- Check provider name format is correct
- Ensure API keys are set in environment

### "Timeout exceeded"
- Increase timeout in experiment config
- Check model availability
- Try fallback strategy with multiple providers

### "Cost limit exceeded"
- Check daily cost limit in defaults
- Verify per-request maxCost
- Review provider pricing

## Examples in Action

See `packages/@lucky/models/examples/` for TypeScript examples demonstrating:
- Basic usage
- Tier resolution
- User configs
- Feature flags
- Error handling

## Further Reading

- **Tier Resolution**: `core/docs/TIER_RESOLUTION.md`
- **Integration Guide**: `packages/@lucky/models/INTEGRATION.md`
- **Complete Docs**: `packages/@lucky/models/README.md`