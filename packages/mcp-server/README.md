<div align="center">
  <a name="readme-top"></a>
  <h1>@eenlars/alive-mcp</h1>
  <p>MCP Server for Workflow Management & Execution</p>
</div>

# Workflow MCP Server

A Model Context Protocol (MCP) server for executing workflows programmatically. Invoke workflows with status tracking, async/sync execution modes, and graceful cancellation.

## Features

- **Workflow Management** - List, execute, and manage workflow invocations
- **Async/Sync Execution** - Choose between immediate results or long-running async jobs
- **Status Tracking** - Poll execution status and retrieve results
- **Graceful Cancellation** - Cancel running workflows with proper cleanup
- **Error Handling** - Comprehensive error codes and detailed error messages
- **Flexible Transport** - Support for stdio, SSE, and HTTP streaming modes
- **Configuration** - Environment variables for custom API endpoints

## Installation

### With npx

```bash
npx @eenlars/alive-mcp
```

### Global Installation

```bash
npm install -g @eenlars/alive-mcp
lucky-mcp
```

### As a Dependency

```bash
npm install @eenlars/alive-mcp
```

## Configuration

### Environment Variables

#### Required

- `LUCKY_API_KEY` - Your Lucky API key for authentication

#### Optional

- `LUCKY_API_URL` - Custom API endpoint (default: `http://localhost:3000`)
- `PORT` - Server port for HTTP modes (default: `3000`)
- `HOST` - Server host (default: `localhost`)

### Running Modes

#### Stdio Mode (Default)

```bash
export LUCKY_API_KEY=your-api-key
npx @eenlars/alive-mcp
```

#### HTTP Streaming

```bash
export LUCKY_API_KEY=your-api-key
export HTTP_STREAMABLE_SERVER=true
npx @eenlars/alive-mcp
# Server runs on http://localhost:3000/mcp
```

#### SSE Local

```bash
export LUCKY_API_KEY=your-api-key
export SSE_LOCAL=true
npx @eenlars/alive-mcp
```

## Usage

### Available Tools

#### 1. List Workflows

```json
{
  "name": "lucky_list_workflows",
  "arguments": {}
}
```

Returns all workflows available to the authenticated user with metadata:
- `workflow_id` - Unique identifier
- `name` - Human-readable name
- `description` - What the workflow does
- `inputSchema` - JSONSchema7 for expected input
- `outputSchema` - JSONSchema7 for output structure
- `created_at` - Creation timestamp

#### 2. Run Workflow

```json
{
  "name": "invoke_lucky_agentic_workflow",
  "arguments": {
    "workflow_id": "wf_research_paper",
    "input": { "topic": "AI Safety" },
    "options": {
      "timeoutMs": 30000,
      "trace": false
    }
  }
}
```

Execute a workflow with the given input.

**Execution Modes:**
- **Sync** (timeoutMs ≤ 30s) - Returns output immediately
- **Async** (timeoutMs > 30s) - Returns `invocation_id` for polling

**Parameters:**
- `workflow_id` (required) - From `lucky_list_workflows`
- `input` (required) - Must match workflow's `inputSchema`
- `options` (optional)
  - `timeoutMs` - Max execution time in milliseconds (default: 30000, max: 600000)
  - `trace` - Enable detailed execution tracing (default: false)

**Response (Sync):**
```json
{
  "output": {
    "paper": "Comprehensive analysis of AI Safety...",
    "citations": [...]
  }
}
```

**Response (Async):**
```json
{
  "invocation_id": "inv_abc123",
  "state": "running"
}
```

#### 3. Check Execution Status

```json
{
  "name": "lucky_check_status",
  "arguments": {
    "invocation_id": "inv_abc123"
  }
}
```

Check the status of a running or completed workflow.

**States:**
- `running` - Execution in progress
- `completed` - Finished successfully
- `failed` - Encountered an error
- `cancelled` - User cancelled the execution
- `cancelling` - Cancellation in progress
- `not_found` - Invalid invocation ID

**Response:**
```json
{
  "state": "completed",
  "invocationId": "inv_abc123",
  "createdAt": "2025-01-15T10:30:00Z",
  "output": {
    "paper": "Comprehensive analysis...",
    "citations": [...]
  }
}
```

#### 4. Cancel Workflow

```json
{
  "name": "lucky_cancel_workflow",
  "arguments": {
    "invocation_id": "inv_abc123"
  }
}
```

Request cancellation of a running workflow. Cancellation is graceful and may take time to complete.

## Error Codes

| Code | Meaning |
|------|---------|
| -32001 | Workflow not found or access denied |
| -32002 | Input validation failed |
| -32003 | Workflow execution failed |
| -32004 | Execution timeout |
| 401 | Invalid or missing API key |
| 404 | Workflow or invocation not found |

## Integration Examples

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "workflows": {
      "command": "npx",
      "args": ["@eenlars/alive-mcp"],
      "env": {
        "LUCKY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

1. Open Cursor Settings
2. Go to Features > MCP Servers
3. Add new MCP server:

```json
{
  "mcpServers": {
    "workflows": {
      "command": "npx",
      "args": ["-y", "@eenlars/alive-mcp"],
      "env": {
        "LUCKY_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

### VS Code

Add to User Settings (JSON):

```json
{
  "mcp": {
    "servers": {
      "workflows": {
        "command": "npx",
        "args": ["-y", "@eenlars/alive-mcp"],
        "env": {
          "LUCKY_API_KEY": "${input:apiKey}"
        }
      }
    }
  }
}
```

## Workflow Execution Flow

```
1. Call lucky_list_workflows to discover available workflows
   ↓
2. Review the workflow's inputSchema to understand required input
   ↓
3. Call invoke_lucky_agentic_workflow with workflow_id and properly formatted input
   ↓
4. If async mode (timeoutMs > 30s):
   - Receive invocation_id
   - Poll with lucky_check_status to monitor progress
   - Retrieve results when state = "completed"
   ↓
5. Optionally call lucky_cancel_workflow to stop execution
```

## Development

### Build

```bash
bun run build
# or
npm run build
```

### Test

```bash
bun run test
# or
npm test
```

### Start Server

```bash
npm start                              # Stdio mode
CLOUD_SERVICE=true npm start          # Cloud mode
HTTP_STREAMABLE_SERVER=true npm start # HTTP mode
```

## Publishing

```bash
npm run publish              # Publish latest version
npm run publish-beta         # Publish beta tag
```

## License

MIT License - see LICENSE file for details

---

**Need help?** Check the error code table above or consult the integration examples for your editor.
