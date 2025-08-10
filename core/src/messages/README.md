# Messages Module

Inter-node communication system for AI-driven workflow execution.

## Overview

```
messages/
├── api/sendAI/        # AI model interaction
├── create/            # Message construction
├── handoffs/          # Node routing logic
├── pipeline/          # Processing pipeline
├── WorkflowMessage.ts # Core message class
└── MessagePayload.ts  # Payload types
```

## Core Components

### WorkflowMessage

Node-to-node message passing with automatic persistence:

```typescript
const message = new WorkflowMessage({
  originInvocationId: "inv_123",
  fromNodeId: "analyzer",
  toNodeId: "processor",
  seq: 1,
  payload: { kind: "delegation", berichten: [...] },
  wfInvId: "wf_456"
})
```

### Message Payloads

```typescript
type Payload =
  | DelegationPayload // Task assignment
  | SequentialPayload // Sequential processing
  | ReplyPayload // Task results
  | AggregatedPayload // Multiple messages
```

### AI Communication

Unified AI interface with fallback support:

```typescript
const response = await sendAI({
  mode: "tool",
  messages: [...],
  model: "claude-3-sonnet",
  tools: availableTools
})
```

## Key Features

### Handoff Strategies

- **Sequential**: Flexible node-to-node routing
- **Hierarchical**: Parent-child orchestration with worker delegation

### Processing Pipeline

1. Message validation
2. AI model execution
3. Response processing
4. Tool call extraction
5. Next node routing

### Error Handling

- Automatic retries with exponential backoff
- Model fallback chains
- Request repair for validation errors
- Rate limiting and spending guards

## Usage Examples

### Basic Message Flow

```typescript
// Create initial message
const msg = new WorkflowMessage({
  fromNodeId: "start",
  toNodeId: "analyzer",
  payload: { kind: "sequential", berichten: [...] }
})

// Process with AI
const result = await sendAI({
  mode: "text",
  messages: [{ role: "user", content: "..." }],
  model: "gpt-4"
})
```

### Tool-Based Processing

```typescript
const response = await sendAI({
  mode: "tool",
  messages: conversation,
  tools: [analyzeTool, processTool],
  maxSteps: 5,
})
```

### Structured Output

```typescript
const result = await sendAI({
  mode: "structured",
  messages: [...],
  schema: z.object({
    analysis: z.string(),
    confidence: z.number()
  })
})
```

## API Reference

### sendAI Options

- `mode`: "text" | "tool" | "structured"
- `messages`: AI conversation history
- `model`: Model identifier
- `tools`: Available tools (tool mode)
- `schema`: Zod schema (structured mode)
- `maxSteps`: Max tool iterations
- `temperature`: Response randomness
- `maxTokens`: Output limit

### Message Fields

- `messageId`: Unique identifier
- `fromNodeId`: Source node
- `toNodeId`: Target node
- `payload`: Message content
- `seq`: Sequence number
- `wfInvId`: Workflow invocation ID

## Best Practices

1. Use typed payloads for message content
2. Handle errors at each processing step
3. Validate tool responses before proceeding
4. Track message sequences for debugging
5. Set appropriate token limits
