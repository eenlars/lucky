# Vendor Management & Inference System

## System State Assessment

**Current Architecture:** AI inference system with vendor management distributed across 6+ directories. Provider logic scattered between `runtime/settings/`, `core/src/utils/spending/`, `core/src/messages/api/`, and `core/src/utils/clients/`.

**Primary Purpose:** Cost-optimized AI inference with provider switching capability. Supports OpenRouter, OpenAI, and Groq with unified interface.

**Architectural Problems:**
- No centralized vendor module - logic spread across `modelFactory.ts:14-20`, `provider.ts:1-8`, `models.ts:10-23`
- Inconsistent client implementations - OpenRouter has full client (`openrouterClient.ts`), OpenAI imported directly (`modelFactory.ts:1`)
- Manual pricing updates via script (`fetchOpenRouterPricing.ts`) instead of automated refresh
- 47+ TODO/FIXME comments indicating incomplete implementation
- Console.log debugging instead of structured logging (`locationDataManager.spec.test.ts:39`)

**What Works:**
- Type-safe provider switching via `MODEL_CONFIG.provider` (`models.ts:11`)
- Cost tracking with precise token calculation (`vercelUsage.ts:272-288`)
- Runtime model activation/deactivation (`models.ts:12-22`)
- Comprehensive model metadata in `modelInfo.ts` (500+ models)

## Current Implementation

### Provider Switching Mechanism

**File:** `core/src/utils/spending/provider.ts:1-8`

```typescript
export type LuckyProvider = "openai" | "openrouter" | "groq"
export const CURRENT_PROVIDER = MODEL_CONFIG.provider
```

**Problem:** Global constant requires restart to change providers. No runtime switching capability.

### Client Implementation Status

**OpenRouter:** Complete client (`core/src/utils/clients/openrouter/openrouterClient.ts:1-43`)
- Custom headers, baseURL configuration, multi-vendor routing
- Proper abstraction with configuration options

**OpenAI:** Incomplete - direct import (`core/src/messages/api/modelFactory.ts:1`)
- No custom client wrapper, inconsistent with OpenRouter approach
- Missing configuration standardization

**Groq:** Minimal client (`core/src/utils/clients/groq/groqClient.ts:1-15`)
- Basic wrapper with no advanced features
- No reasoning support (intentional limitation)

### Model Registry Problems

**File:** `core/src/utils/spending/modelInfo.ts:1-2847`

**Issue:** 2847-line file with hardcoded model metadata. No validation, no schema, no automated updates.

```typescript
"anthropic/claude-sonnet-4": {
  input: 3,
  "cached-input": 1.166667,
  output: 15,
  info: "IQ:8/10;speed:medium;pricing:medium;",
  context_length: 1047576,
  active: true,
}
```

**Problems:**
- Manual pricing updates only (`core/scripts/fetchOpenRouterPricing.ts`)
- String-based metadata parsing (`info: "IQ:8/10;speed:medium;"`) instead of structured data
- No pricing validation or staleness detection
- Inconsistent model availability across providers
- "IQ Rating" is subjective and unmaintained

**Data Quality Issues:**
- `getPricingLevel()` function at `pricing.ts:35-49` has null check but returns "medium" for invalid data
- Model names in `models.ts:33` like "openai/gpt-4.1-nano" may not exist in OpenAI API

### Type-Safe Model Selection

**Location:** `core/src/utils/spending/models.types.ts`

The system uses advanced TypeScript to ensure compile-time safety:

```typescript
// Only active models from current provider are allowed
export type ModelName = AllowedModelName<typeof CURRENT_PROVIDER>

// Runtime filtering of inactive models
export type ActiveKeys<T extends Record<string, { active: boolean }>> = Extract<
  { [K in keyof T]: T[K]["active"] extends true ? K : never }[keyof T],
  string
>
```

## 🎯 Model Tiers and Strategy

**Location:** `runtime/settings/models.ts`

Each provider defines model tiers optimized for different use cases:

```typescript
export const DEFAULT_MODELS = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",    // Quick summaries
    nano: "google/gemini-2.5-flash-lite",       // Ultra-light tasks
    low: "google/gemini-2.5-flash-lite",        // Basic processing
    medium: "openai/gpt-4.1-mini",              // Balanced performance
    high: "openai/gpt-4.1",                     // Complex reasoning
    default: "openai/gpt-4.1-nano",             // General fallback
    fitness: "openai/gpt-4.1-mini",             // Evaluation tasks
    reasoning: "openai/gpt-4.1-mini",           // Chain-of-thought
    fallback: "switchpoint/router",             // Emergency backup
  }
}
```

**Smart Model Selection:**
- `getCheapestActiveModelId()`: Automatically selects lowest-cost active model
- Runtime model deactivation via `MODEL_CONFIG.inactive` set
- Provider-specific model name mapping and normalization

## 🔄 Execution Pipeline

### InvocationPipeline Architecture

**Location:** `core/src/messages/pipeline/InvocationPipeline.ts`

The execution pipeline implements a three-phase model:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PREPARE   │───▶│   EXECUTE   │───▶│   PROCESS   │
└─────────────┘    └─────────────┘    └─────────────┘
      │                    │                    │
      ▼                    ▼                    ▼
• Tool init           • Single call      • Response parse
• Message prep        • Multi-step loop  • Memory extract
• Strategy select     • Cost tracking    • Result format
```

**Phase 1: Prepare**
- Tool initialization and permission setup
- Message preparation with context management
- Strategy selection (single-call vs multi-step)

**Phase 2: Execute**
- Single AI invocation with optional tool use
- Multi-step autonomous loops (V2/V3 strategies)
- Continuous cost and timeout monitoring

**Phase 3: Process**
- Response parsing and validation
- Memory extraction for learning
- Result formatting and persistence

### Multi-Step Execution Strategies

**Location:** `core/src/messages/pipeline/agentStepLoop/`

#### MultiStepLoopV3 (Advanced)

```typescript
export async function runMultiStepLoopV3Helper(
  context: MultiStepLoopContext
): Promise<{
  processedResponse: ProcessedResponse
  debugPrompts: string[]
  updatedMemory: Record<string, string>
}>
```

**Key Features:**
- **Autonomous Decision Making:** AI decides when to continue or terminate
- **Tool Orchestration:** Intelligent selection and parameter generation
- **Validation Loops:** Self-checking of tool outputs
- **Memory Management:** Learning extraction and persistence
- **Error Recovery:** Graceful handling of tool failures

**Execution Flow:**
1. **Strategy Selection:** AI analyzes context and chooses next action
2. **Tool Execution:** Selected tool runs with AI-generated parameters
3. **Output Validation:** Results checked against expectations
4. **Memory Update:** Learnings extracted and stored
5. **Loop Decision:** Continue or terminate based on goal achievement

## 🛡️ Guard Rails and Safety

### Spending Control

**Location:** `core/src/utils/spending/SpendingTracker.ts`

```typescript
export class SpendingTracker {
  private spend = 0
  private limit = 0
  private sdkSpend = 0  // Separate SDK cost tracking
  
  addCost(cost: number): void {
    if (!Number.isFinite(cost) || cost < 0) return
    if (this.active) this.spend += cost
  }
  
  canMakeRequest(): boolean {
    return !this.active || this.spend < this.limit
  }
}
```

### Stall Detection

**Location:** `core/src/messages/api/stallGuard.ts`

Dual-timeout system prevents hanging requests:

```typescript
export async function runWithStallGuard<R>(
  base: Parameters<typeof generateText>[0],
  {
    modelName,
    overallTimeoutMs,    // Maximum total time
    stallTimeoutMs,      // Maximum time between tokens
  }
): Promise<R>
```

**Protection Mechanisms:**
- **Overall Timeout:** Hard limit on total execution time
- **Stall Detection:** Detects when token generation stops
- **Graceful Abort:** Clean request termination on timeout

### Rate Limiting

**Location:** `core/src/messages/api/sendAI/guards.ts`

Prevents API rate limit violations:
- Request frequency throttling
- Provider-specific rate limit awareness
- Automatic backoff strategies

## 🧠 Reasoning and Context Management

### Reasoning Support

**Location:** `core/src/messages/api/modelFactory.ts`

Provider-aware reasoning capabilities:

```typescript
export function getLanguageModelWithReasoning(
  modelName: ModelName,
  opts?: { reasoning?: boolean }
): LanguageModel {
  const provider = CURRENT_PROVIDER
  
  if (provider === "openrouter") {
    const isAnthropic = modelStr.startsWith("anthropic/")
    const isGeminiThinking = modelStr.includes("gemini") && 
                            modelStr.includes("thinking")
    
    if (isAnthropic || isGeminiThinking) {
      return openrouter(modelName, { 
        reasoning: { max_tokens: 2048 } 
      })
    }
    return openrouter(modelName, { 
      reasoning: { effort: "medium" } 
    })
  }
}
```

### Tool Selection Intelligence

**Location:** `core/src/messages/pipeline/selectTool/selectToolStrategyV3.ts`

AI-powered tool selection with reasoning:

```typescript
export async function selectToolStrategyV3<T extends ToolSet>(
  options: SelectToolStrategyOptions<T>
): Promise<{
  strategyResult: StrategyResult<T>
  debugPrompt: string
}>
```

**Selection Process:**
1. **Context Analysis:** Review execution history and available tools
2. **Goal Assessment:** Evaluate progress toward objectives
3. **Tool Evaluation:** Match capabilities to current needs
4. **Reasoning Generation:** Explain decision rationale
5. **Termination Logic:** Decide when goals are achieved

## 💰 Cost Management

### Usage Calculation

**Location:** `core/src/messages/api/vercel/pricing/vercelUsage.ts`

Precise cost tracking with optimizations:

```typescript
export function calculateUsageCost(
  usage: TokenUsage,
  modelId: string
): number {
  const pricing = getModelV2(modelId)
  
  const inputCost = usage.inputTokens * pricing.input / 1_000_000
  const outputCost = usage.outputTokens * pricing.output / 1_000_000
  
  // Cached input optimization
  const cachedCost = usage.cachedInputTokens 
    ? usage.cachedInputTokens * pricing["cached-input"] / 1_000_000
    : 0
    
  return inputCost + outputCost - cachedCost
}
```

### Model Cost Optimization

**Location:** `core/src/utils/spending/pricing.ts`

Automatic model selection based on cost tiers:

```typescript
export function getPricingLevel(model: ModelName): PricingLevel {
  const info = getModelV2(model)?.info
  const match = info.match(/pricing:(\w+);/)
  return match[1] as PricingLevel  // "low" | "medium" | "high"
}
```

## 🔧 Execution Modes

### Text Generation

**Location:** `core/src/messages/api/sendAI/modes/execText.ts`

Pure text generation with reasoning support:

```typescript
export async function execText(
  req: TextRequest
): Promise<TResponse<string>> {
  const model = getLanguageModelWithReasoning(
    req.model, 
    { reasoning: req.reasoning }
  )
  
  return await runWithStallGuard(
    { model, messages: req.messages },
    {
      modelName: req.model,
      overallTimeoutMs: CONFIG.limits.overallTimeoutMs,
      stallTimeoutMs: CONFIG.limits.stallTimeoutMs
    }
  )
}
```

### Tool Execution

**Location:** `core/src/messages/api/sendAI/modes/execTool.ts`

Tool-augmented AI with validation:

```typescript
export async function execTool(
  req: ToolRequest
): Promise<TResponse<GenerateTextResult<ToolSet, unknown>>> {
  const model = getLanguageModel(req.model)
  
  return await generateText({
    model,
    messages: req.messages,
    tools: req.tools,
    toolChoice: req.toolChoice
  })
}
```

### Structured Output

**Location:** `core/src/messages/api/sendAI/modes/execStructured.ts`

Schema-enforced JSON generation:

```typescript
export async function execStructured<T>(
  req: StructuredRequest<T>
): Promise<TResponse<T>> {
  const model = getLanguageModel(req.model)
  
  return await generateObject({
    model,
    messages: req.messages,
    schema: req.schema
  })
}
```

## 🔄 Fallback Strategies

### Model Fallback

**Location:** `core/src/messages/api/sendAI/fallbacks.ts`

Automatic fallback on model failures:

```typescript
export function shouldUseModelFallback(
  error: any,
  modelName: ModelName
): boolean {
  return (
    isTimeoutError(error) ||
    isRateLimitError(error) ||
    isContextLengthError(error)
  )
}

export function getFallbackModel(): ModelName {
  return getDefaultModels().fallback
}
```

### Error Recovery

**Location:** `core/src/messages/api/sendAI/errors.ts`

Comprehensive error normalization:

```typescript
export function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    // Provider-specific error handling
    if (error.message.includes('rate_limit_exceeded')) {
      return 'Rate limit exceeded. Please try again later.'
    }
    if (error.message.includes('context_length_exceeded')) {
      return 'Input too long. Please reduce message length.'
    }
  }
  return 'An unexpected error occurred.'
}
```

## 🔗 Integration Points

### Workflow Integration

The inference system integrates with workflows through:

- **Node Execution:** Individual workflow nodes use the inference pipeline
- **Message Passing:** Results flow between nodes via structured messages
- **Context Management:** Shared memory and file access across nodes
- **Tool Orchestration:** Tools available to all nodes in workflow

### Tool System Integration

**Location:** `core/src/tools/`

Tools integrate with inference through:

- **Permission System:** Fine-grained tool access control
- **Parameter Generation:** AI generates tool parameters automatically
- **Result Validation:** AI validates tool outputs against expectations
- **Error Handling:** Graceful handling of tool execution failures

## 📊 Observability

### Logging and Metrics

**Location:** `core/src/utils/observability/obs.ts`

Comprehensive execution tracking:

```typescript
obs.span("strategy.selectTool.v3", 
  { model: String(model), rounds_left: roundsLeft }, 
  async () => {
    // Execution with automatic metrics
    obs.event("strategy.selectTool:decision", {
      type: result.type,
      cost_usd: result.usdCost,
    })
  }
)
```

### Debug Information

Every execution provides:
- **Cost Breakdown:** Input/output token costs
- **Execution Trace:** Step-by-step agent decisions
- **Debug Prompts:** Exact prompts sent to models
- **Tool Usage:** Parameters and results for each tool call
- **Memory Updates:** Learnings extracted from execution

## Required Vendor Module Architecture

### Current Vendor Logic Distribution

**Problem:** Vendor concerns scattered across 6 directories without central coordination.

```
runtime/settings/models.ts:10-23        ← Provider config
core/src/utils/spending/provider.ts:1-8  ← Type definitions
core/src/utils/clients/*/                ← Client implementations
core/src/messages/api/modelFactory.ts    ← Provider routing
core/src/utils/spending/modelInfo.ts     ← Model metadata
core/scripts/fetchOpenRouterPricing.ts   ← Manual pricing updates
```

### Proposed Vendor Module Structure

**Location:** `core/src/vendor/` (new directory)

```
vendor/
├── registry/
│   ├── ProviderRegistry.ts         ← Centralized provider management
│   ├── ModelRegistry.ts           ← Validated model metadata
│   └── PricingRegistry.ts         ← Automated pricing updates
├── clients/
│   ├── VendorClient.interface.ts  ← Unified client contract
│   ├── OpenRouterClient.ts        ← Move from utils/clients/
│   ├── OpenAIClient.ts            ← Create missing client
│   └── GroqClient.ts              ← Move from utils/clients/
├── config/
│   ├── VendorConfig.ts            ← Environment & settings
│   └── ModelTiers.ts              ← Move from runtime/settings/
└── VendorManager.ts               ← Main coordination class
```

### Implementation Requirements

**1. Unified Client Interface** (`vendor/clients/VendorClient.interface.ts`)

```typescript
interface VendorClient {
  provider: LuckyProvider
  createModel(modelName: string, options?: ModelOptions): LanguageModel
  getAvailableModels(): Promise<ModelInfo[]>
  validateApiKey(): Promise<boolean>
  healthCheck(): Promise<HealthStatus>
}
```

**2. Provider Registry** (`vendor/registry/ProviderRegistry.ts`)

```typescript
class ProviderRegistry {
  private providers: Map<LuckyProvider, VendorClient> = new Map()
  
  register(provider: LuckyProvider, client: VendorClient): void
  switchProvider(provider: LuckyProvider): void  // Runtime switching
  getCurrentProvider(): VendorClient
  getAllProviders(): LuckyProvider[]
}
```

**3. Automated Pricing Updates** (`vendor/registry/PricingRegistry.ts`)

```typescript
class PricingRegistry {
  async refreshPricing(provider: LuckyProvider): Promise<void>
  validatePricing(modelId: string): boolean
  getPricingStaleness(modelId: string): number  // days since update
}
```

### Migration Benefits

**Eliminates:**
- 6-directory vendor logic scatter
- Manual pricing script execution
- Inconsistent client implementations
- Global provider constants requiring restarts

**Provides:**
- Runtime provider switching
- Automated pricing validation
- Unified error handling per provider
- Consistent client lifecycle management
- Centralized vendor configuration

## 🚀 Advanced Features

### Memory and Learning

The system extracts learnings from each execution:

```typescript
const learnings = await makeLearning({
  nodeId: context.nodeId,
  agentSteps: agentSteps,
  goal: context.identityPrompt
})
```

### Parallel Processing

Support for concurrent tool execution and model calls:

```typescript
// Multiple models can be called in parallel for comparison
const results = await Promise.all([
  sendAI({ model: "high", messages }),
  sendAI({ model: "medium", messages })
])
```

### Context Optimization

Intelligent context window management:
- Automatic message truncation based on model limits
- Cached input utilization for cost reduction
- Context compression for long conversations

## 📈 Performance Characteristics

### Latency Optimization

- **Model Routing:** Automatic selection of fastest available model
- **Connection Pooling:** Persistent connections to providers
- **Request Batching:** Multiple requests combined when possible

### Cost Optimization

- **Smart Model Selection:** Cheapest model matching requirements
- **Cached Input Usage:** Reuse of context for cost reduction
- **Automatic Fallback:** Cheaper models on failures

### Reliability

- **Multiple Providers:** Fallback between OpenRouter, OpenAI, Groq
- **Timeout Protection:** Dual-timeout system prevents hanging
- **Error Recovery:** Automatic retry with backoff strategies

This inference system provides a robust, cost-effective, and intelligent foundation for AI-powered workflows with comprehensive safety measures, observability, and optimization features.