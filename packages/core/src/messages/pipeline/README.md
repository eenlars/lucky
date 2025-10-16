# Invocation Pipeline

**What**: Executes AI agent nodes with tool use, multi-step reasoning, and memory persistence.

**Why**: Single orchestration point for all agent execution strategies (single-call, multi-step loops V2/V3, Claude SDK).

## Flow

```
┌─────────────────────────────────────────────────────────────┐
│ WorkFlowNode.invoke(context)                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ InvocationPipeline                                          │
│                                                             │
│  1. PREPARE                                                 │
│     ├─ Initialize tools (MCP + code)                       │
│     ├─ Prepare incoming message                            │
│     └─ Select tool choice strategy                         │
│                                                             │
│  2. EXECUTE                                                 │
│     ├─ useClaudeSDK? ──Yes──> runWithSDK()                │
│     │                                                       │
│     ├─ experimentalMultiStepLoop && tools? ──Yes──>       │
│     │   ├─ v3? ──> runMultiStepLoopV3()                   │
│     │   └─ v2? ──> runMultiStepLoopV2()                   │
│     │                                                       │
│     └─ else ──> runSingleCall()                           │
│                                                             │
│  3. PROCESS                                                 │
│     ├─ Extract memory learnings                            │
│     ├─ Generate summary                                    │
│     └─ Format NodeInvocationResult                         │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ Result to caller │
         └─────────────────┘
```

## Execution Strategies

### Single-Call
```
AI → [optional tool use] → response
```
- Used when: no experimentalMultiStepLoop OR no tools
- maxSteps: from `nodeConfig.maxSteps` or global `maxStepsVercel`

### Multi-Step Loop V2/V3
```
Round 1: selectToolStrategy → execute tool → check result
Round 2: selectToolStrategy → execute tool → check result
...
Round N: selectToolStrategy → terminate
```
- Used when: experimentalMultiStepLoop=true AND tools available
- maxRounds: from `nodeConfig.maxSteps` or global `experimentalMultiStepLoopMaxRounds`
- Each round: AI decides next tool or terminate
- Strategy prompt includes: `roundsLeft = maxRounds - currentRound`

**V2 vs V3**:
- V2: Simple tool selection
- V3: Advanced with mutation tracking, trace analysis, self-checking

### Claude SDK
```
Direct Anthropic API → response
```
- Used when: `nodeConfig.useClaudeSDK = true`
- Bypasses Vercel AI SDK entirely
- No multi-step support

## Configuration Hierarchy

```
Priority Chain (left to right):
nodeConfig.maxSteps → globalConfig → 10 (hard cap)

Per-Node Override          Global Default          Hard Cap
─────────────────          ──────────────          ────────
nodeConfig.maxSteps   →    maxStepsVercel          → min(result, 10)
                      →    experimentalMulti...
```

**Logic**: `Math.min(nodeConfig.maxSteps ?? globalDefault ?? 10, 10)`

**Example**:
```typescript
{
  nodeId: "analyzer",
  maxSteps: 3,  // This node limited to 3 steps/rounds
  systemPrompt: "...",
  // ...
}

// maxSteps not set → uses global → capped at 10
// maxSteps = 15 → capped to 10
// maxSteps = 5 → uses 5
```

## Key Files

- `InvocationPipeline.ts` - Main orchestrator (prepare → execute → process)
- `agentStepLoop/MultiStepLoopV2.ts` - Simple iterative tool execution
- `agentStepLoop/MultiStepLoopV3.ts` - Advanced with self-checking
- `agentStepLoop/utils.ts` - Pipeline utilities (`getEffectiveMaxSteps`, `toolUsageToString`)
- `selectTool/selectToolStrategyV2/V3.ts` - AI decides next tool (receives `roundsLeft`)
- `input.types.ts` - Context interface

## State Management

```
CREATED → PREPARED → EXECUTING → EXECUTED → PROCESSING → COMPLETED
                                                      ↘
                                                       ERROR
```

Enforced via enum transitions to prevent race conditions.

## Memory & Cost

- **Memory**: Extracted via `makeLearning()` after execution
- **Cost**: Tracked throughout pipeline, aggregated in SpendingTracker
- **Agent Steps**: Detailed execution log (reasoning, tool calls, results)

## Critical Paths

**Path selection logic** (execute phase):
1. Check `useClaudeSDK` → run SDK path
2. Check `experimentalMultiStepLoop` AND tools → run loop (V2 or V3)
3. Else → single-call (text or tool mode)

**maxSteps propagation**:
- Helper: `getEffectiveMaxSteps(nodeConfig.maxSteps, globalDefault)` → capped at 10
- Single-call: `sendAI({ opts: { maxSteps: getEffectiveMaxSteps(...) } })`
- Multi-step: `runMultiStepLoop({ maxRounds: getEffectiveMaxSteps(...) })`
- Strategy: Loop calculates `roundsLeft` and passes to AI prompt
