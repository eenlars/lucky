# Claude Code SDK Integration

## Overview

This project supports minimal, pluggable integration with the Claude Code SDK (`@instantlyeasy/claude-code-sdk-ts`), allowing agents to opt-in to SDK-based execution while maintaining the existing custom tool system.

## Features

- **Opt-in Integration**: Existing workflows continue using custom tools by default
- **Per-Node Configuration**: Each node can independently choose its execution mode
- **Unified Cost Tracking**: SDK costs are tracked alongside custom tool costs
- **Session Management**: Optional session preservation for conversational workflows

## Configuration

### Enabling SDK for a Node

Add the `useClaudeSDK` flag and optional `sdkConfig` to any node:

```typescript
{
  nodeId: "analyzer",
  description: "Analyze with Claude SDK",
  systemPrompt: "You are a helpful assistant",
  modelName: "claude-3-sonnet-latest",
  useClaudeSDK: true,  // Enable SDK for this node
  sdkConfig: {
    model: "sonnet",
    allowedTools: ["Read", "Grep", "Glob"],
    skipPermissions: false,
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
  model?: "opus" | "sonnet" | "haiku"
  allowedTools?: string[]      // SDK tools to allow
  skipPermissions?: boolean    // Skip permission prompts
  timeout?: number            // Execution timeout in ms
}
```

### Global SDK Settings

Configure defaults in `runtime/settings/claude-sdk.ts`:

```typescript
export const CLAUDE_SDK_CONFIG = {
  enabled: false,  // Global enable/disable
  defaultModel: "sonnet",
  defaultTimeout: 60000,
  skipPermissions: true,
  defaultAllowedTools: ["Read", "Write", "Edit", "Grep", "Glob"]
}
```

## Usage Examples

### Mixed Workflow (SDK + Custom)

```typescript
export const mixedWorkflow: WorkflowConfig = {
  nodes: [
    {
      nodeId: "sdk-node",
      useClaudeSDK: true,  // Uses SDK
      sdkConfig: {
        model: "sonnet",
        allowedTools: ["Read", "Write"]
      },
      // ... other config
    },
    {
      nodeId: "custom-node",
      useClaudeSDK: false, // Uses custom pipeline (default)
      codeTools: ["csvReader", "contextSet"],
      // ... other config
    }
  ],
  entryNodeId: "sdk-node"
}
```

### SDK-Only Workflow

```yaml
name: SDK Workflow
nodes:
  - nodeId: analyzer
    useClaudeSDK: true
    sdkConfig:
      model: opus
      allowedTools:
        - Read
        - Write
        - Grep
      skipPermissions: true
    modelName: claude-3-opus-latest
    handOffs: []
entryNodeId: analyzer
```

## Cost Tracking

SDK costs are tracked separately for reporting:

```typescript
const spendingTracker = SpendingTracker.getInstance()
const status = spendingTracker.getStatus()
console.log({
  totalSpend: status.currentSpend,
  sdkSpend: status.sdkSpend,
  customSpend: status.customSpend
})
```

## Testing

Run SDK integration tests:

```bash
# Unit tests
bun test core/src/tools/claude-sdk/__tests__/

# Integration test workflow
bun run core/src/main.ts --workflow tests/workflows/sdk-test.yaml
```

## Architecture

### Components

1. **ClaudeSDKService** (`core/src/tools/claude-sdk/ClaudeSDKService.ts`)
   - Minimal service wrapper
   - Stateless execution
   - Response formatting to match existing types

3. **InvocationPipeline** (`core/src/messages/pipeline/InvocationPipeline.ts`)
   - Branching logic for SDK vs custom execution
   - Unified response handling

4. **SpendingTracker** (`core/src/utils/spending/SpendingTracker.ts`)
   - Separate SDK cost tracking
   - Unified spending limits

### Execution Flow

```
Node Execution
    ├── Check useClaudeSDK flag
    ├── If true: Use ClaudeSDKService
    │   ├── Execute with SDK
    │   ├── Map response to ProcessedResponse
    │   └── Track SDK costs
    └── If false: Use existing pipeline
        ├── Multi-step loops (V2/V3)
        ├── Custom tools
        └── Standard cost tracking
```

## Limitations

- SDK sessions are not preserved across workflow invocations by default
- Some custom tools have no SDK equivalent
- SDK tool names differ from custom tool names

## Migration Guide

### Converting Existing Nodes

To convert a node to use SDK:

1. Add `useClaudeSDK: true`
2. Map tools to SDK equivalents:
   - `readFileLegacy` → `Read`
   - `saveFileLegacy` → `Write`
3. Configure SDK-specific options
4. Test thoroughly

### Gradual Migration

1. Start with non-critical nodes
2. Compare performance and costs
3. Expand usage based on results
4. Keep fallback to custom tools

## Troubleshooting

### Common Issues

1. **SDK not installed**: Run `bun add @instantlyeasy/claude-code-sdk-ts`
2. **Tool not available**: Check SDK tool names vs custom names
3. **Session errors**: Ensure session preservation is configured
4. **Cost tracking**: Verify SpendingTracker initialization

### Debug Mode

Debug logging is handled through the standard Logger system. Set the debug flag in your runtime configuration if needed.

## Best Practices

1. **Start Small**: Test SDK on single nodes first
2. **Monitor Costs**: Compare SDK vs custom costs
3. **Tool Selection**: Use SDK for standard operations, custom for specialized
4. **Error Handling**: Always handle SDK errors gracefully
5. **Performance**: Measure latency impact before full adoption

## Future Enhancements

- [ ] Automatic tool mapping between custom and SDK
- [ ] Session persistence across workflow runs
- [ ] SDK tool result caching
- [ ] Advanced SDK configuration per workflow
- [ ] SDK performance metrics dashboard