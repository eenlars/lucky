# Testing maxSteps Implementation

## Quick Verification

### 1. Unit Tests ✅
```bash
bun test packages/core/src/messages/pipeline/agentStepLoop/__tests__/getEffectiveMaxSteps.test.ts
```

**What it tests:**
- Priority chain: `nodeConfig.maxSteps` → `globalDefault` → `10`
- Hard cap at 10 steps
- Edge cases (0, undefined, etc.)

### 2. Manual Test Script
```bash
bun run test-maxsteps.ts
```

**What it tests:**
- Real node execution with `maxSteps=2`
- Fallback to global default when `maxSteps` not set
- Tool call limiting in practice

### 3. Integration Test (Recommended)

Create a workflow JSON and run it:

```json
{
  "__schema_version": 1,
  "entryNodeId": "start",
  "nodes": [
    {
      "nodeId": "start",
      "description": "Test maxSteps limiting",
      "systemPrompt": "Use multiple tools to solve this problem step by step.",
      "modelName": "gpt-4o-mini",
      "mcpTools": [],
      "codeTools": ["math", "get-time"],
      "handOffs": [],
      "maxSteps": 3
    }
  ]
}
```

Run with:
```bash
cd packages/core
bun run once --workflow test-workflow.json --prompt "Calculate 5 + 10, then multiply by 2, then tell me the time"
```

**Expected behavior:**
- Should stop after 3 tool calls
- Check logs for "roundsLeft" in strategy prompts

## Verification Checklist

### ✅ Check 1: getEffectiveMaxSteps Logic
```typescript
// In agentStepLoop/utils.ts
export function getEffectiveMaxSteps(
  nodeMaxSteps: number | undefined,
  globalDefault: number
): number {
  const effective = nodeMaxSteps ?? globalDefault ?? 10
  return Math.min(effective, 10)
}
```

**Priority:**
1. Use `nodeConfig.maxSteps` if set
2. Else use `globalDefault`
3. Else use `10`
4. Always cap at `10`

### ✅ Check 2: Applied in All Execution Paths

**Single-call text mode** (`InvocationPipeline.ts:444`):
```typescript
maxSteps: getEffectiveMaxSteps(
  this.ctx.nodeConfig.maxSteps,
  config.tools.maxStepsVercel
)
```

**Single-call tool mode** (`InvocationPipeline.ts:505`):
```typescript
maxSteps: this.toolChoice === "required"
  ? 1
  : getEffectiveMaxSteps(
      this.ctx.nodeConfig.maxSteps,
      config.tools.maxStepsVercel
    )
```

**Multi-step loop V2** (`InvocationPipeline.ts:564`):
```typescript
maxRounds: getEffectiveMaxSteps(
  this.ctx.nodeConfig.maxSteps,
  maxRounds
)
```

**Multi-step loop V3** (`InvocationPipeline.ts:582`):
```typescript
maxRounds: getEffectiveMaxSteps(
  this.ctx.nodeConfig.maxSteps,
  maxRounds
)
```

### ✅ Check 3: Strategy Prompts Include roundsLeft

**V2** (`selectToolStrategyV2.ts:92`):
```typescript
- Rounds left: ${roundsLeft} (if 0, terminate)
```

**V3** (`selectToolStrategyV3.ts:170`):
```typescript
- Rounds left: ${roundsLeft} (if 0, terminate)
```

## How to Debug Issues

### Enable Verbose Logging

In your `.env` or runtime config:
```bash
LOG_TOOLS=true
LOG_INVOCATION_PIPELINE=true
```

### Check Logs For:

1. **maxRounds value** - Should match your `nodeConfig.maxSteps`
   ```
   [InvocationPipeline] maxRounds: 3
   ```

2. **roundsLeft in prompts** - Should decrease each iteration
   ```
   CONTEXT
   - Rounds left: 3 (if 0, terminate)
   ```

3. **Termination reason** - Should stop at maxSteps
   ```
   [MultiStepLoopV3] Terminated: max rounds reached (3/3)
   ```

### Common Issues

**Issue**: maxSteps not being respected
- Check: Is `experimentalMultiStepLoop` enabled in config?
- Check: Are you in single-call or multi-step mode?
- Check: What does `getEffectiveMaxSteps` return in your case?

**Issue**: Always capped at 10 even with lower values
- This is correct behavior! The cap is a hard maximum.
- If you need more, increase the cap in `getEffectiveMaxSteps`

**Issue**: Node doesn't use custom maxSteps
- Check: Is `maxSteps` field present in `WorkflowNodeConfig`?
- Check: Is the schema validation passing?
- Run: `bun run tsc` to verify types

## Example: Watching It Work

```bash
# Terminal 1: Run test workflow
cd packages/core
LOG_TOOLS=true bun run once --workflow test-workflow.json --prompt "Multi-step task"

# You should see:
# Round 1: selectToolStrategy (roundsLeft: 3)
# Round 2: selectToolStrategy (roundsLeft: 2)
# Round 3: selectToolStrategy (roundsLeft: 1)
# Terminated: max rounds reached
```

## Schema Verification

```typescript
import { WorkflowNodeConfigSchema } from "@lucky/shared"

// This should parse successfully
const config = WorkflowNodeConfigSchema.parse({
  nodeId: "test",
  description: "test",
  systemPrompt: "test",
  modelName: "gpt-4o-mini",
  mcpTools: [],
  codeTools: [],
  handOffs: [],
  maxSteps: 5, // ← Should validate
})

console.log(config.maxSteps) // 5
```
