# Official Anthropic SDK Integration

## Overview

This project supports pluggable integration with the official Anthropic SDK (`@anthropic-ai/sdk`), allowing agents to opt-in to SDK-based execution while maintaining the existing custom tool system.

## Features

- **Opt-in Integration**: Existing workflows continue using custom tools by default
- **Per-Node Configuration**: Each node can independently choose its execution mode
- **Unified Cost Tracking**: SDK costs are tracked alongside custom tool costs
- **Official SDK Support**: Uses the official Anthropic TypeScript SDK for reliability
- **Tool/Function Calling**: Full support for tool use and function calling through the SDK
- **Request ID Tracking**: Captures request IDs for debugging and support
- **Advanced Error Handling**: Leverages SDK's built-in error types with automatic retries

## Prerequisites

The Anthropic SDK requires the `ANTHROPIC_API_KEY` environment variable to be set:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

## Configuration

### Enabling SDK for a Node

Add the `useClaudeSDK` flag and optional `sdkConfig` to any node:

```typescript
{
  nodeId: "analyzer",
  description: "Analyze with Anthropic SDK",
  systemPrompt: "You are a helpful assistant",
  modelName: "claude-3-sonnet-latest",
  useClaudeSDK: true,  // Enable SDK for this node
  sdkConfig: {
    model: "sonnet",      // or "opus", "haiku", "sonnet-3.5", etc.
    maxTokens: 4096,
    temperature: 0.7,
    timeout: 60000
  },
  mcpTools: [],
  codeTools: [],
  handOffs: ["next-node"]
}
```

### SDK Configuration Options

```typescript
interface ClaudeSDKConfig {
  // Model selection - simplified names that map to official model IDs
  model?: "opus" | "sonnet" | "haiku" | "opus-3" | "sonnet-3" | "sonnet-3.5" | "haiku-3"

  // Maximum tokens to generate (default: 4096)
  maxTokens?: number

  // Temperature for response generation (0-1, default: 0.7)
  temperature?: number

  // Top-p sampling parameter (optional)
  topP?: number

  // Execution timeout in milliseconds (default: 60000)
  timeout?: number

  // System prompt to prepend to user message (optional)
  systemPrompt?: string

  // Enable tool/function calling support (optional)
  enableTools?: boolean

  // Maximum number of retries for failed requests (default: 2)
  maxRetries?: number
}
```

### Model Mappings

The integration provides simplified model names that map to official Anthropic model IDs:

| Simplified Name | Official Model ID            |
| --------------- | ---------------------------- |
| `opus`          | `claude-3-opus-latest`       |
| `sonnet`        | `claude-3-5-sonnet-latest`   |
| `haiku`         | `claude-3-haiku-latest`      |
| `opus-3`        | `claude-3-opus-20240229`     |
| `sonnet-3`      | `claude-3-sonnet-20240229`   |
| `sonnet-3.5`    | `claude-3-5-sonnet-20241022` |
| `haiku-3`       | `claude-3-haiku-20240307`    |

### Global SDK Settings

Configure defaults in `examples/settings/claude-sdk.ts`:

```typescript
export const CLAUDE_SDK_CONFIG = {
  enabled: false, // Global enable/disable
  defaultModel: "sonnet", // Default model choice
  defaultMaxTokens: 4096, // Default max tokens
  defaultTimeout: 60000, // Default timeout (ms)
  defaultTemperature: 0.7, // Default temperature
  debug: false, // Debug logging
}
```

## Usage Examples

### Mixed Workflow (SDK + Custom)

```typescript
export const mixedWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "sdk-node",
      description: "Uses official Anthropic SDK",
      systemPrompt: "You are an expert analyst",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: true, // Uses SDK
      sdkConfig: {
        model: "sonnet-3.5",
        maxTokens: 4096,
        temperature: 0.5,
      },
      mcpTools: [],
      codeTools: [],
      handOffs: ["custom-node"],
    },
    {
      nodeId: "custom-node",
      description: "Uses custom pipeline with tools",
      systemPrompt: "You are a data processor",
      modelName: "claude-3-sonnet-latest",
      useClaudeSDK: false, // Uses custom pipeline (default)
      mcpTools: ["filesystem"],
      codeTools: ["csvReader", "contextSet"],
      handOffs: [],
    },
  ],
  entryNodeId: "sdk-node",
}
```

### SDK-Only Workflow

```yaml
name: SDK Analysis Workflow
nodes:
  - nodeId: analyzer
    description: Deep analysis using SDK
    systemPrompt: Analyze the provided data
    modelName: claude-3-opus-latest
    useClaudeSDK: true
    sdkConfig:
      model: opus
      maxTokens: 8192
      temperature: 0.3
    mcpTools: []
    codeTools: []
    handOffs:
      - summarizer

  - nodeId: summarizer
    description: Summarize findings
    systemPrompt: Create a concise summary
    modelName: claude-3-haiku-latest
    useClaudeSDK: true
    sdkConfig:
      model: haiku
      maxTokens: 1024
      temperature: 0.5
    mcpTools: []
    codeTools: []
    handOffs: []

entryNodeId: analyzer
```

### JSON Configuration Example

```json
{
  "nodes": [
    {
      "nodeId": "sdk-processor",
      "description": "Process with SDK",
      "systemPrompt": "You are a helpful assistant",
      "modelName": "claude-3-sonnet-latest",
      "useClaudeSDK": true,
      "sdkConfig": {
        "model": "sonnet",
        "maxTokens": 4096,
        "temperature": 0.7
      },
      "mcpTools": [],
      "codeTools": [],
      "handOffs": []
    }
  ],
  "entryNodeId": "sdk-processor"
}
```

## Key Differences from Custom Pipeline

### What SDK Nodes CAN Do:

- Direct message generation using official Anthropic API
- Tool use/function calling (when `enableTools` is set)
- Automatic retry with exponential backoff
- Native cost tracking through usage API
- Temperature and sampling parameter control
- Timeout protection
- Request ID tracking for debugging

### What SDK Nodes CANNOT Do:

- Use MCP tools (filesystem, memory, etc.) - these require custom pipeline
- Use code tools (csvReader, webSearch, etc.) - these require custom pipeline
- Multi-step tool execution loops with custom logic
- Custom tool implementations beyond SDK-supported tools

**Note**: SDK nodes support official Anthropic tool/function calling, but custom tools and MCP integration require the custom pipeline.

## Cost Tracking

The SDK integration automatically tracks costs based on token usage:

- **Opus**: $15/M input tokens, $75/M output tokens
- **Sonnet 3.5**: $3/M input tokens, $15/M output tokens
- **Sonnet 3**: $3/M input tokens, $15/M output tokens
- **Haiku**: $0.25/M input tokens, $1.25/M output tokens

Costs are calculated automatically and included in workflow spending tracking.

## Error Handling

The SDK service includes robust error handling with specific error types:

### Error Types (from SDK):

- **BadRequestError** (400): Invalid request parameters
- **AuthenticationError** (401): Invalid or missing API key
- **PermissionDeniedError** (403): Insufficient permissions
- **NotFoundError** (404): Resource not found
- **UnprocessableEntityError** (422): Request cannot be processed
- **RateLimitError** (429): Rate limit exceeded (auto-retry)
- **InternalServerError** (500+): Server error (auto-retry)
- **APIConnectionError**: Network/connection issues (auto-retry)
- **APIConnectionTimeoutError**: Request timeout (auto-retry)

### Features:

- **Automatic Retry**: Rate limits, server errors, and network issues
- **Request ID Tracking**: All errors include request ID for debugging
- **Configurable Timeouts**: Per-request or global timeout settings
- **Built-in Exponential Backoff**: Managed by the SDK

## Testing

Run SDK integration tests:

```bash
# Unit tests
bun test core/src/tools/claude-sdk/__tests__/

# Integration test workflow (if available)
bun run core/src/main.ts --workflow tests/workflows/sdk-test.yaml
```

## Architecture

### Components

1. **ClaudeSDKService** (`core/src/tools/claude-sdk/ClaudeSDKService.ts`)
   - Service wrapper for official Anthropic SDK
   - Stateless execution with retry logic
   - Response formatting to match existing types

2. **InvocationPipeline** (`core/src/messages/pipeline/InvocationPipeline.ts`)
   - Branching logic for SDK vs custom execution
   - Unified response handling

3. **SpendingTracker** (`core/src/utils/spending/SpendingTracker.ts`)
   - Separate SDK cost tracking
   - Unified spending limits

### Execution Flow

```
Node Execution
    ├── Check useClaudeSDK flag
    ├── If true: Use ClaudeSDKService
    │   ├── Initialize Anthropic client
    │   ├── Create message via SDK
    │   ├── Map response to ProcessedResponse
    │   └── Track SDK costs
    └── If false: Use existing pipeline
        ├── Multi-step loops (V2/V3)
        ├── Custom tools
        └── Standard cost tracking
```

## Debugging

Enable debug logging for SDK operations:

```typescript
// In examples/settings/claude-sdk.ts
export const CLAUDE_SDK_CONFIG = {
  debug: true, // Enables detailed SDK logging
}
```

Check logs for:

- Model selection and configuration
- Token usage and costs
- Retry attempts and failures
- API response times

## Migration from Unofficial SDK

This integration replaces the previous `@instantlyeasy/claude-code-sdk-ts` with the official `@anthropic-ai/sdk`. Key changes:

1. **API Key Required**: Must set `ANTHROPIC_API_KEY` environment variable
2. **Tool Support Available**: SDK now supports official Anthropic tool/function calling (set `enableTools: true`)
3. **Model Names**: Use simplified names that map to official model IDs
4. **Better Error Handling**: Specific error types with automatic retry logic
5. **Request ID Tracking**: All responses include request IDs for debugging
6. **Built-in Retry Logic**: SDK handles retries automatically (configurable via `maxRetries`)

## Troubleshooting

### Common Issues

1. **API Key Missing**: Ensure `ANTHROPIC_API_KEY` is set in environment
2. **Invalid Model**: Check model name mappings in documentation
3. **Timeout Errors**: Increase `timeout` in `sdkConfig`
4. **Cost Tracking**: Verify SpendingTracker initialization

## Best Practices

1. **Start Small**: Test SDK on single nodes first
2. **Monitor Costs**: Compare SDK vs custom costs
3. **Model Selection**: Choose appropriate model for task complexity
4. **Error Handling**: Always handle SDK errors gracefully
5. **Performance**: Measure latency impact before full adoption

## Ejecting the SDK

To remove SDK integration completely:

1. Delete the `core/src/tools/claude-sdk/` directory
2. Remove SDK imports from `InvocationPipeline.ts`
3. Remove `useClaudeSDK` and `sdkConfig` from workflow types
4. Remove `@anthropic-ai/sdk` from package.json
5. Remove `examples/settings/claude-sdk.ts`

The integration is designed to be cleanly removable without affecting the rest of the codebase.

## Future Enhancements

- [ ] Streaming response support
- [ ] Message batching for bulk operations
- [ ] Advanced prompt caching
- [ ] SDK performance metrics dashboard
- [ ] Tool use support when SDK adds it
