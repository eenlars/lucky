# Requirements: Current State & Implementation Gaps

## Current State

### ✅ Workflow Execution Engine

**Location:** `packages/core/src/workflow/runner/invokeWorkflow.ts`

**Status:** Production-ready

**Capabilities:**
- Entry point: `invokeWorkflow(input: InvocationInput)`
- Supports 3 load methods:
  - `workflowVersionId` - Direct version ID
  - `filename` - Load from file
  - `dslConfig` - Direct config object
- Returns: `InvokeWorkflowResult[]` with fitness, feedback, finalWorkflowOutputs
- Progress tracking: `onProgress: WorkflowEventHandler` callback
- Cancellation: `abortSignal: AbortSignal` built-in support

### ✅ Existing API Endpoints

**Location:** `apps/web/src/app/api/`

#### 1. POST /api/v1/invoke

**File:** `apps/web/src/app/api/v1/invoke/route.ts:32`

**Status:** ✅ Complete (needs workflow_id resolution enhancement)

**Features:**
- JSON-RPC 2.0 compliant
- Accepts `JsonRpcInvokeRequest` with workflow_id, input, options
- Returns `JsonRpcInvokeSuccess` or `JsonRpcInvokeError`
- Supports API key + session authentication
- Input schema validation
- Provider key validation

**Issue:** Currently expects `workflow_id` to be a `workflowVersionId` (e.g., `wf_ver_abc123`), not a user-friendly workflow ID (e.g., `wf_research_paper`)

#### 2. GET /api/workflow/status/[invocationId]

**File:** `apps/web/src/app/api/workflow/status/[invocationId]/route.ts:21`

**Status:** ✅ Complete

**Returns:**
```typescript
{
  state: "running" | "cancelling" | "cancelled" | "completed" | "failed" | "not_found"
  invocationId: string
  createdAt: string
  cancelRequestedAt?: string
}
```

**Implementation:** Checks both Redis (distributed state) and in-memory `activeWorkflows` map

#### 3. GET /api/workflow/[wf_id]

**File:** `apps/web/src/app/api/workflow/[wf_id]/route.ts:7`

**Status:** ⚠️ Exists but incomplete

**Issue:** No RLS filtering by user - returns workflows regardless of ownership

### ✅ Authentication System

**Location:** `apps/web/src/lib/auth/principal.ts`

**Flow:**
1. **API Key Auth:** Bearer token → SHA256 hash → lookup in `lockbox.secret_keys` table
2. **Session Auth:** Clerk userId → clerk_id

**Principal Type:**
```typescript
{
  clerk_id: string
  scopes: string[]
  auth_method: "api_key" | "session"
}
```

**Usage:** `authenticateRequest(req)` in `/api/v1/invoke`

### ✅ Type Contracts

**Location:** `packages/shared/src/contracts/`

**Available Contracts:**
- `invoke.ts` - JsonRpcInvokeRequest, JsonRpcInvokeResponse, InvokeOptions, ErrorCodes
- `workflow.ts` - WorkflowConfig with inputSchema & outputSchema (JSONSchema7)
- `ingestion.ts` - MCPInvokeInput type for structured data

---

## Implementation Gaps

### ❌ Gap 1: List Workflows Endpoint

**Need:** `GET /api/user/workflows`

**Problem:** No way to discover workflows owned by a user

**Priority:** HIGH - Required for workflow discovery

**Estimated Effort:** 1 hour

### ❌ Gap 2: Workflow ID Resolution

**Need:** Update workflow loader to support both `wf_*` and `wf_ver_*` formats

**Problem:** `/api/v1/invoke` expects `workflowVersionId` (like `wf_ver_abc123`), not user-friendly IDs (like `wf_research_paper`)

**Priority:** HIGH - Required for user-friendly workflow invocation

**Estimated Effort:** 1 hour

### ❌ Gap 3: Cancel Workflow Endpoint

**Need:** `POST /api/workflow/cancel/[invocationId]`

**Problem:** `/api/workflow/status/[invocationId]` shows `cancelRequestedAt`, but no way to request cancellation

**Priority:** MEDIUM - Nice to have for long-running workflows

**Estimated Effort:** 30 minutes

### ❌ Gap 4: MCP Server Tools

**Need:** Add workflow tools to `packages/mcp-server/src/index.ts`

**Problem:** MCP server only has Firecrawl tools (`lucky_scrape`, `lucky_crawl`, etc.)

**Required Tools:**
1. `lucky_list_workflows` - Discover available workflows
2. `lucky_run_workflow` - Execute a workflow
3. `lucky_check_status` - Poll execution status
4. `lucky_cancel_workflow` - Cancel running workflow (optional)

**Priority:** HIGH - Core MCP functionality

**Estimated Effort:** 2-3 hours

---

## API Endpoint Specifications

### Summary Table

| Endpoint | Method | Status | Priority | Effort |
|----------|--------|--------|----------|--------|
| `/api/user/workflows` | GET | **NEW** | HIGH | 1h |
| `/api/v1/invoke` | POST | **UPDATE** | HIGH | 1h |
| `/api/workflow/cancel/:invocation_id` | POST | **NEW** | MEDIUM | 30m |
| `/api/workflow/status/:invocation_id` | GET | **EXISTS** | - | - |

### Required Response Schemas

#### GET /api/user/workflows

```typescript
{
  workflow_id: string         // "wf_research_paper"
  name: string                // "Research Paper Generator"
  description?: string        // "Generates academic research papers..."
  inputSchema?: JSONSchema7   // From latest WorkflowVersion
  outputSchema?: JSONSchema7  // From latest WorkflowVersion
  created_at: string          // ISO timestamp
}[]
```

#### POST /api/v1/invoke (Updated)

**Request:**
```typescript
{
  jsonrpc: "2.0",
  id: number,
  method: "workflow.invoke",
  params: {
    workflow_id: string,      // Now supports both wf_* and wf_ver_*
    input: unknown,
    options?: {
      timeoutMs?: number,
      trace?: boolean
    }
  }
}
```

**Response (Sync):**
```typescript
{
  jsonrpc: "2.0",
  id: number,
  result: {
    output: unknown,
    fitness?: number,
    feedback?: string
  }
}
```

**Response (Async):**
```typescript
{
  jsonrpc: "2.0",
  id: number,
  result: {
    invocation_id: string,
    state: "running"
  }
}
```

#### POST /api/workflow/cancel/[invocationId]

**Response:**
```typescript
{
  state: "cancelling",
  invocationId: string
}
```

---

## MCP Tool Specifications

### Tool 1: lucky_list_workflows

**Parameters:** None

**Returns:** Array of workflow metadata (matching `/api/user/workflows` response)

**Purpose:** Discover all workflows available to the authenticated user

### Tool 2: lucky_run_workflow

**Parameters:**
- `workflow_id` (string, required) - Workflow identifier from `lucky_list_workflows`
- `input` (unknown, required) - Input data matching the workflow's inputSchema
- `options` (object, optional)
  - `timeoutMs` (number, optional) - Max execution time (default: 30000, max: 600000)
  - `trace` (boolean, optional) - Enable execution tracing

**Returns:**
- Sync mode: Workflow output
- Async mode: `{ invocation_id: string }`

**Purpose:** Execute a workflow with provided input data

### Tool 3: lucky_check_status

**Parameters:**
- `invocation_id` (string, required) - Invocation identifier from async execution

**Returns:** Execution status and metadata

**Purpose:** Poll the status of a running workflow execution

### Tool 4: lucky_cancel_workflow (Optional)

**Parameters:**
- `invocation_id` (string, required) - Invocation identifier to cancel

**Returns:** Cancellation confirmation

**Purpose:** Cancel a running workflow execution

---

## Standard Error Codes

From `packages/shared/src/contracts/invoke.ts:143`:

- `-32001` - `WORKFLOW_NOT_FOUND` - Workflow ID does not exist or user lacks access
- `-32002` - `INPUT_VALIDATION_FAILED` - Input does not match inputSchema
- `-32003` - `WORKFLOW_EXECUTION_FAILED` - Workflow encountered an error during execution
- `-32004` - `TIMEOUT` - Workflow execution exceeded timeoutMs

All endpoints must return errors in JSON-RPC format:

```typescript
{
  jsonrpc: "2.0",
  id: number,
  error: {
    code: number,
    message: string,
    data?: unknown
  }
}
```

---

## Contract Imports

```typescript
// From packages/shared/src/contracts/
import { JsonRpcInvokeRequest } from "./invoke.ts"      // Request structure
import { JsonRpcInvokeResponse } from "./invoke.ts"     // Response structure
import { InvokeOptions } from "./invoke.ts"             // Timeout/trace options
import { ErrorCodes } from "./invoke.ts"                // Error codes
import { WorkflowConfig } from "./workflow.ts"          // Workflow structure
import { MCPInvokeInput } from "./ingestion.ts"         // MCP input type
```

---

## Dependencies

**Authentication:**
- `authenticateRequest(req)` from `apps/web/src/lib/auth/principal.ts`
- `createRLSClient()` from Supabase adapter

**Workflow Management:**
- `invokeWorkflow()` from `packages/core/src/workflow/runner/invokeWorkflow.ts`
- `activeWorkflows` from `apps/web/src/lib/workflow/active-workflows.ts`
- `setWorkflowState()` for Redis state management

**Validation:**
- `validateAgainstSchema()` for input validation
- Zod schemas from contracts

---

## Next Steps

1. Review **[Design Decisions](./design-decisions.md)** for architectural context
2. Start implementation with **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)**

