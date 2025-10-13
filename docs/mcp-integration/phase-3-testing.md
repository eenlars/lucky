# Phase 3: Testing Strategy

**Estimated Time:** 1-2 hours

**Goal:** Ensure all components work correctly through comprehensive unit, integration, and manual testing.

**Prerequisites:** Phase 1 and Phase 2 must be complete

---

## Overview

This phase implements a comprehensive testing strategy across three levels:

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Full flow testing
3. **Manual Tests** - Real-world Claude Desktop testing

---

## Test Pyramid

```
      Manual Testing
    (Claude Desktop)
          ↑
    Integration Tests
      (Full flows)
          ↑
      Unit Tests
  (Individual components)
```

---

## Unit Tests

### Test Suite 1: GET /api/user/workflows

**File:** `apps/web/src/app/api/user/workflows/route.test.ts`

```typescript
import { GET } from "./route"
import { createTestWorkflow, createTestUser, createWorkflowVersion } from "@/test/factories"

describe("GET /api/user/workflows", () => {
  it("returns user's workflows with schemas", async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow({ 
      clerk_id: user.clerk_id,
      name: "Test Workflow",
      description: "Test description"
    })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows).toHaveLength(1)
    expect(workflows[0]).toMatchObject({
      workflow_id: workflow.wf_id,
      name: "Test Workflow",
      description: "Test description",
      inputSchema: expect.any(Object),
      outputSchema: expect.any(Object)
    })
  })
  
  it("returns workflows sorted by created_at descending", async () => {
    const user = await createTestUser()
    const wf1 = await createTestWorkflow({ 
      clerk_id: user.clerk_id,
      name: "First"
    })
    await sleep(100)
    const wf2 = await createTestWorkflow({ 
      clerk_id: user.clerk_id,
      name: "Second"
    })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows[0].name).toBe("Second")
    expect(workflows[1].name).toBe("First")
  })
  
  it("returns latest version's schemas", async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow({ clerk_id: user.clerk_id })
    
    // Create version 2 with different schema
    await createWorkflowVersion(workflow, {
      inputSchema: {
        type: "object",
        properties: { newField: { type: "string" } }
      }
    })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows[0].inputSchema.properties).toHaveProperty("newField")
  })
  
  it("returns 401 without authentication", async () => {
    const req = new Request("http://localhost/api/user/workflows")
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
  
  it("returns 401 with invalid API key", async () => {
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: "Bearer sk_invalid" }
    })
    const response = await GET(req)
    
    expect(response.status).toBe(401)
  })
  
  it("enforces RLS - user cannot see other user's workflows", async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    
    await createTestWorkflow({ clerk_id: user1.clerk_id, name: "User 1 Workflow" })
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user2.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows).toHaveLength(0)
  })
  
  it("returns empty array when user has no workflows", async () => {
    const user = await createTestUser()
    
    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })
    
    const response = await GET(req)
    const workflows = await response.json()
    
    expect(workflows).toEqual([])
  })
})
```

### Test Suite 2: Workflow ID Resolution

**File:** `apps/web/src/lib/mcp-invoke/workflow-loader.test.ts`

```typescript
import { loadWorkflowConfig } from "./workflow-loader"
import { createTestWorkflow, createWorkflowVersion, createTestUser } from "@/test/factories"

describe("loadWorkflowConfig", () => {
  it("loads workflow by version ID (wf_ver_*)", async () => {
    const workflow = await createTestWorkflow()
    const version = workflow.versions[0]
    
    const result = await loadWorkflowConfig(version.wf_version_id)
    
    expect(result.config).toEqual(version.config)
    expect(result.inputSchema).toBeDefined()
    expect(result.outputSchema).toBeDefined()
  })
  
  it("loads workflow by workflow ID (wf_*) - returns latest version", async () => {
    const workflow = await createTestWorkflow({
      config: { version: 1 }
    })
    
    await createWorkflowVersion(workflow, { 
      config: { version: 2 }
    })
    
    const result = await loadWorkflowConfig(workflow.wf_id)
    
    expect(result.config.version).toBe(2)
  })
  
  it("throws error for non-existent workflow ID", async () => {
    await expect(
      loadWorkflowConfig("wf_nonexistent")
    ).rejects.toThrow("Workflow not found: wf_nonexistent")
  })
  
  it("throws error for non-existent version ID", async () => {
    await expect(
      loadWorkflowConfig("wf_ver_nonexistent")
    ).rejects.toThrow("Workflow version not found")
  })
  
  it("respects RLS - cannot load other user's workflow", async () => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    
    const workflow = await createTestWorkflow({ clerk_id: user1.clerk_id })
    
    // Switch context to user2
    await setAuthContext(user2)
    
    await expect(
      loadWorkflowConfig(workflow.wf_id)
    ).rejects.toThrow("Workflow not found")
  })
})
```

### Test Suite 3: POST /api/workflow/cancel/:invocationId

**File:** `apps/web/src/app/api/workflow/cancel/[invocationId]/route.test.ts`

```typescript
import { POST } from "./route"
import { createTestUser, startTestWorkflow } from "@/test/factories"

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
      invocationId,
      cancelRequestedAt: expect.any(String)
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
    expect(await response.json()).toMatchObject({
      state: "not_found"
    })
  })
  
  it("returns 401 without authentication", async () => {
    const req = new Request("http://localhost/api/workflow/cancel/inv_123", {
      method: "POST"
    })
    
    const response = await POST(req, { params: { invocationId: "inv_123" } })
    
    expect(response.status).toBe(401)
  })
})
```

### Checklist: Unit Tests

- [ ] All test files created
- [ ] All tests pass: `bun run test`
- [ ] Code coverage > 80% for new code
- [ ] Edge cases covered (errors, not found, unauthorized)
- [ ] RLS enforcement verified

---

## Integration Tests

### Test Suite: Full MCP Workflow Integration

**File:** `tests/integration/mcp-workflow-integration.test.ts`

```typescript
import { createTestUser, createTestWorkflow } from "@/test/factories"

describe("MCP Workflow Integration", () => {
  let user: TestUser
  let apiKey: string
  let workflowId: string
  
  beforeEach(async () => {
    user = await createTestUser()
    apiKey = user.apiKey
    
    const workflow = await createTestWorkflow({
      clerk_id: user.clerk_id,
      name: "Integration Test Workflow",
      config: {
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" }
          },
          required: ["message"]
        },
        outputSchema: {
          type: "object",
          properties: {
            result: { type: "string" }
          }
        }
      }
    })
    
    workflowId = workflow.wf_id
  })
  
  describe("Happy Path: List → Run → Complete", () => {
    it("completes full workflow execution flow", async () => {
      // Step 1: List workflows
      const listResponse = await fetch("http://localhost:3000/api/user/workflows", {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      
      expect(listResponse.status).toBe(200)
      const workflows = await listResponse.json()
      expect(workflows).toHaveLength(1)
      expect(workflows[0].workflow_id).toBe(workflowId)
      
      // Step 2: Run workflow (sync mode)
      const invokeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: workflowId,
          input: { message: "Hello World" },
          options: { timeoutMs: 30000 }
        }
      }
      
      const invokeResponse = await fetch("http://localhost:3000/api/v1/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(invokeRequest)
      })
      
      expect(invokeResponse.status).toBe(200)
      const invokeResult = await invokeResponse.json()
      
      expect(invokeResult).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          output: expect.any(Object)
        }
      })
    })
  })
  
  describe("Async Execution Flow", () => {
    it("handles async workflow with polling", async () => {
      // Step 1: Start async workflow
      const invokeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: workflowId,
          input: { message: "Long task" },
          options: { timeoutMs: 60000 } // > 30s = async
        }
      }
      
      const invokeResponse = await fetch("http://localhost:3000/api/v1/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(invokeRequest)
      })
      
      const invokeResult = await invokeResponse.json()
      
      expect(invokeResult.result).toMatchObject({
        invocation_id: expect.stringMatching(/^inv_/),
        state: "running"
      })
      
      const invocationId = invokeResult.result.invocation_id
      
      // Step 2: Poll status until complete
      let status
      let attempts = 0
      const maxAttempts = 30
      
      do {
        await sleep(2000)
        
        const statusResponse = await fetch(
          `http://localhost:3000/api/workflow/status/${invocationId}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` }
          }
        )
        
        status = await statusResponse.json()
        attempts++
        
      } while (status.state === "running" && attempts < maxAttempts)
      
      expect(status.state).toBe("completed")
      expect(status.output).toBeDefined()
    })
  })
  
  describe("Cancellation Flow", () => {
    it("cancels long-running workflow", async () => {
      // Start workflow
      const invokeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: workflowId,
          input: { message: "Cancel me" },
          options: { timeoutMs: 120000 }
        }
      }
      
      const invokeResponse = await fetch("http://localhost:3000/api/v1/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(invokeRequest)
      })
      
      const { result } = await invokeResponse.json()
      const invocationId = result.invocation_id
      
      // Cancel workflow
      const cancelResponse = await fetch(
        `http://localhost:3000/api/workflow/cancel/${invocationId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      )
      
      const cancelResult = await cancelResponse.json()
      expect(cancelResult.state).toBe("cancelling")
      
      // Verify state
      await sleep(1000)
      
      const statusResponse = await fetch(
        `http://localhost:3000/api/workflow/status/${invocationId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` }
        }
      )
      
      const status = await statusResponse.json()
      expect(["cancelling", "cancelled"]).toContain(status.state)
    })
  })
  
  describe("Error Handling", () => {
    it("returns WORKFLOW_NOT_FOUND for invalid workflow_id", async () => {
      const invokeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: "wf_nonexistent",
          input: {},
          options: {}
        }
      }
      
      const response = await fetch("http://localhost:3000/api/v1/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(invokeRequest)
      })
      
      const result = await response.json()
      
      expect(result.error).toMatchObject({
        code: -32001,
        message: expect.stringContaining("not found")
      })
    })
    
    it("returns INPUT_VALIDATION_FAILED for invalid input", async () => {
      const invokeRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: workflowId,
          input: {}, // Missing required 'message' field
          options: {}
        }
      }
      
      const response = await fetch("http://localhost:3000/api/v1/invoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(invokeRequest)
      })
      
      const result = await response.json()
      
      expect(result.error).toMatchObject({
        code: -32002,
        message: expect.stringContaining("validation")
      })
    })
  })
})
```

### Checklist: Integration Tests

- [ ] Integration test file created
- [ ] All integration tests pass
- [ ] Happy path tested (list → run → complete)
- [ ] Async execution with polling tested
- [ ] Cancellation flow tested
- [ ] Error scenarios tested
- [ ] Tests run against real database (test environment)

---

## Manual Testing

### Setup

1. **Build MCP Server:**
```bash
cd packages/mcp-server
bun install
bun run build
```

2. **Start Web API:**
```bash
cd apps/web
bun run dev
```

3. **Configure Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lucky": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "LUCKY_API_URL": "http://localhost:3000"
      },
      "session": {
        "luckyApiKey": "sk_test_your_api_key_here"
      }
    }
  }
}
```

4. **Get API Key:**
- Log into Lucky web UI
- Navigate to Settings → API Keys
- Create new API key
- Copy and paste into MCP config

### Test Scenarios

#### Scenario 1: Workflow Discovery

**User Action:** Ask Claude: "List my Lucky workflows"

**Expected Behavior:**
1. Claude calls `lucky_list_workflows`
2. Returns list of workflows with metadata
3. Shows workflow_id, name, description, schemas

**Verification:**
- [ ] Workflows are listed
- [ ] Schemas are included
- [ ] Only user's workflows shown

#### Scenario 2: Sync Workflow Execution

**User Action:** Ask Claude: "Run the [workflow_name] workflow with [input]"

**Expected Behavior:**
1. Claude calls `lucky_run_workflow`
2. Workflow executes (< 30s)
3. Returns output immediately

**Verification:**
- [ ] Workflow executes successfully
- [ ] Output is returned
- [ ] Claude presents results to user

#### Scenario 3: Async Workflow Execution

**User Action:** Ask Claude: "Run the long workflow with timeoutMs 60000"

**Expected Behavior:**
1. Claude calls `lucky_run_workflow` with timeoutMs > 30s
2. Receives invocation_id
3. Polls with `lucky_check_status`
4. Eventually receives completed output

**Verification:**
- [ ] Invocation_id returned
- [ ] Polling occurs automatically
- [ ] Final output received
- [ ] No timeout errors

#### Scenario 4: Input Validation Error

**User Action:** Ask Claude: "Run workflow with invalid input"

**Expected Behavior:**
1. Claude calls `lucky_run_workflow`
2. Receives validation error (-32002)
3. Error message explains what's wrong

**Verification:**
- [ ] Clear error message
- [ ] References inputSchema
- [ ] Claude can explain error to user

#### Scenario 5: Workflow Not Found

**User Action:** Ask Claude: "Run workflow wf_nonexistent"

**Expected Behavior:**
1. Claude calls `lucky_run_workflow`
2. Receives WORKFLOW_NOT_FOUND error (-32001)
3. Error message is clear

**Verification:**
- [ ] Clear error message
- [ ] Explains workflow not found
- [ ] Doesn't expose internal details

#### Scenario 6: Cancellation

**User Action:** Ask Claude: "Cancel the running workflow"

**Expected Behavior:**
1. Claude calls `lucky_cancel_workflow`
2. Receives cancellation confirmation
3. Status changes to cancelling/cancelled

**Verification:**
- [ ] Cancellation request succeeds
- [ ] State updates correctly
- [ ] Claude confirms to user

### Manual Testing Checklist

**Setup:**
- [ ] MCP server built successfully
- [ ] Web API running on localhost:3000
- [ ] Claude Desktop configured with API key
- [ ] Test workflow created in UI

**Basic Functionality:**
- [ ] MCP server shows in Claude Desktop
- [ ] All tools visible in tool list
- [ ] Authentication works (API key accepted)

**Tool Testing:**
- [ ] `lucky_list_workflows` works
- [ ] `lucky_run_workflow` (sync) works
- [ ] `lucky_run_workflow` (async) works
- [ ] `lucky_check_status` works
- [ ] `lucky_cancel_workflow` works (if implemented)

**Error Handling:**
- [ ] Invalid API key → clear error
- [ ] Workflow not found → clear error
- [ ] Invalid input → clear error with schema reference
- [ ] Timeout handling works

**User Experience:**
- [ ] Tool descriptions are helpful
- [ ] Error messages are user-friendly
- [ ] Claude can successfully use workflows
- [ ] No confusing error messages

---

## Phase 3 Checklist

### Unit Tests
- [ ] `GET /api/user/workflows` tests written and passing
- [ ] Workflow ID resolution tests written and passing
- [ ] `POST /api/workflow/cancel/:invocationId` tests written and passing
- [ ] Code coverage > 80%

### Integration Tests
- [ ] Integration test suite created
- [ ] Happy path test passing
- [ ] Async execution test passing
- [ ] Cancellation test passing
- [ ] Error handling tests passing

### Manual Testing
- [ ] MCP server configured in Claude Desktop
- [ ] All test scenarios executed
- [ ] All scenarios pass
- [ ] User experience is smooth

### Performance
- [ ] List workflows responds < 500ms
- [ ] Workflow execution performs as expected
- [ ] Status polling is efficient
- [ ] No memory leaks

### Documentation
- [ ] Testing documentation complete
- [ ] Known issues documented
- [ ] Setup instructions verified

---

## Success Criteria

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All manual test scenarios pass
- [ ] No blocking bugs
- [ ] Performance is acceptable
- [ ] User experience is smooth

---

## Next Steps

Once all tests pass, proceed to:
- **[Final Checklist](./final-checklist.md)** - Complete project and prepare for deployment

