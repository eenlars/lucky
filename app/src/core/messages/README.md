# Core Messages Module

Type-safe message creation, processing, and routing system for workflow node communication with AI integration and dynamic handoff logic.

## Quick Start

```typescript
import { WorkflowMessage } from "@/core/messages/WorkflowMessage"
import { sendAI } from "@/core/messages/api/sendAI"

// Create workflow message
const message = new WorkflowMessage({
  content: "Analyze this data...",
  workflowInvocationId: "wi_123",
  nodeId: "analyzer",
  payload: { type: "delegation", data: inputData },
})

// Send AI request with retry logic
const response = await sendAI({
  messages: [message],
  model: "claude-3-sonnet",
  tools: availableTools,
  maxRetries: 3,
})
```

## Architecture

```
messages/
├── api/                    # AI model communication
│   ├── sendAI.ts          # Core AI request handling (main entry point)
│   ├── processResponse.ts # Response parsing and validation
│   ├── genObject.ts       # Structured object generation
│   ├── rateLimiter.ts     # Request rate limiting
│   ├── repairAIRequest.ts # Failed request repair
│   ├── stallGuard.ts      # Stall detection and recovery
│   └── stepProcessor.ts   # Multi-step processing logic
├── create/                # Message construction
│   ├── buildMessages.ts   # Complete message arrays
│   └── buildSimpleMessage.ts # Basic message structures
├── handoffs/              # Inter-node routing logic
│   ├── main.ts           # Main handoff orchestration
│   ├── handOffUtils.ts   # Handoff utility functions
│   └── types/            # Handoff type definitions
│       ├── hierarchical.ts
│       └── sequential.ts
├── summaries/             # Message summarization
├── utils/                 # Message utilities
│   └── zodToJson.ts      # Zod schema to JSON conversion
├── MessagePayload.ts      # Structured payload types
├── WorkflowMessage.ts     # Core message class
└── index.ts              # Module exports
```

## Core Features

### Message Types

Structured message payloads for different workflow scenarios:

```typescript
type MessagePayload =
  | { type: "delegation"; data: any; instructions?: string }
  | { type: "error"; error: string; recoverable: boolean }
  | { type: "result"; data: any; metadata?: Record<string, any> }
  | { type: "control"; action: string; parameters?: any }

class WorkflowMessage {
  id: string
  workflowInvocationId: string
  nodeId: string
  content: string
  payload: MessagePayload
  timestamp: Date
  priority: "low" | "normal" | "high"
}
```

### AI Communication

Unified interface for AI model interaction with error handling:

```typescript
// AI request with comprehensive configuration
const response = await sendAI({
  messages: messageArray,
  model: "claude-3-sonnet",
  tools: availableTools,
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  temperature: 0.7,
  maxTokens: 4000,
})
```

### Dynamic Routing

AI-driven handoff decisions based on message content:

```typescript
// Intelligent routing based on message analysis
const handoffDecision = await analyzeHandoff(message, {
  availableNodes: ["processor", "validator", "finalizer"],
  routingStrategy: "sequential", // or "hierarchical"
  context: workflowContext,
})
```

### Response Processing

Structured parsing and validation of AI responses:

```typescript
// Process AI response with validation
const processedResponse = await processResponse(aiResponse, {
  validateSchema: true,
  extractToolCalls: true,
  parseJSON: true,
  handleErrors: true,
})
```

## Message Creation

### Simple Messages

```typescript
// Basic message construction
const message = await buildSimpleMessage({
  content: "Process this data",
  workflowInvocationId: "wi_123",
  nodeId: "processor",
  payload: { type: "delegation", data: inputData },
})
```

### Complete Message Arrays

```typescript
// Build complete conversation for AI models
const messages = await buildMessages({
  systemPrompt: "You are a data processor...",
  userMessage: "Process this CSV file",
  context: workflowContext,
  previousMessages: conversationHistory,
})
```

### Message Routing

```typescript
// Route message to appropriate node
const routingDecision = await routeMessage(message, {
  availableNodes: workflow.nodes,
  routingStrategy: "sequential",
  previousContext: messageHistory,
})
```

## Error Handling

### Retry Logic

```typescript
// Automatic retry with exponential backoff
const response = await sendAI(message, {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  retryableErrors: ["timeout", "rate_limit", "server_error"],
})
```

### Error Recovery

```typescript
// Graceful error handling with recovery
try {
  const response = await sendAI(message)
} catch (error) {
  if (error.recoverable) {
    // Attempt recovery
    const recoveredMessage = await repairMessage(message, error)
    return await sendAI(recoveredMessage)
  }
  throw error
}
```

### Request Repair

```typescript
// Automatic request fixing for failed calls
const repairedRequest = await repairRequest(failedRequest, {
  errorType: "validation_error",
  suggestedFixes: ["adjust_parameters", "retry_with_different_model"],
  maxRepairAttempts: 2,
})
```

## Performance Optimization

### Batch Processing

```typescript
// Process multiple messages in parallel
const responses = await Promise.all(
  messages.map((message) =>
    sendAI(message, {
      maxConcurrency: 5,
      timeout: 30000,
    })
  )
)
```

### Message Caching

```typescript
// Cache responses for similar messages
const cachedResponse = await sendAI(message, {
  enableCaching: true,
  cacheKey: generateCacheKey(message),
  cacheTTL: 3600000, // 1 hour
})
```

### Rate Limiting

```typescript
// Respect API rate limits
const rateLimitedRequest = await sendAI(message, {
  rateLimit: {
    requestsPerMinute: 60,
    tokensPerMinute: 100000,
  },
})
```

## Integration Examples

### Workflow Node Integration

```typescript
// In workflow node processing
class WorkflowNode {
  async processMessage(message: WorkflowMessage) {
    // Build AI request messages
    const aiMessages = await buildMessages({
      systemPrompt: this.systemPrompt,
      userMessage: message.content,
      context: this.getContext(),
    })

    // Send to AI with tools
    const response = await sendAI({
      messages: aiMessages,
      model: this.modelName,
      tools: this.availableTools,
    })

    // Process response and determine next steps
    const processedResponse = await processResponse(response)

    // Route to next node if needed
    if (processedResponse.handoffRequired) {
      const nextNode = await this.chooseHandoff(processedResponse)
      return await this.routeToNode(nextNode, processedResponse)
    }

    return processedResponse
  }
}
```

### Message Queue Integration

```typescript
// Queue-based message processing
class MessageProcessor {
  async processQueue(messages: WorkflowMessage[]) {
    const results = []

    for (const message of messages) {
      try {
        const result = await this.processMessage(message)
        results.push(result)
      } catch (error) {
        await this.handleError(message, error)
      }
    }

    return results
  }
}
```

## Testing

### Message Mocking

```typescript
// Mock messages for testing
const mockMessage = new WorkflowMessage({
  content: "Test message",
  workflowInvocationId: "test_workflow",
  nodeId: "test_node",
  payload: { type: "delegation", data: testData },
})
```

### AI Response Mocking

```typescript
// Mock AI responses
const mockAIResponse = {
  content: "Processed successfully",
  toolCalls: [],
  usage: { inputTokens: 100, outputTokens: 50 },
}
```

## Best Practices

1. **Type Safety**: Always use typed message payloads
2. **Error Handling**: Implement comprehensive retry and recovery logic
3. **Performance**: Use batching and caching for high-volume scenarios
4. **Monitoring**: Track message processing metrics and errors
5. **Validation**: Validate all message content before processing
6. **Context**: Maintain proper conversation context for AI interactions
7. **Resource Management**: Respect API rate limits and quotas
