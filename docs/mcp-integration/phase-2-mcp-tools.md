# Phase 2: MCP Tools Implementation

**Estimated Time:** 2-3 hours

**Goal:** Implement MCP server tools that enable Claude Desktop to discover, execute, and monitor workflows.

**Prerequisites:** Phase 1 (API Endpoints) must be complete

---

## Overview

This phase implements four MCP tools in `packages/mcp-server/src/index.ts`:

1. **lucky_list_workflows** - Discover available workflows
2. **lucky_run_workflow** - Execute a workflow
3. **lucky_check_status** - Poll execution status
4. **lucky_cancel_workflow** - Cancel running workflow (optional)

---

## Task 2.1: Implement lucky_list_workflows

### Requirements

**File:** `packages/mcp-server/src/index.ts` (add after existing tools, around line 555)

**Purpose:** Allow Claude to discover user's available workflows with schemas

**Priority:** HIGH

**Estimated Time:** 30 minutes

### Implementation

```typescript
server.addTool({
  name: "lucky_list_workflows",
  description: `
List all workflows available to the authenticated user.

**Returns:** Array of workflows with metadata:
- workflow_id: Unique workflow identifier (use this with lucky_run_workflow)
- name: Human-readable workflow name
- description: Workflow purpose and behavior
- inputSchema: JSONSchema7 defining expected input structure
- outputSchema: JSONSchema7 defining expected output structure
- created_at: ISO timestamp of workflow creation

**Example Response:**
\`\`\`json
[
  {
    "workflow_id": "wf_research_paper",
    "name": "Research Paper Generator",
    "description": "Generates academic research papers on specified topics",
    "inputSchema": {
      "type": "object",
      "properties": {
        "topic": { "type": "string", "minLength": 1 }
      },
      "required": ["topic"]
    },
    "outputSchema": {
      "type": "object",
      "properties": {
        "paper": { "type": "string" },
        "citations": { "type": "array" }
      }
    },
    "created_at": "2025-01-15T10:30:00Z"
  }
]
\`\`\`

**Note:** Requires luckyApiKey to be configured in MCP settings.
  `,
  parameters: z.object({}),
  execute: async (args, { session }) => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error(
        "API key required. Configure luckyApiKey in MCP settings with your Lucky API key."
      )
    }

    const apiUrl = process.env.LUCKY_API_URL || "http://localhost:3000"
    
    try {
      const response = await fetch(`${apiUrl}/api/user/workflows`, {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your MCP configuration.")
        }
        throw new Error(`Failed to list workflows: ${response.statusText}`)
      }

      const workflows = await response.json()
      return asText(workflows)
      
    } catch (error) {
      throw new Error(`Error listing workflows: ${error.message}`)
    }
  }
})
```

### Testing

**Manual Test with Claude Desktop:**

1. Configure MCP settings:
```json
{
  "mcpServers": {
    "lucky": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "LUCKY_API_URL": "http://localhost:3000"
      },
      "session": {
        "luckyApiKey": "sk_test_..."
      }
    }
  }
}
```

2. Ask Claude: "List my Lucky workflows"

3. Verify response contains workflow metadata

### Acceptance Criteria

- [ ] Returns array of workflows with all metadata fields
- [ ] Requires API key (throws clear error if missing)
- [ ] Returns 401 error if API key invalid
- [ ] Formats response as text for Claude
- [ ] Includes helpful error messages
- [ ] Works in Claude Desktop

---

## Task 2.2: Implement lucky_run_workflow

### Requirements

**File:** `packages/mcp-server/src/index.ts`

**Purpose:** Execute a workflow with provided input data

**Priority:** HIGH

**Estimated Time:** 1 hour

### Implementation

```typescript
server.addTool({
  name: "lucky_run_workflow",
  description: `
Execute a workflow with provided input data.

**Usage:**
1. Call lucky_list_workflows to discover available workflows
2. Check the workflow's inputSchema to understand required input format
3. Call lucky_run_workflow with workflow_id and properly formatted input

**Execution Modes:**
- **Sync mode** (timeoutMs ≤ 30s): Returns workflow output immediately
- **Async mode** (timeoutMs > 30s): Returns invocation_id for polling with lucky_check_status

**Example:**
\`\`\`json
{
  "workflow_id": "wf_research_paper",
  "input": { "topic": "AI Safety" },
  "options": { "timeoutMs": 30000, "trace": false }
}
\`\`\`

**Error Codes:**
- -32001: Workflow not found
- -32002: Input validation failed (check inputSchema)
- -32003: Workflow execution failed
- -32004: Execution timeout

**Parameters:**
- workflow_id: Workflow identifier from lucky_list_workflows
- input: Input data matching the workflow's inputSchema
- options: (optional) Execution options
  - timeoutMs: Max execution time in milliseconds (default: 30000, max: 600000)
  - trace: Enable detailed execution tracing (default: false)
  `,
  parameters: z.object({
    workflow_id: z.string().describe("Workflow identifier from lucky_list_workflows"),
    input: z.unknown().describe("Input data matching the workflow's inputSchema"),
    options: z.object({
      timeoutMs: z.number().max(600000).optional().describe("Max execution time in milliseconds"),
      trace: z.boolean().optional().describe("Enable detailed execution tracing")
    }).optional()
  }),
  execute: async (args, { session }) => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error(
        "API key required. Configure luckyApiKey in MCP settings with your Lucky API key."
      )
    }

    const apiUrl = process.env.LUCKY_API_URL || "http://localhost:3000"
    
    // Construct JSON-RPC request
    const rpcRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "workflow.invoke",
      params: {
        workflow_id: args.workflow_id,
        input: args.input,
        options: args.options || {},
        auth: { bearer: apiKey }
      }
    }

    try {
      const response = await fetch(`${apiUrl}/api/v1/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(rpcRequest)
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your MCP configuration.")
        }
        throw new Error(`Failed to invoke workflow: ${response.statusText}`)
      }

      const rpcResponse = await response.json()
      
      // Check for JSON-RPC error
      if (rpcResponse.error) {
        const errorMessages = {
          [-32001]: "Workflow not found or you don't have access to it",
          [-32002]: "Input validation failed - check the workflow's inputSchema",
          [-32003]: "Workflow execution failed",
          [-32004]: "Workflow execution timed out"
        }
        
        const message = errorMessages[rpcResponse.error.code] || rpcResponse.error.message
        throw new Error(`Workflow error: ${message}`)
      }
      
      return asText(rpcResponse.result)
      
    } catch (error) {
      throw new Error(`Error invoking workflow: ${error.message}`)
    }
  }
})
```

### Testing

**Manual Test with Claude Desktop:**

1. Ask Claude: "Run the research paper workflow with topic 'AI Safety'"

2. Verify Claude calls `lucky_run_workflow` with correct parameters

3. Verify response contains workflow output

**Test Cases:**
- Valid input (sync mode)
- Valid input (async mode with timeoutMs > 30s)
- Invalid workflow_id (expect error)
- Invalid input (expect validation error)
- Missing API key (expect error)

### Acceptance Criteria

- [ ] Validates workflow_id parameter
- [ ] Constructs correct JSON-RPC request format
- [ ] Handles both sync and async responses
- [ ] Returns clear error messages for all error codes
- [ ] Requires API key (throws error if missing)
- [ ] Works in Claude Desktop

---

## Task 2.3: Implement lucky_check_status

### Requirements

**File:** `packages/mcp-server/src/index.ts`

**Purpose:** Poll the status of a workflow execution

**Priority:** HIGH

**Estimated Time:** 30 minutes

### Implementation

```typescript
server.addTool({
  name: "lucky_check_status",
  description: `
Check the status of a workflow execution.

**States:**
- **running**: Workflow is currently executing
- **completed**: Workflow finished successfully (output available)
- **failed**: Workflow encountered an error
- **cancelled**: Workflow was cancelled by user
- **cancelling**: Cancellation in progress
- **not_found**: Invalid invocation_id

**Usage:** Poll this tool after calling lucky_run_workflow in async mode (timeoutMs > 30s).

**Example Response:**
\`\`\`json
{
  "state": "completed",
  "invocationId": "inv_abc123",
  "createdAt": "2025-01-15T10:30:00Z",
  "output": {
    "paper": "Comprehensive analysis of AI Safety...",
    "citations": [...]
  }
}
\`\`\`

**Parameters:**
- invocation_id: Invocation identifier from lucky_run_workflow
  `,
  parameters: z.object({
    invocation_id: z.string().describe("Invocation identifier from lucky_run_workflow")
  }),
  execute: async (args, { session }) => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error(
        "API key required. Configure luckyApiKey in MCP settings with your Lucky API key."
      )
    }

    const apiUrl = process.env.LUCKY_API_URL || "http://localhost:3000"
    
    try {
      const response = await fetch(
        `${apiUrl}/api/workflow/status/${args.invocation_id}`,
        {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your MCP configuration.")
        }
        if (response.status === 404) {
          throw new Error(`Workflow execution not found: ${args.invocation_id}`)
        }
        throw new Error(`Failed to check status: ${response.statusText}`)
      }

      const status = await response.json()
      return asText(status)
      
    } catch (error) {
      throw new Error(`Error checking workflow status: ${error.message}`)
    }
  }
})
```

### Testing

**Manual Test with Claude Desktop:**

1. Start async workflow: "Run the long-running workflow with timeoutMs 60000"

2. Get invocation_id from response

3. Ask Claude: "Check status of invocation inv_..."

4. Verify status is returned

**Test Cases:**
- Valid invocation_id (running)
- Valid invocation_id (completed)
- Invalid invocation_id (expect 404)
- Missing API key (expect error)

### Acceptance Criteria

- [ ] Validates invocation_id parameter
- [ ] Returns all status fields
- [ ] Handles all state values correctly
- [ ] Returns clear error for not found
- [ ] Requires API key (throws error if missing)
- [ ] Works in Claude Desktop

---

## Task 2.4: Implement lucky_cancel_workflow (Optional)

### Requirements

**File:** `packages/mcp-server/src/index.ts`

**Purpose:** Cancel a running workflow execution

**Priority:** MEDIUM (optional)

**Estimated Time:** 20 minutes

### Implementation

```typescript
server.addTool({
  name: "lucky_cancel_workflow",
  description: `
Cancel a running workflow execution.

**Usage:** Provide the invocation_id from lucky_run_workflow or lucky_check_status.

**Note:** Cancellation is graceful and may take time to complete. Check status with lucky_check_status to confirm cancellation.

**Example:**
\`\`\`json
{
  "invocation_id": "inv_abc123"
}
\`\`\`

**Parameters:**
- invocation_id: Invocation identifier to cancel
  `,
  parameters: z.object({
    invocation_id: z.string().describe("Invocation identifier to cancel")
  }),
  execute: async (args, { session }) => {
    const apiKey = session?.luckyApiKey
    if (!apiKey) {
      throw new Error(
        "API key required. Configure luckyApiKey in MCP settings with your Lucky API key."
      )
    }

    const apiUrl = process.env.LUCKY_API_URL || "http://localhost:3000"
    
    try {
      const response = await fetch(
        `${apiUrl}/api/workflow/cancel/${args.invocation_id}`,
        {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your MCP configuration.")
        }
        if (response.status === 404) {
          throw new Error(`Workflow execution not found: ${args.invocation_id}`)
        }
        throw new Error(`Failed to cancel workflow: ${response.statusText}`)
      }

      const result = await response.json()
      return asText(result)
      
    } catch (error) {
      throw new Error(`Error cancelling workflow: ${error.message}`)
    }
  }
})
```

### Testing

**Manual Test with Claude Desktop:**

1. Start long-running workflow

2. Ask Claude: "Cancel invocation inv_..."

3. Verify cancellation confirmation

4. Check status to confirm cancelling/cancelled state

### Acceptance Criteria

- [ ] Validates invocation_id parameter
- [ ] Returns cancellation confirmation
- [ ] Handles not_found state
- [ ] Requires API key (throws error if missing)
- [ ] Works in Claude Desktop

---

## Phase 2 Checklist

### Setup
- [ ] Ensure Phase 1 API endpoints are complete and working
- [ ] Verify `packages/mcp-server/src/index.ts` exists
- [ ] Install dependencies: `cd packages/mcp-server && bun install`

### Implementation
- [ ] **Task 2.1:** Implement `lucky_list_workflows`
  - [ ] Add tool definition
  - [ ] Implement execute function
  - [ ] Add error handling
  - [ ] Add helpful descriptions
  
- [ ] **Task 2.2:** Implement `lucky_run_workflow`
  - [ ] Add tool definition with parameters
  - [ ] Construct JSON-RPC request
  - [ ] Handle sync/async responses
  - [ ] Add error code mapping
  
- [ ] **Task 2.3:** Implement `lucky_check_status`
  - [ ] Add tool definition
  - [ ] Implement status polling
  - [ ] Handle all state values
  
- [ ] **Task 2.4:** Implement `lucky_cancel_workflow` (optional)
  - [ ] Add tool definition
  - [ ] Implement cancellation logic
  - [ ] Handle not found case

### Building
- [ ] Build MCP server: `cd packages/mcp-server && bun run build`
- [ ] Verify no TypeScript errors
- [ ] Verify no build errors

### Testing
- [ ] Configure Claude Desktop MCP settings
- [ ] Test `lucky_list_workflows`
  - [ ] Returns workflows
  - [ ] Shows schemas
  - [ ] Handles invalid API key
  
- [ ] Test `lucky_run_workflow`
  - [ ] Sync execution works
  - [ ] Async execution works
  - [ ] Validation errors are clear
  - [ ] Workflow not found error works
  
- [ ] Test `lucky_check_status`
  - [ ] Returns running state
  - [ ] Returns completed state
  - [ ] Handles not found
  
- [ ] Test `lucky_cancel_workflow` (if implemented)
  - [ ] Cancels workflow
  - [ ] Handles not found

### Verification
- [ ] All tools show in Claude Desktop tool list
- [ ] Tool descriptions are clear and helpful
- [ ] Error messages are user-friendly
- [ ] API key authentication works

### Documentation
- [ ] Update MCP server README with new tools
- [ ] Document required environment variables
- [ ] Add example MCP configuration

---

## Next Steps

Once Phase 2 is complete, proceed to:
- **[Phase 3: Testing](./phase-3-testing.md)** - Comprehensive testing strategy

