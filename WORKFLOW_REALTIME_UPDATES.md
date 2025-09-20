# Real-time Workflow Updates System

A comprehensive real-time workflow execution monitoring system built with Server-Sent Events (SSE) and React hooks.

## 🚀 Features

- **Real-time Event Streaming**: Live updates via SSE for workflow execution
- **Type-safe Events**: Strongly typed workflow events with TypeScript
- **React Integration**: Custom hooks and components for React applications
- **Connection Management**: Automatic reconnection and connection monitoring
- **Event Filtering**: Subscribe to specific events, nodes, or invocations
- **Performance Monitoring**: Track node execution, tool calls, and costs
- **SDK-Ready**: Clean architecture for future SDK packaging

## 🏗️ Architecture

### Core Components

1. **Observability Module** (`core/src/utils/observability/`)
   - Event emission infrastructure
   - SSE sink for real-time streaming
   - Workflow event context management

2. **API Layer** (`app/src/app/api/workflow/stream/`)
   - SSE endpoint for event streaming
   - Connection management APIs
   - Event filtering and subscriptions

3. **Frontend Hooks** (`app/src/hooks/`)
   - React hooks for consuming events
   - Workflow progress tracking
   - Node status monitoring

4. **UI Components** (`app/src/components/workflow/`)
   - Real-time progress indicators
   - Execution dashboards
   - Node status visualizations

## 🔧 Usage

### Backend Setup

1. **Initialize Observability** (in your app startup):
```typescript
import { initializeObservability } from '@core/utils/observability/setup'

// Initialize at app startup
initializeObservability({
  enableConsoleLogging: true,
  enableSSEStreaming: true,
})
```

2. **Workflow Execution** (automatically integrated):
The system automatically emits events during workflow execution in `queueRun.ts`.

### Frontend Usage

1. **Add Context Provider**:
```tsx
import { WorkflowStreamProvider } from '@/contexts/WorkflowStreamContext'

function App() {
  return (
    <WorkflowStreamProvider>
      <YourApp />
    </WorkflowStreamProvider>
  )
}
```

2. **Use Workflow Stream Hook**:
```tsx
import { useWorkflowStream } from '@/hooks/useWorkflowStream'

function WorkflowMonitor({ invocationId }: { invocationId: string }) {
  const { events, isConnected, lastEvent } = useWorkflowStream({
    invocationId,
    events: ['node:execution:started', 'node:execution:completed']
  })

  return (
    <div>
      <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Events: {events.length}</p>
      {lastEvent && <p>Latest: {lastEvent.event}</p>}
    </div>
  )
}
```

3. **Use Progress Tracking**:
```tsx
import { useWorkflowProgress } from '@/hooks/useWorkflowStream'

function ProgressBar({ invocationId }: { invocationId: string }) {
  const progress = useWorkflowProgress(invocationId)

  return (
    <div>
      <div>Progress: {progress.percentage}%</div>
      <div>Nodes: {progress.completedNodes}/{progress.totalNodes}</div>
      <div>Current: {progress.currentNodeId}</div>
    </div>
  )
}
```

4. **Use Pre-built Components**:
```tsx
import { WorkflowProgressIndicator } from '@/components/workflow/WorkflowProgressIndicator'
import { WorkflowExecutionDashboard } from '@/components/workflow/WorkflowExecutionDashboard'

function WorkflowView({ invocationId }: { invocationId: string }) {
  return (
    <div>
      <WorkflowProgressIndicator invocationId={invocationId} />
      <WorkflowExecutionDashboard invocationId={invocationId} />
    </div>
  )
}
```

## 📊 Event Types

The system emits the following typed events:

### Workflow Events
- `workflow:started` - Workflow execution begins
- `workflow:completed` - Workflow execution ends
- `workflow:progress` - Progress updates
- `workflow:error` - Workflow-level errors

### Node Events
- `node:execution:started` - Node begins execution
- `node:execution:completed` - Node finishes execution

### Message Events
- `message:queued` - Message added to queue
- `message:processed` - Message processed

### Tool Events
- `tool:execution:started` - Tool call begins
- `tool:execution:completed` - Tool call ends

### LLM Events
- `llm:call:started` - LLM API call begins
- `llm:call:completed` - LLM API call ends

### Memory Events
- `memory:updated` - Node memory updated

## 🔌 API Endpoints

### Stream Events
```
GET /api/workflow/stream
```

Query parameters:
- `invocationId` - Filter by workflow invocation
- `nodeId` - Filter by specific node
- `events` - Comma-separated event types
- `excludeHeartbeat` - Exclude heartbeat events

### Connection Management
```
GET /api/workflow/stream/connections
DELETE /api/workflow/stream/connections
```

## 🎯 Event Filtering

Events can be filtered by:

1. **Invocation ID**: Only events for specific workflow execution
2. **Node ID**: Only events for specific node
3. **Event Types**: Only specific event types
4. **Custom Attributes**: Match specific event attributes

Example:
```typescript
const { events } = useWorkflowStream({
  invocationId: 'wf_inv_123',
  nodeId: 'node_456',
  events: ['node:execution:started', 'node:execution:completed'],
  excludeHeartbeat: true
})
```

## 🔄 Connection Management

The system includes automatic:
- **Reconnection**: Auto-reconnect on connection loss
- **Heartbeat**: Keep connections alive
- **Cleanup**: Remove inactive connections
- **Error Handling**: Graceful error recovery

## 📈 Performance Considerations

- **Event Buffering**: Recent events buffered for new connections
- **Connection Limits**: Configurable connection management
- **Memory Management**: Automatic cleanup of old events
- **Efficient Filtering**: Server-side event filtering

## 🛡️ Security

- **Authentication**: Requires valid authentication
- **Connection Tracking**: Monitor active connections
- **Rate Limiting**: (Can be added as needed)
- **Event Sanitization**: Safe event data handling

## 🧪 Development

### Testing SSE Connection
```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/workflow/stream?invocationId=test"
```

### Monitoring Connections
```bash
curl -X POST http://localhost:3000/api/workflow/stream/connections
```

## 🔮 Future Enhancements

- **WebSocket Support**: Alternative to SSE for bidirectional communication
- **Event Replay**: Replay events from persistent storage
- **Advanced Filtering**: Complex event filtering with expressions
- **Metrics Dashboard**: Administrative metrics and monitoring
- **Event Persistence**: Store events for historical analysis
- **Multi-tenant Support**: Tenant-specific event isolation

## 📋 Integration Checklist

- [x] Core observability infrastructure
- [x] SSE sink and streaming
- [x] Workflow execution event emission
- [x] API endpoints for SSE
- [x] React hooks for consuming events
- [x] UI components for visualization
- [x] Connection management
- [x] Event filtering
- [x] Type safety
- [x] Error handling and reconnection
- [x] Documentation

## 🏃‍♂️ Quick Start

1. Initialize observability in your app startup
2. Add WorkflowStreamProvider to your React app
3. Use hooks in components that need real-time updates
4. Start a workflow execution and watch events stream live!

The system is designed to be production-ready and SDK-compatible, ensuring it will work seamlessly as the core module evolves into a standalone SDK.