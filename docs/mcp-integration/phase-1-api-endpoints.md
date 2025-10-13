# Phase 1: API Endpoints Implementation

**Estimated Time:** 2-3 hours

**Goal:** Build backend API endpoints to support workflow discovery, execution, and cancellation.

---

## Overview

This phase focuses on creating three new/updated API endpoints:

1. **GET /api/user/workflows** - List user's workflows with schemas
2. **UPDATE /api/v1/invoke** - Add workflow ID resolution (wf_* → wf_ver_*)
3. **POST /api/workflow/cancel/:invocation_id** - Cancel running workflows

---

## Task 1.1: Create GET /api/user/workflows

### Requirements

**File:** `apps/web/src/app/api/user/workflows/route.ts` (NEW)

**Purpose:** Allow users to discover their workflows with input/output schemas

**Priority:** HIGH

**Estimated Time:** 1 hour

### Implementation

```typescript
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth/principal"
import { createRLSClient } from "@/lib/supabase/rls-client"

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const principal = await authenticateRequest(req)
    
    // RLS automatically filters by clerk_id
    const supabase = await createRLSClient()

    const { data, error } = await supabase
      .from("Workflow")
      .select("wf_id, name, description, created_at, WorkflowVersion(*)")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message }, 
        { status: 500 }
      )
    }

    // Include latest version's inputSchema and outputSchema
    const workflows = data.map(wf => {
      // Sort versions by created_at descending
      const sortedVersions = wf.WorkflowVersion.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      const latestVersion = sortedVersions[0]
      
      return {
        workflow_id: wf.wf_id,
        name: wf.name,
        description: wf.description,
        inputSchema: latestVersion?.config?.inputSchema,
        outputSchema: latestVersion?.config?.outputSchema,
        created_at: wf.created_at
      }
    })

    return NextResponse.json(workflows)
    
  } catch (error) {
    if (error.message.includes("Invalid API key")) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}
```

### Response Schema

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

### Testing

**Unit Test:** `apps/web/src/app/api/user/workflows/route.test.ts`

```typescript
import { GET } from "./route"
import { createTestWorkflow, createTestUser } from "@/test/factories"

describe("GET /api/user/workflows", () => {
  it("returns user's workflows with schemas", async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow({ clerk_id: user.clerk_id })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows).toHaveLength(1)
    expect(workflows[0]).toMatchObject({
      workflow_id: workflow.wf_id,
      name: workflow.name,
      inputSchema: expect.any(Object),
      outputSchema: expect.any(Object)
    })
  })
  
  it("returns 401 without auth", async () => {
    const req = new Request("http://localhost/api/user/workflows")
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
  
  it("enforces RLS - user cannot see other user's workflows", async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    
    await createTestWorkflow({ clerk_id: user1.clerk_id })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user2.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows).toHaveLength(0)
  })
})
```

### Acceptance Criteria

- [ ] Returns 401 if not authenticated
- [ ] Returns only workflows owned by authenticated user (RLS enforced)
- [ ] Includes inputSchema and outputSchema from latest version
- [ ] Returns empty array if no workflows exist
- [ ] Workflows sorted by created_at descending (newest first)
- [ ] Returns 500 with error message on database error
- [ ] Unit tests pass

---

## Task 1.2: Update Workflow ID Resolution

### Requirements

**File:** `apps/web/src/lib/mcp-invoke/workflow-loader.ts` (UPDATE or CREATE)

**Purpose:** Support both `wf_*` (workflow ID) and `wf_ver_*` (version ID) formats

**Priority:** HIGH

**Estimated Time:** 1 hour

### Implementation

```typescript
import { createRLSClient } from "@/lib/supabase/rls-client"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"
import type { JSONSchema7 } from "json-schema"

export async function loadWorkflowConfig(workflowId: string): Promise<{
  config: WorkflowConfig
  inputSchema?: JSONSchema7
  outputSchema?: JSONSchema7
}> {
  // If it's a version ID (wf_ver_*), use existing logic
  if (workflowId.startsWith("wf_ver_")) {
    return loadWorkflowByVersionId(workflowId)
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

  if (!data.WorkflowVersion || data.WorkflowVersion.length === 0) {
    throw new Error(`No versions found for workflow: ${workflowId}`)
  }

  // Get latest version (sort by created_at descending)
  const latestVersion = data.WorkflowVersion
    .sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

  return {
    config: latestVersion.config,
    inputSchema: latestVersion.config.inputSchema,
    outputSchema: latestVersion.config.outputSchema
  }
}

async function loadWorkflowByVersionId(versionId: string) {
  const supabase = await createRLSClient()
  
  const { data, error } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("wf_version_id", versionId)
    .single()

  if (error || !data) {
    throw new Error(`Workflow version not found: ${versionId}`)
  }

  return {
    config: data.config,
    inputSchema: data.config.inputSchema,
    outputSchema: data.config.outputSchema
  }
}
```

### Update /api/v1/invoke

**File:** `apps/web/src/app/api/v1/invoke/route.ts`

**Change:** Use `loadWorkflowConfig()` instead of direct version ID lookup

```typescript
// Before
const workflowVersionId = params.workflow_id
const config = await loadByVersionId(workflowVersionId)

// After
const { config, inputSchema } = await loadWorkflowConfig(params.workflow_id)
```

### Testing

**Unit Test:** `apps/web/src/lib/mcp-invoke/workflow-loader.test.ts`

```typescript
describe("loadWorkflowConfig", () => {
  it("loads workflow by version ID (wf_ver_*)", async () => {
    const workflow = await createTestWorkflow()
    const version = workflow.versions[0]
    
    const result = await loadWorkflowConfig(version.wf_version_id)
    
    expect(result.config).toEqual(version.config)
    expect(result.inputSchema).toBeDefined()
  })
  
  it("loads workflow by workflow ID (wf_*) - latest version", async () => {
    const workflow = await createTestWorkflow()
    await createWorkflowVersion(workflow, { version: 2 })
    
    const result = await loadWorkflowConfig(workflow.wf_id)
    
    expect(result.config.version).toBe(2) // Latest version
  })
  
  it("throws error for non-existent workflow", async () => {
    await expect(
      loadWorkflowConfig("wf_nonexistent")
    ).rejects.toThrow("Workflow not found")
  })
  
  it("respects RLS - cannot load other user's workflow", async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    
    const workflow = await createTestWorkflow({ clerk_id: user1.clerk_id })
    
    // Switch to user2 context
    await switchUser(user2)
    
    await expect(
      loadWorkflowConfig(workflow.wf_id)
    ).rejects.toThrow("Workflow not found")
  })
})
```

### Acceptance Criteria

- [ ] Supports both `wf_*` and `wf_ver_*` formats
- [ ] Returns latest version for `wf_*` IDs
- [ ] Throws clear error if workflow not found
- [ ] Respects RLS (user can only load their workflows)
- [ ] Returns config with inputSchema and outputSchema
- [ ] Unit tests pass
- [ ] Integration with `/api/v1/invoke` works

---

## Task 1.3: Create POST /api/workflow/cancel/[invocationId]

### Requirements

**File:** `apps/web/src/app/api/workflow/cancel/[invocationId]/route.ts` (NEW)

**Purpose:** Allow users to cancel running workflow executions

**Priority:** MEDIUM

**Estimated Time:** 30 minutes

### Implementation

```typescript
import { NextRequest, NextResponse } from "next/server"
import { authenticateRequest } from "@/lib/auth/principal"
import { activeWorkflows, setWorkflowState } from "@/lib/workflow/active-workflows"

export async function POST(
  req: NextRequest,
  { params }: { params: { invocationId: string } }
) {
  try {
    // Authenticate user
    const principal = await authenticateRequest(req)
    
    const { invocationId } = params

    // Check if workflow is running
    const entry = activeWorkflows.get(invocationId)

    if (!entry) {
      return NextResponse.json(
        { 
          state: "not_found", 
          invocationId 
        },
        { status: 404 }
      )
    }

    // Trigger cancellation via AbortController
    entry.abortController.abort()
    
    // Update state in Redis (for distributed systems)
    await setWorkflowState(invocationId, { 
      state: "cancelling",
      cancelRequestedAt: new Date().toISOString()
    })

    return NextResponse.json({
      state: "cancelling",
      invocationId,
      cancelRequestedAt: new Date().toISOString()
    })
    
  } catch (error) {
    if (error.message.includes("Invalid API key")) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}
```

### Testing

**Unit Test:** `apps/web/src/app/api/workflow/cancel/[invocationId]/route.test.ts`

```typescript
describe("POST /api/workflow/cancel/:invocationId", () => {
  it("cancels running workflow", async () => {
    const user = await createTestUser()
    const invocationId = await startTestWorkflow(user)
    
    const req = new Request(
      `http://localhost/api/workflow/cancel/${invocationId}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${user.apiKey}` }
      }
    )
    
    const response = await POST(req, { params: { invocationId } })
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data).toMatchObject({
      state: "cancelling",
      invocationId
    })
  })
  
  it("returns 404 for non-existent invocation", async () => {
    const user = await createTestUser()
    
    const req = new Request(
      "http://localhost/api/workflow/cancel/inv_nonexistent",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${user.apiKey}` }
      }
    )
    
    const response = await POST(req, { params: { invocationId: "inv_nonexistent" } })
    
    expect(response.status).toBe(404)
  })
  
  it("returns 401 without auth", async () => {
    const req = new Request("http://localhost/api/workflow/cancel/inv_123", {
      method: "POST"
    })
    
    const response = await POST(req, { params: { invocationId: "inv_123" } })
    
    expect(response.status).toBe(401)
  })
})
```

### Acceptance Criteria

- [ ] Returns 401 if not authenticated
- [ ] Returns 404 if invocation not found
- [ ] Successfully triggers AbortController
- [ ] Updates Redis state to "cancelling"
- [ ] Returns cancellation confirmation with timestamp
- [ ] Unit tests pass
- [ ] Integration with workflow execution engine works

---

## Phase 1 Checklist

### Setup
- [ ] Create directory `apps/web/src/app/api/user/workflows/`
- [ ] Create directory `apps/web/src/lib/mcp-invoke/`
- [ ] Create directory `apps/web/src/app/api/workflow/cancel/[invocationId]/`

### Implementation
- [ ] **Task 1.1:** Implement `GET /api/user/workflows`
  - [ ] Create route file
  - [ ] Implement authentication
  - [ ] Query Workflow table with RLS
  - [ ] Return workflows with schemas
  - [ ] Write unit tests
  
- [ ] **Task 1.2:** Update workflow ID resolution
  - [ ] Create `loadWorkflowConfig()` function
  - [ ] Support both `wf_*` and `wf_ver_*` formats
  - [ ] Update `/api/v1/invoke` to use new loader
  - [ ] Write unit tests
  
- [ ] **Task 1.3:** Implement `POST /api/workflow/cancel/:invocationId`
  - [ ] Create route file
  - [ ] Implement cancellation logic
  - [ ] Update Redis state
  - [ ] Write unit tests

### Testing
- [ ] All unit tests pass
- [ ] Manual testing with Postman/curl
  - [ ] Test `GET /api/user/workflows` with valid API key
  - [ ] Test `GET /api/user/workflows` with invalid API key (401)
  - [ ] Test `/api/v1/invoke` with `wf_*` ID
  - [ ] Test `/api/v1/invoke` with `wf_ver_*` ID
  - [ ] Test cancellation flow

### Verification
- [ ] TypeScript compilation passes (`bun run tsc`)
- [ ] Linting passes (`bun run lint`)
- [ ] Code formatted (`bun run format`)
- [ ] RLS enforcement verified (user isolation)

### Documentation
- [ ] Update API documentation with new endpoints
- [ ] Add JSDoc comments to new functions

---

## Next Steps

Once Phase 1 is complete, proceed to:
- **[Phase 2: MCP Tools](./phase-2-mcp-tools.md)** - Implement MCP server tools

