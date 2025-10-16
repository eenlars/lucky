# Agent Streaming Architecture - IMPLEMENTED ✅

## Implementation Summary

Real-time workflow execution observation using SSE (Server-Sent Events) with per-workflow isolated event streams.

## Key Components

### 1. ObservationContext (Separate AsyncLocalStorage)
**Location:** `packages/core/src/context/observationContext.ts`

```typescript
export type ObservationContext = {
  randomId: string
  observer: AgentObserver
}

export function withObservationContext<T>(ctx: ObservationContext, fn: () => Promise<T>)
export function getObservationContext(): ObservationContext | undefined
```

**Why separate from ExecutionContext?** Clean separation of concerns - observation is orthogonal to execution.

### 2. AgentObserver (Per-workflow event collector)
**Location:** `packages/core/src/utils/observability/AgentObserver.ts`

- Ring buffer (1000 events max)
- Subscribe/unsubscribe pattern for live streaming
- `getEvents(since?)` for reconnection backfill

### 3. ObserverRegistry (Singleton)
**Location:** `packages/core/src/utils/observability/ObserverRegistry.ts`

Maps `randomId` → `AgentObserver` for SSE endpoint lookups.

### 4. AgentEvent Types
**Location:** `packages/shared/src/types/agentEvents.ts`

Discriminated union:
- `agent.start` - Node execution begins
- `agent.end` - Node execution completes (cost, duration, tokens)
- `agent.error` - Node execution fails
- `agent.tool.start` - Tool call begins
- `agent.tool.end` - Tool call completes

### 5. Event Emitters
**Location:** `packages/core/src/utils/observability/agentEvents.ts`

Helper functions that get observation context and emit events:
- `emitAgentStart(nodeId, nodeName)`
- `emitAgentEnd(nodeId, duration, cost, tokenUsage?)`
- `emitAgentError(nodeId, error)`
- `emitAgentToolStart(nodeId, toolName, args)`
- `emitAgentToolEnd(nodeId, toolName, duration, result?, error?)`

## Data Flow

```
┌─────────────────────────────────────────────┐
│ POST /api/workflow/invoke                   │
│ 1. Generate randomId                        │
│ 2. Create AgentObserver                     │
│ 3. Register in ObserverRegistry             │
│ 4. Nest contexts:                           │
│    withExecutionContext() {                 │
│      withObservationContext() {             │
│        invokeWorkflow()                     │
│      }                                       │
│    }                                         │
│ 5. Return { ...result, randomId }           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ WorkFlowNode.invoke()                       │
│ - emitAgentStart()                          │
│ - execute pipeline                          │
│ - emitAgentEnd() / emitAgentError()         │
│                                              │
│ MultiStepLoopV3                             │
│ - emitAgentToolStart()                      │
│ - execute tool                              │
│ - emitAgentToolEnd()                        │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ getObservationContext()                     │
│ → observer.emit(event)                      │
│   - Add to ring buffer                      │
│   - Notify all subscribers                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ GET /api/agents/{randomId}/stream           │
│ 1. Get observer from registry               │
│ 2. Send buffered events (backfill)          │
│ 3. Subscribe to live events                 │
│ 4. Stream via SSE                           │
│ 5. Cleanup on disconnect                    │
└─────────────────────────────────────────────┘
```

## Usage

**Client:**
1. POST to `/api/workflow/invoke` with workflow input
2. Receive `{ ...result, randomId }` in response
3. Connect to `GET /api/agents/{randomId}/stream`
4. Listen for SSE events

**Event format:**
```typescript
data: {"type":"agent.start","nodeId":"abc","nodeName":"Researcher","timestamp":1234567890}
data: {"type":"agent.tool.start","nodeId":"abc","toolName":"web_search","args":{...},"timestamp":...}
data: {"type":"agent.tool.end","nodeId":"abc","toolName":"web_search","duration":1500,"timestamp":...}
data: {"type":"agent.end","nodeId":"abc","duration":2000,"cost":0.002,"timestamp":...}
```

## Implementation Status

✅ `ObservationContext` - Separate AsyncLocalStorage for observation
✅ `AgentObserver` - Ring buffer + subscription pattern
✅ `ObserverRegistry` - Singleton registry
✅ `AgentEvent` types - Discriminated union in `@lucky/shared`
✅ Event emitters - Helper functions using observation context
✅ `WorkFlowNode` integration - Emit start/end/error events
✅ SSE endpoint - Stream buffered + live events
✅ Type safety - Full TypeScript support
✅ Smoke tests - Pass

## Notes

- Observer disposed 5 minutes after workflow completion (TTL)
- Ring buffer prevents memory leaks (max 1000 events)
- SSE auto-closes after 5 minutes
- No token streaming (limitation of current `sendAI` implementation)
- Pre-existing type error in trace visualization (unrelated to agent streaming)
