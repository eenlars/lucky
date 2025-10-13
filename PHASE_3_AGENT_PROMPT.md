# Phase 3 Agent: Comprehensive Testing & Deployment Readiness

**Status**: 🚀 Ready to Start
**Priority**: HIGH - Blocking Phase 2 PR #199 merge
**Estimated Time**: 1-2 hours
**Complexity**: Medium (manual testing + automated tests)

---

## 🎯 Mission Overview

You are the **Phase 3 Testing Agent**. Your mission is to ensure the MCP (Model Context Protocol) workflow integration is production-ready through comprehensive testing. Phase 1 (API endpoints) and Phase 2 (MCP tools) are **already complete** and awaiting your validation.

**What You'll Do:**
1. Fix critical TypeScript errors blocking CI/CD
2. Write and execute unit tests for new API endpoints
3. Write and execute integration tests for full workflows
4. Perform manual testing with Claude Desktop (if user provides access)
5. Document all findings and mark Phase 3 complete

**Success Criteria:**
- ✅ All TypeScript errors resolved
- ✅ Unit tests written and passing (80%+ coverage)
- ✅ Integration tests written and passing
- ✅ Manual testing checklist complete (where possible)
- ✅ Zero critical bugs discovered
- ✅ Phase 3 documentation updated

---

## 📚 Critical Context: What Was Built

### Phase 1: API Endpoints (✅ Complete - Oct 13, 2025)
**PR #194** merged to main, implemented **5 new API endpoints**:

1. **`GET /api/user/workflows`**
   - **File**: `apps/web/src/app/api/user/workflows/route.ts`
   - **Purpose**: List all workflows for authenticated user with JSONSchema7 schemas
   - **Auth**: Dual (API key + Clerk session)
   - **RLS**: Enforced - users only see their own workflows
   - **Response**: Array of workflows with `workflow_id`, `name`, `description`, `inputSchema`, `outputSchema`, `created_at`

2. **`POST /api/v1/invoke`**
   - **File**: `apps/web/src/app/api/v1/invoke/route.ts`
   - **Purpose**: Execute workflow via JSON-RPC 2.0 protocol
   - **Auth**: Dual (API key + Clerk session)
   - **Modes**: Sync (≤30s) returns output, Async (>30s) returns invocation_id
   - **ID Resolution**: Supports both `wf_*` (workflow) and `wf_ver_*` (version) IDs
   - **Error Codes**: -32001 (not found), -32002 (validation), -32003 (execution), -32004 (timeout)

3. **`POST /api/workflow/cancel/[invocationId]`**
   - **File**: `apps/web/src/app/api/workflow/cancel/[invocationId]/route.ts`
   - **Purpose**: Cancel running workflow execution
   - **Auth**: Dual (API key + Clerk session)
   - **Mechanism**: Redis pub/sub + AbortController
   - **Response**: `{ state: "cancelling", invocationId, cancelRequestedAt }`

4. **`GET /api/workflow/status/[invocationId]`**
   - **File**: `apps/web/src/app/api/workflow/status/[invocationId]/route.ts`
   - **Purpose**: Check workflow execution status
   - **Auth**: Dual (API key + Clerk session) - **Fixed in PR #195**
   - **States**: running, completed, failed, cancelled, cancelling, not_found

5. **`GET /api/workflow/version/[wf_version_id]`**
   - **File**: `apps/web/src/app/api/workflow/version/[wf_version_id]/route.ts`
   - **Purpose**: Retrieve specific workflow version configuration
   - **Auth**: Dual (API key + Clerk session) - **Fixed in PR #195**

**Critical Bug Fixes (Phase 1)**:
- ✅ **Redis connection leak** - Fixed const reassignment in `apps/web/src/app/api/workflow/invoke/route.ts:41` (commit 55786910)
- ✅ **Missing API key auth** - Added to status/version endpoints (PR #195, commit f2cb9f85)

---

### Phase 2: MCP Tools (✅ Complete - Oct 13, 2025)
**PR #199** on branch `api-schema` (awaiting merge), implemented **4 MCP tools**:

**File**: `packages/mcp-server/src/index.ts` (465 lines, down from 581)

1. **`lucky_list_workflows`** (lines 105-180)
   - **Parameters**: None
   - **Auth**: Requires `luckyApiKey` in MCP session
   - **Returns**: Array of workflows with full metadata
   - **Usage**: Claude Desktop discovery of available workflows

2. **`lucky_run_workflow`** (lines 182-296)
   - **Parameters**: `workflow_id`, `input`, `options` (timeoutMs, trace)
   - **Auth**: Requires `luckyApiKey`
   - **JSON-RPC**: Constructs JSON-RPC 2.0 request with `randomUUID()` for unique IDs
   - **Modes**: Sync (≤30s) or async (>30s with invocation_id polling)
   - **Error Handling**: Maps JSON-RPC error codes to user-friendly messages

3. **`lucky_check_status`** (lines 298-372)
   - **Parameters**: `invocation_id`
   - **Auth**: Requires `luckyApiKey`
   - **Returns**: Current execution state + output (if completed)
   - **Usage**: Polling for async workflow completion

4. **`lucky_cancel_workflow`** (lines 374-437)
   - **Parameters**: `invocation_id`
   - **Auth**: Requires `luckyApiKey`
   - **Returns**: Cancellation confirmation
   - **Usage**: Graceful workflow termination

**Critical Bug Fixes (Phase 2)** - 7 total applied:
1. ✅ **Non-unique JSON-RPC IDs** - `Date.now()` → `crypto.randomUUID()` (prevents collisions)
2. ✅ **Infinite fetch hangs** - Added 30s timeout with AbortController
3. ✅ **Nested error messages** - Removed redundant catch-and-rewrap
4. ✅ **Poor JSON parsing errors** - Added try/catch with clear messages
5. ✅ **Type safety issues** - Created `RunWorkflowOptions` interface
6. ✅ **URL validation missing** - Added `getApiUrl()` startup validator
7. ✅ **Code cleanup** - Removed 165 lines of unused web scraping tools

**Helper Functions Added**:
- `fetchWithTimeout(url, options, timeoutMs=30000)` - Prevents infinite hangs
- `getApiUrl()` - Validates `LUCKY_API_URL` environment variable

---

## 🔥 CRITICAL ISSUE: TypeScript Errors Blocking CI

### The Problem
**GitHub Actions are failing** on PR #199 with TypeScript errors in the MCP server's `prepare` script. The CI runs `tsc` during `bun install`, which has **stricter type checking** than our local biome linter.

**Error Location**: `packages/mcp-server/src/index.ts`

**Errors** (4 instances):
```typescript
// We fixed the biome linter error (implicit any) by adding `: unknown`
let rpcResponse: unknown
try {
  rpcResponse = await response.json()
} catch { ... }

// BUT TypeScript strict mode won't allow property access on `unknown` types
if (rpcResponse.error) { ... }  // ❌ TS18046: 'rpcResponse' is of type 'unknown'
const message = rpcResponse.error.message  // ❌ Can't access .error on unknown
```

**Lines with errors**:
- Line 280: `if (rpcResponse.error) {`
- Line 288: `errorMessages[rpcResponse.error.code]`
- Line 288: `rpcResponse.error.message`
- Line 292: `return asText(rpcResponse.result)`

**Same pattern occurs 3 more times**:
- Lines 363-370 (`status: unknown`)
- Lines 428-435 (`result: unknown`)
- Lines 171-178 (`workflows: unknown`)

### The Solution (YOU MUST IMPLEMENT THIS FIRST)

**Replace the pattern everywhere**:

```typescript
// ❌ CURRENT (causes TS18046 errors):
let rpcResponse: unknown
try {
  rpcResponse = await response.json()
} catch {
  throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
}

if (rpcResponse.error) {  // ❌ TypeScript error
  // ...
}

// ✅ CORRECT (type narrowing with interface):
interface JsonRpcResponse {
  jsonrpc?: string
  id?: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

let rpcResponse: JsonRpcResponse
try {
  rpcResponse = await response.json() as JsonRpcResponse
} catch {
  throw new Error(`Backend returned invalid JSON response (status ${response.status})`)
}

if (rpcResponse.error) {  // ✅ TypeScript happy
  // Now rpcResponse.error is properly typed
}
```

**Apply this pattern to ALL 4 occurrences**:
1. Line 274-292: `rpcResponse` in `lucky_run_workflow`
2. Line 363-370: `status` in `lucky_check_status`
3. Line 428-435: `result` in `lucky_cancel_workflow`
4. Line 171-178: `workflows` in `lucky_list_workflows`

**Interfaces to create** (add near top of file, after imports):
```typescript
interface JsonRpcResponse {
  jsonrpc?: string
  id?: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface WorkflowListResponse {
  workflow_id: string
  name: string
  description?: string
  inputSchema?: unknown
  outputSchema?: unknown
  created_at: string
}

interface StatusResponse {
  state: string
  invocationId: string
  createdAt?: string
  output?: unknown
  error?: unknown
}

interface CancelResponse {
  state: string
  invocationId: string
  cancelRequestedAt?: string
}
```

**After fixing, verify**:
```bash
cd packages/mcp-server
bun run build  # Should complete without TS errors
```

---

## 📂 Repository Structure (Key Files Only)

```
.
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   └── api/
│       │   │       ├── user/
│       │   │       │   └── workflows/
│       │   │       │       └── route.ts          ← GET /api/user/workflows
│       │   │       ├── v1/
│       │   │       │   └── invoke/
│       │   │       │       └── route.ts          ← POST /api/v1/invoke
│       │   │       └── workflow/
│       │   │           ├── cancel/
│       │   │           │   └── [invocationId]/
│       │   │           │       └── route.ts      ← POST /api/workflow/cancel/:id
│       │   │           ├── status/
│       │   │           │   └── [invocationId]/
│       │   │           │       └── route.ts      ← GET /api/workflow/status/:id
│       │   │           └── version/
│       │   │               └── [wf_version_id]/
│       │   │                   └── route.ts      ← GET /api/workflow/version/:id
│       │   └── lib/
│       │       ├── auth/
│       │       │   └── principal.ts              ← Dual auth system
│       │       └── mcp-invoke/
│       │           └── workflow-loader.ts        ← Workflow ID resolution
│       └── package.json
│
├── packages/
│   ├── mcp-server/
│   │   ├── src/
│   │   │   └── index.ts                          ← 4 MCP tools (465 lines)
│   │   ├── dist/
│   │   │   └── index.js                          ← Built executable
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/
│   │   └── src/
│   │       └── workflow/
│   │           └── runner/
│   │               └── invokeWorkflow.ts         ← Workflow execution engine
│   │
│   └── shared/
│       └── src/
│           └── contracts/
│               ├── invoke.ts                     ← JSON-RPC types
│               ├── workflow.ts                   ← Workflow config types
│               └── runtime.ts                    ← Runtime config types
│
├── docs/
│   └── mcp-integration/
│       ├── README.md                             ← Project overview
│       ├── phase-1-api-endpoints.md              ← Phase 1 details
│       ├── phase-2-mcp-tools.md                  ← Phase 2 details
│       ├── phase-3-testing.md                    ← THIS IS YOUR GUIDE
│       └── final-checklist.md                    ← Completion tracker
│
├── tests/
│   └── e2e-essential/
│       ├── smoke/                                ← Fast smoke tests
│       └── gate/                                 ← Full gate tests
│
├── .github/
│   └── workflows/
│       └── tests-badge.yml                       ← DISABLED (line 14: if: false)
│
└── turbo.json                                    ← Monorepo build config
```

---

## 🧪 Phase 3: Testing Strategy

### Part 1: Fix TypeScript Errors (HIGHEST PRIORITY)
⏱️ **Time**: 15 minutes

**Tasks**:
1. ✅ Add type interfaces to `packages/mcp-server/src/index.ts`
2. ✅ Replace all `unknown` variables with properly typed interfaces
3. ✅ Run `cd packages/mcp-server && bun run build` - must pass
4. ✅ Run `bun run tsc` from root - must pass
5. ✅ Commit fix to `api-schema` branch
6. ✅ Push and verify CI passes

**Commit Message Template**:
```
fix(mcp): resolve TypeScript errors with proper type narrowing

Fixes TS18046 errors by adding type interfaces for JSON responses
instead of using `unknown` type. This allows property access without
type assertion while maintaining type safety.

Changes:
- Add JsonRpcResponse interface for JSON-RPC responses
- Add WorkflowListResponse, StatusResponse, CancelResponse interfaces
- Replace `let x: unknown` with proper interface types
- Apply type narrowing pattern to all 4 tools

Verification:
- TypeScript compilation: ✅
- MCP server build: ✅
- All type errors resolved: ✅

Fixes CI failures in PR #199.
```

---

### Part 2: Unit Tests (API Endpoints)
⏱️ **Time**: 30-45 minutes

**Goal**: Test each API endpoint in isolation with mocked dependencies.

#### Test File 1: `apps/web/src/app/api/user/workflows/route.test.ts`

**What to test**:
- ✅ Returns user's workflows with schemas
- ✅ Sorts by created_at descending
- ✅ Returns latest version's schemas
- ✅ Returns 401 without authentication
- ✅ Returns 401 with invalid API key
- ✅ Enforces RLS (users can't see each other's workflows)
- ✅ Returns empty array when user has no workflows

**Test utilities needed** (may need to create):
```typescript
// apps/web/src/test/factories.ts
export async function createTestUser() {
  // Create user with API key in test database
}

export async function createTestWorkflow(options: {
  clerk_id: string
  name?: string
  description?: string
  inputSchema?: JSONSchema7
  outputSchema?: JSONSchema7
}) {
  // Create workflow in test database
}

export async function createWorkflowVersion(workflow, options) {
  // Create new version for workflow
}
```

**Example test structure**:
```typescript
import { GET } from "./route"
import { createTestUser, createTestWorkflow } from "@/test/factories"

describe("GET /api/user/workflows", () => {
  beforeEach(async () => {
    // Clean test database
  })

  it("returns user's workflows with schemas", async () => {
    const user = await createTestUser()
    const workflow = await createTestWorkflow({
      clerk_id: user.clerk_id,
      name: "Test Workflow"
    })

    const req = new Request("http://localhost/api/user/workflows", {
      headers: { Authorization: `Bearer ${user.apiKey}` }
    })

    const response = await GET(req)
    expect(response.status).toBe(200)

    const workflows = await response.json()
    expect(workflows).toHaveLength(1)
    expect(workflows[0]).toMatchObject({
      workflow_id: workflow.wf_id,
      name: "Test Workflow",
      inputSchema: expect.any(Object),
      outputSchema: expect.any(Object)
    })
  })

  // ... more tests (see docs/mcp-integration/phase-3-testing.md lines 46-161)
})
```

#### Test File 2: `apps/web/src/lib/mcp-invoke/workflow-loader.test.ts`

**What to test**:
- ✅ Loads workflow by version ID (`wf_ver_*`)
- ✅ Loads workflow by workflow ID (`wf_*`) - returns latest version
- ✅ Throws error for non-existent workflow ID
- ✅ Throws error for non-existent version ID
- ✅ Respects RLS (can't load other user's workflow)

**See full test code**: `docs/mcp-integration/phase-3-testing.md` lines 164-224

#### Test File 3: `apps/web/src/app/api/workflow/cancel/[invocationId]/route.test.ts`

**What to test**:
- ✅ Cancels running workflow
- ✅ Returns 404 for non-existent invocation
- ✅ Returns 401 without authentication
- ✅ Updates state to "cancelling"
- ✅ Publishes to Redis for distributed cancellation

**See full test code**: `docs/mcp-integration/phase-3-testing.md` lines 227-287

**Unit Test Completion Checklist**:
- [ ] All 3 test files created
- [ ] Test factories/utilities created (if needed)
- [ ] All tests pass: `bun run test`
- [ ] Code coverage > 80% for new code: `bun run test --coverage`
- [ ] Tests run in < 10 seconds

---

### Part 3: Integration Tests (Full Flow)
⏱️ **Time**: 30-45 minutes

**Goal**: Test the complete flow from MCP tool → API endpoint → workflow execution.

**Test File**: `tests/integration/mcp-workflow-integration.test.ts`

**Test Scenarios**:

1. **Happy Path: List → Run → Complete**
   - List workflows via `GET /api/user/workflows`
   - Run workflow via `POST /api/v1/invoke` (sync mode)
   - Verify output received immediately
   - **Time**: < 30 seconds total

2. **Async Execution with Polling**
   - Start workflow via `POST /api/v1/invoke` (timeoutMs > 30000)
   - Receive invocation_id
   - Poll status via `GET /api/workflow/status/:id`
   - Verify eventual completion
   - **Time**: 30-60 seconds

3. **Cancellation Flow**
   - Start long-running workflow
   - Cancel via `POST /api/workflow/cancel/:id`
   - Verify state changes to "cancelling" or "cancelled"
   - **Time**: < 10 seconds

4. **Error Handling**
   - Test WORKFLOW_NOT_FOUND (-32001) with invalid workflow_id
   - Test INPUT_VALIDATION_FAILED (-32002) with invalid input
   - Verify clear error messages

**See full test code**: `docs/mcp-integration/phase-3-testing.md` lines 300-556

**Integration Test Setup**:
```typescript
// Test environment requirements
beforeAll(async () => {
  // Start test database (Supabase local or test instance)
  // Start Redis for cancellation pub/sub
  // Start web server on test port
})

afterAll(async () => {
  // Clean up test data
  // Stop services
})
```

**Integration Test Completion Checklist**:
- [ ] Test file created
- [ ] Test database configured
- [ ] Redis configured (or mocked)
- [ ] All 4 test scenarios pass
- [ ] Tests run in < 2 minutes total
- [ ] No flaky tests (run 3 times to verify)

---

### Part 4: Manual Testing (Claude Desktop)
⏱️ **Time**: 30 minutes (if user provides access)

**Note**: This requires Claude Desktop setup and may not be feasible without user involvement. **Document what you attempted** even if you can't complete it.

#### Setup Instructions (for user):

1. **Build MCP Server**:
   ```bash
   cd packages/mcp-server
   bun run build
   ```

2. **Start Web API**:
   ```bash
   cd apps/web
   bun run dev  # Runs on localhost:3000
   ```

3. **Configure Claude Desktop**:

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "lucky": {
         "command": "node",
         "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
         "env": {
           "LUCKY_API_URL": "http://localhost:3000"
         },
         "session": {
           "luckyApiKey": "sk_test_YOUR_API_KEY_HERE"
         }
       }
     }
   }
   ```

4. **Get API Key**:
   - Log into Lucky web UI (localhost:3000)
   - Navigate to Settings → API Keys
   - Create new API key with name "Claude Desktop Test"
   - Copy key to MCP config

#### Test Scenarios (Claude Desktop):

**Scenario 1: Workflow Discovery**
- Ask Claude: "List my Lucky workflows"
- **Expected**: Claude calls `lucky_list_workflows`, shows workflows with schemas
- **Verify**: Only user's workflows shown, schemas included

**Scenario 2: Sync Execution**
- Ask Claude: "Run the [workflow_name] workflow with input {message: 'test'}"
- **Expected**: Claude calls `lucky_run_workflow`, returns output immediately
- **Verify**: Workflow executes, output returned, no errors

**Scenario 3: Async Execution**
- Ask Claude: "Run workflow with timeoutMs 60000"
- **Expected**: Claude gets invocation_id, polls with `lucky_check_status`
- **Verify**: Polling occurs, eventual completion, output received

**Scenario 4: Input Validation Error**
- Ask Claude: "Run workflow with invalid input"
- **Expected**: Receives -32002 error with clear message
- **Verify**: Error references inputSchema, explains what's wrong

**Scenario 5: Workflow Not Found**
- Ask Claude: "Run workflow wf_nonexistent"
- **Expected**: Receives -32001 error
- **Verify**: Clear error message, no internal details exposed

**Scenario 6: Cancellation**
- Ask Claude: "Start workflow then cancel it"
- **Expected**: Claude calls `lucky_cancel_workflow`, confirms cancellation
- **Verify**: State changes to cancelling/cancelled

**Manual Testing Completion Checklist**:
- [ ] MCP server built successfully
- [ ] Web API running on localhost:3000
- [ ] Claude Desktop configured
- [ ] API key created and added to config
- [ ] All 4 MCP tools visible in Claude Desktop
- [ ] Scenarios 1-6 executed (document results)
- [ ] Screenshots captured (if possible)
- [ ] Any issues documented in `docs/mcp-integration/manual-testing-results.md`

**If you cannot complete manual testing**:
- ✅ Document setup instructions clearly
- ✅ Create checklist for user to complete
- ✅ Note that manual testing is **pending user setup**
- ✅ Provide troubleshooting guide for common issues

---

## 🐛 Known Issues & Gotchas

### Issue 1: TypeScript Errors (CRITICAL - YOU MUST FIX)
**Location**: `packages/mcp-server/src/index.ts:280, 288, 292` (and 3 more locations)
**Error**: `TS18046: 'rpcResponse' is of type 'unknown'`
**Impact**: Blocks CI, prevents PR merge
**Fix**: Add type interfaces and use type narrowing (see "Critical Issue" section above)

### Issue 2: GitHub Actions Disabled
**Location**: `.github/workflows/tests-badge.yml:14`
**Status**: Disabled with `if: false`
**Reason**: Was failing due to TypeScript errors
**Action**: After fixing TS errors, re-enable by removing `if: false` line

### Issue 3: Mock Persistence Required for Tests
**Environment Variable**: `USE_MOCK_PERSISTENCE=true`
**Why**: Tests should not require Supabase connection
**Usage**: Set in test environment or use `--env-file .env.test`

### Issue 4: Redis Required for Cancellation Tests
**Dependency**: Redis pub/sub for distributed cancellation
**Options**:
- Use `ioredis-mock` for unit tests
- Use real Redis for integration tests
- Mock the `subscribeToCancellation` function

### Issue 5: Workflow Execution in Tests
**Challenge**: Real workflow execution takes time
**Solution**: Create minimal test workflows that complete instantly
**Example**: Simple pass-through workflow that echoes input

---

## 🚀 Step-by-Step Execution Plan

### Step 1: Fix TypeScript Errors (15 min)
```bash
# 1. Add type interfaces to packages/mcp-server/src/index.ts
# 2. Replace all `unknown` variables with typed interfaces
# 3. Build and verify
cd packages/mcp-server
bun run build

# 4. Run TypeScript check from root
cd ../..
bun run tsc

# 5. Commit and push
git add packages/mcp-server/src/index.ts
git commit -m "fix(mcp): resolve TypeScript errors with proper type narrowing"
git push
```

### Step 2: Write Unit Tests (30-45 min)
```bash
# 1. Create test utilities
touch apps/web/src/test/factories.ts

# 2. Write test files
touch apps/web/src/app/api/user/workflows/route.test.ts
touch apps/web/src/lib/mcp-invoke/workflow-loader.test.ts
touch apps/web/src/app/api/workflow/cancel/[invocationId]/route.test.ts

# 3. Run tests
bun run test

# 4. Check coverage
bun run test --coverage

# 5. Commit
git add -A
git commit -m "test(api): add unit tests for MCP API endpoints"
git push
```

### Step 3: Write Integration Tests (30-45 min)
```bash
# 1. Create integration test file
mkdir -p tests/integration
touch tests/integration/mcp-workflow-integration.test.ts

# 2. Set up test environment
# - Configure test database
# - Configure Redis (or mock)

# 3. Run integration tests
bun run test:integration

# 4. Commit
git add tests/integration/
git commit -m "test(mcp): add end-to-end integration tests"
git push
```

### Step 4: Manual Testing (30 min, if possible)
```bash
# 1. Build MCP server
cd packages/mcp-server
bun run build

# 2. Start web server (separate terminal)
cd ../../apps/web
bun run dev

# 3. Configure Claude Desktop (user must do this)
# - Edit ~/Library/Application Support/Claude/claude_desktop_config.json
# - Add Lucky MCP server configuration
# - Add API key from web UI

# 4. Test in Claude Desktop
# - Execute test scenarios 1-6
# - Document results

# 5. Create manual testing report
touch docs/mcp-integration/manual-testing-results.md
git add docs/mcp-integration/manual-testing-results.md
git commit -m "docs(mcp): add manual testing results"
git push
```

### Step 5: Update Documentation (10 min)
```bash
# 1. Mark Phase 3 complete in docs
# - Update docs/mcp-integration/README.md
# - Update docs/mcp-integration/final-checklist.md
# - Update docs/mcp-integration/phase-3-testing.md

# 2. Commit documentation
git add docs/mcp-integration/
git commit -m "docs(mcp): mark Phase 3 complete"
git push
```

### Step 6: Final Verification (5 min)
```bash
# 1. Run full test suite
bun run tsc
bun run test
bun run test:smoke

# 2. Verify CI passes on GitHub
# - Check PR #199 status
# - Ensure all checks green

# 3. Request PR review
# - Add comment summarizing Phase 3 completion
# - Tag relevant reviewers
```

---

## 📋 Deliverables Checklist

### Code Changes
- [ ] TypeScript errors fixed in `packages/mcp-server/src/index.ts`
- [ ] Type interfaces added for all response types
- [ ] All code compiles without errors

### Unit Tests
- [ ] `apps/web/src/app/api/user/workflows/route.test.ts` created and passing
- [ ] `apps/web/src/lib/mcp-invoke/workflow-loader.test.ts` created and passing
- [ ] `apps/web/src/app/api/workflow/cancel/[invocationId]/route.test.ts` created and passing
- [ ] Test utilities/factories created
- [ ] Code coverage > 80%

### Integration Tests
- [ ] `tests/integration/mcp-workflow-integration.test.ts` created and passing
- [ ] All 4 test scenarios complete (happy path, async, cancellation, errors)
- [ ] Tests run reliably (not flaky)

### Manual Testing
- [ ] Setup instructions documented
- [ ] Test scenarios executed (or documented as pending)
- [ ] Results documented in `docs/mcp-integration/manual-testing-results.md`
- [ ] Screenshots/screen recordings captured (if possible)

### Documentation
- [ ] `docs/mcp-integration/README.md` updated
- [ ] `docs/mcp-integration/phase-3-testing.md` marked complete
- [ ] `docs/mcp-integration/final-checklist.md` updated
- [ ] Any issues/blockers documented

### Git & CI
- [ ] All commits follow conventional commit format
- [ ] All commits pushed to `api-schema` branch
- [ ] CI/CD passes on GitHub
- [ ] PR #199 ready for review

---

## 🎓 Key Concepts & Architecture

### Dual Authentication System
**File**: `apps/web/src/lib/auth/principal.ts`

Lucky supports **two authentication methods**:
1. **API Key** (Bearer token in Authorization header) - Used by MCP server
2. **Clerk Session** (Cookie-based) - Used by web UI

Both methods are checked in parallel. User is authenticated if **either** succeeds.

```typescript
// Example: API endpoint checks both
const principal = await resolvePrincipal(request)
if (!principal) {
  return new Response("Unauthorized", { status: 401 })
}
```

### Row-Level Security (RLS)
**Database**: Supabase PostgreSQL

All workflow queries are **automatically filtered** by Supabase RLS policies to ensure users only see their own data. No manual filtering needed in code.

```sql
-- Supabase RLS policy (for reference)
CREATE POLICY "Users can only see their own workflows"
ON workflows
FOR SELECT
USING (clerk_id = auth.uid());
```

### Workflow ID Resolution
**File**: `apps/web/src/lib/mcp-invoke/workflow-loader.ts`

Lucky supports two ID formats:
- `wf_*` - Workflow ID (loads **latest version**)
- `wf_ver_*` - Version ID (loads **specific version**)

The `loadWorkflowConfig()` function handles both formats automatically.

### JSON-RPC 2.0 Protocol
**Contract**: `packages/shared/src/contracts/invoke.ts`

The `/api/v1/invoke` endpoint uses JSON-RPC 2.0:
```json
{
  "jsonrpc": "2.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "method": "workflow.invoke",
  "params": {
    "workflow_id": "wf_abc123",
    "input": { "message": "Hello" },
    "options": { "timeoutMs": 30000 }
  }
}
```

**Error Codes**:
- `-32001` - Workflow not found
- `-32002` - Input validation failed
- `-32003` - Workflow execution failed
- `-32004` - Timeout exceeded

### Sync vs Async Execution
**Threshold**: 30 seconds

- **timeoutMs ≤ 30000**: Sync mode - blocks until completion, returns output
- **timeoutMs > 30000**: Async mode - returns invocation_id immediately, poll for status

---

## 📞 Communication Protocol

### Progress Updates
Report progress after each major milestone:
- ✅ "TypeScript errors fixed, CI now passing"
- ✅ "Unit tests complete: 12/12 passing, 85% coverage"
- ✅ "Integration tests complete: 4/4 passing"
- ✅ "Manual testing pending user setup"

### Blocker Reporting
If you encounter blockers, report immediately:
- 🚫 "BLOCKED: Cannot access Supabase test database"
- 🚫 "BLOCKED: Missing test utilities, need guidance"
- 🚫 "BLOCKED: Redis connection failing in CI"

### Decision Points
Ask for guidance when needed:
- ❓ "Should I mock Redis or use real instance for tests?"
- ❓ "Should I create test workflows via UI or factories?"
- ❓ "Manual testing requires Claude Desktop access - skip for now?"

---

## 🏆 Success Metrics

### Must Have (Blocking)
- ✅ Zero TypeScript errors
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ CI/CD passing on GitHub
- ✅ Code coverage > 80%

### Should Have (Important)
- ✅ Manual testing checklist complete (or well-documented as pending)
- ✅ All documentation updated
- ✅ Zero critical bugs discovered
- ✅ Phase 3 marked complete

### Nice to Have (Optional)
- ✅ Screenshots of Claude Desktop integration
- ✅ Performance benchmarks (API response times)
- ✅ Load testing for concurrent executions
- ✅ GitHub Actions re-enabled

---

## 🔗 Key References

**Documentation**:
- Phase 3 Testing Guide: `docs/mcp-integration/phase-3-testing.md`
- Final Checklist: `docs/mcp-integration/final-checklist.md`
- Project README: `docs/mcp-integration/README.md`

**Phase 2 PR** (awaiting merge):
- PR #199: https://github.com/eenlars/lucky/pull/199
- Branch: `api-schema`
- Status: CI failing due to TypeScript errors

**Commits to Review**:
- `55786910` - fix(api): Redis connection leak
- `e531612c` - feat(mcp): Phase 2 workflow tools
- `433a5d2f` - docs(mcp): Phase 2 completion
- `9f579781` - ci: disable tests-badge workflow

**Related PRs**:
- PR #194 (merged) - Phase 1 API endpoints
- PR #195 (merged) - API key auth fix

---

## 🎯 Your First Action

**START HERE**:
1. Read this entire document (you're doing it! ✅)
2. Review `docs/mcp-integration/phase-3-testing.md` for detailed test specs
3. Fix TypeScript errors in `packages/mcp-server/src/index.ts` (15 min)
4. Verify CI passes after pushing fix
5. Begin writing unit tests

**Time Estimate**: 1-2 hours total
**Difficulty**: Medium
**Impact**: HIGH - Unblocks Phase 2 PR merge

---

## 📝 Notes

- **CI is currently disabled** (`.github/workflows/tests-badge.yml:14`) - re-enable after fixing TS errors
- **Redis leak was already fixed** in commit 55786910 (don't re-fix)
- **PR #199 is ready except for TypeScript errors** - fix those first
- **Manual testing may require user involvement** - document thoroughly if you can't complete it
- **Test utilities may not exist yet** - create them as needed
- **Use mock persistence** (`USE_MOCK_PERSISTENCE=true`) for unit tests

---

## 🚨 Critical Reminders

1. **FIX TYPESCRIPT ERRORS FIRST** - Everything else is blocked on this
2. **Don't commit as "Claude"** - Use original committer identity
3. **Follow conventional commits** - `feat(scope):`, `fix(scope):`, `test(scope):`
4. **Run tests locally before pushing** - Don't break CI
5. **Document everything** - Future developers need to understand your work
6. **Ask for help if stuck** - Don't waste time spinning

---

## 🎬 Ready to Start?

You have everything you need:
- ✅ Complete context of what was built
- ✅ Clear list of what needs testing
- ✅ Detailed instructions for each test type
- ✅ Known issues documented
- ✅ Step-by-step execution plan
- ✅ Success criteria defined

**Your mission begins now.** Fix those TypeScript errors, write comprehensive tests, and get Phase 3 to completion. The entire MCP integration project is counting on you! 🚀

---

**Last Updated**: 2025-10-13
**Branch**: `api-schema`
**Phase**: 3 (Testing & Validation)
**Status**: 🟡 Blocked on TypeScript errors (YOU FIX THIS!)
**Next Agent**: Phase 4 (Deployment) - starts after your completion
