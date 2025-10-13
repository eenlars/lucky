# Data Flow Documentation

## Complete Request Flow

This document traces the complete lifecycle of an MCP workflow invocation request from Claude Desktop through all system layers to execution and response.

---

## Flow Diagram

```
1. Claude Desktop
   ↓ (MCP JSON-RPC Protocol)

2. Lucky MCP Server
   (packages/mcp-server/src/index.ts)
   - Tool: lucky_run_workflow
   - Extract: session.luckyApiKey
   ↓ (HTTP POST with Bearer token)

3. /api/v1/invoke
   (apps/web/src/app/api/v1/invoke/route.ts)
   - Parse JSON-RPC request
   - authenticateRequest(req)
   ↓

4. Principal Resolution
   (apps/web/src/lib/auth/principal.ts)
   - Bearer token → SHA256 hash
   - Lookup in lockbox.secret_keys
   - Return: { clerk_id, scopes, auth_method }
   ↓

5. Workflow Loading
   (apps/web/src/lib/mcp-invoke/workflow-loader.ts)
   - loadWorkflowConfig(workflow_id)
   - Resolve wf_* → wf_ver_* (if needed)
   - Query Workflow + WorkflowVersion tables (RLS filtered)
   - Return: { config, inputSchema }
   ↓

6. Input Validation
   - validateAgainstSchema(input, inputSchema)
   - Throw error if validation fails
   ↓

7. Execution Context
   - withExecutionContext(principal, config)
   - Setup: model keys, tool registry, tracing
   ↓

8. Workflow Execution
   (packages/core/src/workflow/runner/invokeWorkflow.ts)
   - invokeWorkflow(input, config, options)
   ↓

9. Workflow Runner
   (packages/core/src/workflow/Workflow.ts)
   - Workflow.run()
   - runAllIO() - Execute all input variations
   ↓

10. Result Processing
    - InvokeWorkflowResult[] with:
      - fitness (evaluation score)
      - feedback (evaluation details)
      - finalWorkflowOutputs (actual outputs)
    ↓

11. JSON-RPC Response
    - Success: { jsonrpc: "2.0", id, result }
    - Error: { jsonrpc: "2.0", id, error }
    ↓

12. MCP Response
    - Format as text for Claude
    - Return via MCP protocol
```

---

## Detailed Step-by-Step Flow

### Step 1: Claude Desktop → MCP Server

**Protocol:** MCP JSON-RPC

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "lucky_run_workflow",
    "arguments": {
      "workflow_id": "wf_research_paper",
      "input": { "topic": "AI Safety" },
      "options": { "timeoutMs": 30000 }
    }
  }
}
```

**Context:**
- User configures Lucky API key in Claude Desktop MCP settings
- Claude calls MCP tool based on user request
- Session includes `luckyApiKey` for authentication

---

### Step 2: MCP Server → Web API

**File:** `packages/mcp-server/src/index.ts`

**Code:**
```typescript
server.addTool({
  name: "lucky_run_workflow",
  execute: async (args, { session }) => {
    const apiKey = session?.luckyApiKey
    const apiUrl = process.env.LUCKY_API_URL || "http://localhost:3000"
    
    const rpcRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "workflow.invoke",
      params: {
        workflow_id: args.workflow_id,
        input: args.input,
        options: args.options,
        auth: { bearer: apiKey }
      }
    }

    const response = await fetch(`${apiUrl}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(rpcRequest)
    })

    return asText(await response.json())
  }
})
```

**Protocol:** HTTP POST with Bearer token

---

### Step 3: API Endpoint Processing

**File:** `apps/web/src/app/api/v1/invoke/route.ts`

**Code:**
```typescript
export async function POST(req: NextRequest) {
  // Parse JSON-RPC request
  const rpcRequest = await req.json()
  
  try {
    // Authenticate
    const principal = await authenticateRequest(req)
    
    // Extract params
    const { workflow_id, input, options } = rpcRequest.params
    
    // Load workflow config
    const { config, inputSchema } = await loadWorkflowConfig(workflow_id)
    
    // Validate input
    await validateAgainstSchema(input, inputSchema)
    
    // Execute
    const result = await invokeWorkflow({
      workflowVersionId: config.version_id,
      input,
      options
    })
    
    // Return JSON-RPC success
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id,
      result: {
        output: result.finalWorkflowOutputs,
        fitness: result.fitness
      }
    })
  } catch (error) {
    // Return JSON-RPC error
    return NextResponse.json({
      jsonrpc: "2.0",
      id: rpcRequest.id,
      error: {
        code: getErrorCode(error),
        message: error.message
      }
    })
  }
}
```

---

### Step 4: Principal Resolution

**File:** `apps/web/src/lib/auth/principal.ts`

**Code:**
```typescript
export async function authenticateRequest(req: NextRequest): Promise<Principal> {
  const authHeader = req.headers.get("Authorization")
  
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header")
  }
  
  const token = authHeader.substring(7)
  
  // Hash the token
  const hashedToken = await sha256(token)
  
  // Lookup in database
  const { data, error } = await supabase
    .from("lockbox.secret_keys")
    .select("clerk_id, scopes")
    .eq("key_hash", hashedToken)
    .single()
  
  if (error || !data) {
    throw new Error("Invalid API key")
  }
  
  return {
    clerk_id: data.clerk_id,
    scopes: data.scopes,
    auth_method: "api_key"
  }
}
```

**Output:**
```typescript
{
  clerk_id: "user_2abc123",
  scopes: ["workflow:read", "workflow:execute"],
  auth_method: "api_key"
}
```

---

### Step 5: Workflow Loading

**File:** `apps/web/src/lib/mcp-invoke/workflow-loader.ts`

**Code:**
```typescript
export async function loadWorkflowConfig(workflowId: string) {
  // Detect ID format
  if (workflowId.startsWith("wf_ver_")) {
    // Direct version lookup
    return loadVersionById(workflowId)
  }
  
  // Workflow ID - resolve to latest version
  const supabase = await createRLSClient() // Enforces RLS
  
  const { data, error } = await supabase
    .from("Workflow")
    .select("WorkflowVersion(*)")
    .eq("wf_id", workflowId)
    .single()
  
  if (error) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }
  
  // Get latest version
  const latestVersion = data.WorkflowVersion
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  
  return {
    config: latestVersion.config,
    inputSchema: latestVersion.config.inputSchema,
    outputSchema: latestVersion.config.outputSchema
  }
}
```

**Database Query (with RLS):**
```sql
SELECT WorkflowVersion.*
FROM Workflow
JOIN WorkflowVersion ON Workflow.wf_id = WorkflowVersion.workflow_id
WHERE Workflow.wf_id = 'wf_research_paper'
  AND Workflow.clerk_id = 'user_2abc123'  -- RLS enforced
ORDER BY WorkflowVersion.created_at DESC
LIMIT 1
```

---

### Step 6: Input Validation

**Code:**
```typescript
import Ajv from "ajv"

const ajv = new Ajv()

function validateAgainstSchema(input: unknown, schema: JSONSchema7) {
  const validate = ajv.compile(schema)
  const valid = validate(input)
  
  if (!valid) {
    throw new ValidationError({
      code: ErrorCodes.INPUT_VALIDATION_FAILED,
      message: "Input validation failed",
      errors: validate.errors
    })
  }
}
```

**Example:**
```typescript
// Schema
{
  type: "object",
  properties: {
    topic: { type: "string", minLength: 1 }
  },
  required: ["topic"]
}

// Valid input
{ topic: "AI Safety" } // ✅ Passes

// Invalid input
{ topic: "" }           // ❌ Fails - minLength violation
{ }                     // ❌ Fails - missing required field
```

---

### Step 7: Execution Context Setup

**Code:**
```typescript
async function withExecutionContext(principal: Principal, config: WorkflowConfig) {
  // Load user's model API keys from lockbox
  const modelKeys = await loadModelKeys(principal.clerk_id)
  
  // Setup tool registry
  const tools = await loadAvailableTools(principal)
  
  // Create execution context
  return {
    principal,
    config,
    modelKeys,
    tools,
    tracing: config.options?.trace || false
  }
}
```

---

### Step 8-9: Workflow Execution

**File:** `packages/core/src/workflow/runner/invokeWorkflow.ts`

**Code:**
```typescript
export async function invokeWorkflow(input: InvocationInput): Promise<InvokeWorkflowResult[]> {
  const workflow = new Workflow(input.dslConfig || await loadConfig(input.workflowVersionId))
  
  const results = await workflow.run({
    input: input.input,
    onProgress: input.onProgress,
    abortSignal: input.abortSignal
  })
  
  return results
}
```

**Internal Flow:**
1. Parse DAG (nodes, edges)
2. Topological sort for execution order
3. Execute nodes in sequence
4. Pass outputs between nodes
5. Handle routing/branching
6. Collect final outputs
7. Run evaluation (if configured)

---

### Step 10: Result Processing

**Output:**
```typescript
{
  fitness: 0.92,  // Evaluation score
  feedback: "Output meets quality criteria",
  finalWorkflowOutputs: {
    paper: "Comprehensive analysis of AI Safety...",
    citations: [...],
    metadata: {...}
  }
}
```

---

### Step 11: JSON-RPC Response

**Success Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1705420800000,
  "result": {
    "output": {
      "paper": "Comprehensive analysis of AI Safety...",
      "citations": [...],
      "metadata": {...}
    },
    "fitness": 0.92
  }
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1705420800000,
  "error": {
    "code": -32002,
    "message": "Input validation failed",
    "data": {
      "errors": [
        {
          "field": "topic",
          "message": "must be non-empty string"
        }
      ]
    }
  }
}
```

---

### Step 12: MCP Response to Claude

**MCP Server Code:**
```typescript
return asText(await response.json())
```

**MCP Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"output\":{\"paper\":\"Comprehensive analysis...\"},\"fitness\":0.92}"
    }
  ]
}
```

**Claude receives the workflow output and presents it to the user.**

---

## Async Execution Flow

For workflows with `timeoutMs > 30000`:

```
1. Client calls lucky_run_workflow
   ↓
2. MCP Server → /api/v1/invoke
   ↓
3. API detects timeoutMs > 30000
   ↓
4. Spawn background task
   ↓
5. Return invocation_id immediately
   {
     "invocation_id": "inv_abc123",
     "state": "running"
   }
   ↓
6. Client polls lucky_check_status
   ↓
7. Check /api/workflow/status/:invocation_id
   - Returns: { state: "running" | "completed" | "failed" }
   ↓
8. When completed, return final output
```

---

## State Management

### In-Memory (Single Server)

**File:** `apps/web/src/lib/workflow/active-workflows.ts`

```typescript
const activeWorkflows = new Map<string, {
  state: WorkflowState
  abortController: AbortController
  createdAt: Date
}>()
```

### Distributed (Redis)

**For multi-server deployments:**

```typescript
await redis.set(`workflow:${invocationId}`, JSON.stringify({
  state: "running",
  createdAt: new Date().toISOString()
}), { ex: 3600 }) // 1 hour TTL
```

---

## Error Handling Flow

```
Error occurs anywhere in pipeline
   ↓
Catch in /api/v1/invoke
   ↓
Map to JSON-RPC error code
   ↓
Return JSON-RPC error response
   ↓
MCP Server receives error
   ↓
Format as text for Claude
   ↓
Claude presents error to user
```

**Error Mapping:**
- Workflow not found → `-32001`
- Invalid input → `-32002`
- Execution failure → `-32003`
- Timeout → `-32004`

---

## Performance Considerations

**Caching:**
- Workflow configs cached after first load
- Model keys cached per session
- Tool registry cached globally

**Optimizations:**
- RLS client pooling
- Redis connection pooling
- Parallel node execution (where possible)

**Monitoring:**
- Log invocation duration
- Track error rates by code
- Monitor active workflow count

---

## Next Steps

Use this data flow documentation while implementing:
- **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)**
- **[Phase 2: MCP Tools](./phase-2-mcp-tools.md)**
- **[Phase 3: Testing](./phase-3-testing.md)**

