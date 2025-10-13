# Design Decisions

## Overview

This document outlines critical architectural decisions made for the MCP workflow integration, including rationale and implementation guidance.

---

## Decision 1: Workflow ID Format

### Current State

Database has two ID types:
- `wf_id` - User-set, human-readable (e.g., "research-paper")
- `wf_version_id` - Auto-generated (e.g., "wf_ver_abc123")

### Decision

Support both formats in `/api/v1/invoke`:
- If `workflow_id` starts with `wf_ver_`, treat as version ID
- Otherwise, treat as workflow ID and resolve to latest version

### Rationale

- **User Experience:** Users prefer human-readable IDs for discovery and invocation
- **Flexibility:** Version IDs allow pinning to specific workflow versions
- **Backward Compatibility:** Existing code using version IDs continues to work

### Implementation

**File:** `apps/web/src/lib/mcp-invoke/workflow-loader.ts:22`

```typescript
export async function loadWorkflowConfig(workflowId: string) {
  // If it's a version ID (wf_ver_*), use existing logic
  if (workflowId.startsWith("wf_ver_")) {
    return fetch(`/api/workflow/version/${workflowId}`)
  }

  // If it's a workflow ID (wf_*), resolve to latest version
  const supabase = await createRLSClient()
  const { data, error } = await supabase
    .from("Workflow")
    .select("WorkflowVersion(*)")
    .eq("wf_id", workflowId)
    .single()

  if (error || !data) {
    throw new Error(`Workflow not found: ${workflowId}`)
  }

  const latestVersion = data.WorkflowVersion
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return {
    config: latestVersion.config,
    inputSchema: latestVersion.config.inputSchema
  }
}
```

---

## Decision 2: Async Execution

### Current State

`/api/v1/invoke` is synchronous, waiting for workflow completion before returning

### Issue

Workflows taking >30 seconds cause MCP client timeouts, resulting in poor user experience

### Decision

Implement conditional async execution based on `timeoutMs`:
- If `timeoutMs ≤ 30000`, wait and return output (sync mode)
- If `timeoutMs > 30000`, spawn background task and return `invocation_id` (async mode)

### Rationale

- **Balance:** Sync mode provides simplicity for fast workflows
- **Reliability:** Async mode ensures long workflows complete without timeout
- **User Control:** Users can choose execution mode via `timeoutMs` parameter
- **MCP Compatibility:** Prevents client-side timeouts

### Implementation

**File:** `apps/web/src/app/api/v1/invoke/route.ts:115`

```typescript
const timeoutMs = params.options?.timeoutMs || 30000

if (timeoutMs > 30000) {
  // Async mode: spawn background task
  const invocationId = generateInvocationId()
  
  // Start background execution
  executeWorkflowBackground(invocationId, workflowVersionId, input, options)
  
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      invocation_id: invocationId,
      state: "running"
    }
  }
} else {
  // Sync mode: wait for completion
  const result = await invokeWorkflow({ workflowVersionId, input, options })
  
  return {
    jsonrpc: "2.0",
    id: request.id,
    result: {
      output: result.finalWorkflowOutputs,
      fitness: result.fitness,
      feedback: result.feedback
    }
  }
}
```

### Polling Pattern

For async executions, clients poll `/api/workflow/status/:invocation_id`:

```typescript
// Client-side polling
let status = await checkStatus(invocationId)
while (status.state === "running") {
  await sleep(2000) // Poll every 2 seconds
  status = await checkStatus(invocationId)
}

if (status.state === "completed") {
  return status.output
} else {
  throw new Error(`Workflow failed: ${status.error}`)
}
```

---

## Decision 3: Schema Discovery

### Current State

`WorkflowConfig.inputSchema` and `outputSchema` are optional JSONSchema7 fields

### Issue

Without schemas, Claude cannot understand what data to provide, defeating the purpose of schema-driven MCP integration

### Decision

Make schemas required for MCP-invokable workflows:
- Warn in UI if schema is missing
- Consider blocking MCP invocation if no schema defined
- Return clear error message when schema is missing

### Rationale

- **Schema-Driven Discovery:** Core value proposition of MCP
- **Better UX:** Claude can validate inputs before invocation
- **Type Safety:** Runtime validation ensures data integrity
- **Documentation:** Schemas serve as self-documenting API contracts

### Implementation

**UI Warning:**
```typescript
// In workflow editor
if (!workflow.config.inputSchema) {
  showWarning("Add inputSchema to enable MCP invocation")
}
```

**API Validation:**
```typescript
// In /api/user/workflows
if (!workflow.inputSchema) {
  // Option 1: Exclude from list
  continue
  
  // Option 2: Include with warning
  warnings.push({
    workflow_id: workflow.wf_id,
    message: "Missing inputSchema - MCP invocation may fail"
  })
}
```

### Migration Path

For existing workflows without schemas:
1. Phase 1: Warn in UI, allow invocation
2. Phase 2: Require schema for new workflows
3. Phase 3: Block MCP invocation for workflows without schemas

---

## Decision 4: Rate Limiting

### Question

Should we rate-limit MCP tool calls to prevent abuse?

### Decision

**Not initially** - Add rate limiting later if abuse occurs

### Rationale

- **Simplicity:** Keep initial implementation focused on core functionality
- **Existing Controls:** API key auth already provides user-level tracking
- **Monitoring:** Can add rate limiting incrementally based on usage patterns
- **Flexibility:** Easier to add than remove restrictions

### Future Consideration

Implement rate limiting per API key if needed:

```typescript
// Rate limiting config
const RATE_LIMITS = {
  invocations_per_hour: 100,
  concurrent_executions: 5,
  max_timeout_ms: 600000
}
```

**Implementation Strategy:**
- Use Redis to track invocation counts per API key
- Return `429 Too Many Requests` when limit exceeded
- Include `Retry-After` header with wait time

---

## Decision 5: Error Handling

### Standard Error Codes

From `packages/shared/src/contracts/invoke.ts:143`:

- `-32001` - `WORKFLOW_NOT_FOUND`
- `-32002` - `INPUT_VALIDATION_FAILED`
- `-32003` - `WORKFLOW_EXECUTION_FAILED`
- `-32004` - `TIMEOUT`

### Decision

Use these codes consistently across all endpoints in JSON-RPC error format

### Rationale

- **Consistency:** Same error codes across API and MCP layers
- **JSON-RPC Compliance:** Standard error object format
- **Client-Friendly:** Enables programmatic error handling
- **Debugging:** Clear error messages with context

### Implementation

```typescript
// Error response format
{
  jsonrpc: "2.0",
  id: request.id,
  error: {
    code: ErrorCodes.WORKFLOW_NOT_FOUND,
    message: "Workflow 'wf_research_paper' not found",
    data: {
      workflow_id: "wf_research_paper",
      clerk_id: "user_123"
    }
  }
}
```

**Error Mapping:**

| HTTP Status | JSON-RPC Code | Scenario |
|-------------|---------------|----------|
| 404 | -32001 | Workflow not found or no access |
| 400 | -32002 | Input validation failed |
| 500 | -32003 | Workflow execution error |
| 408 | -32004 | Execution timeout |
| 401 | -32000 | Authentication failed |

---

## Decision 6: Security & RLS

### Decision

Enforce Row-Level Security (RLS) for all workflow operations

### Implementation

**Always use RLS client:**
```typescript
const supabase = await createRLSClient() // Automatically filters by clerk_id
```

**Never bypass RLS:**
```typescript
// ❌ WRONG - Bypasses RLS
const supabase = createServiceClient()

// ✅ CORRECT - Enforces RLS
const supabase = await createRLSClient()
```

### Rationale

- **Security:** Users can only access their own workflows
- **Privacy:** Prevents data leakage between users
- **Compliance:** Enforces authorization at database level
- **Defense in Depth:** Security layer independent of application logic

### Testing

Verify RLS enforcement:
```typescript
test("user cannot access other user's workflows", async () => {
  const user1 = await createTestUser()
  const user2 = await createTestUser()
  
  const workflow = await createWorkflow({ clerk_id: user1.clerk_id })
  
  // User 2 should not see user 1's workflow
  const response = await fetch("/api/user/workflows", {
    headers: { Authorization: `Bearer ${user2.apiKey}` }
  })
  
  const workflows = await response.json()
  expect(workflows).not.toContainEqual(expect.objectContaining({ 
    workflow_id: workflow.wf_id 
  }))
})
```

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Workflow ID Format | Support both `wf_*` and `wf_ver_*` | User experience + flexibility |
| Async Execution | Conditional based on timeoutMs | Balance simplicity and reliability |
| Schema Discovery | Required for MCP invocation | Core MCP value proposition |
| Rate Limiting | Not initially, add later | Keep implementation simple |
| Error Handling | Consistent JSON-RPC codes | Client-friendly error handling |
| Security | Always enforce RLS | Defense in depth |

---

## Next Steps

Apply these decisions during implementation in:
- **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)**
- **[Phase 2: MCP Tools](./phase-2-mcp-tools.md)**
- **[Phase 3: Testing](./phase-3-testing.md)**

