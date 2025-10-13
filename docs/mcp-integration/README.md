# MCP Workflow Integration

**Status**: ✅ **Phase 1 & 2 Complete** | 🔄 Phase 3 Pending (Manual Testing)

## Overview

This documentation covers the integration of Lucky's workflow execution system with the MCP (Model Context Protocol) server, enabling users to discover, execute, and monitor workflows through MCP clients like Claude Desktop.

**Completion Date**: 2025-10-13

## Architecture

```
Claude Desktop (MCP Client)
    ↓ MCP JSON-RPC Protocol
Lucky MCP Server (packages/mcp-server)
    ↓ HTTP + Bearer Token Auth
Lucky Web API (apps/web/src/app/api)
    ↓ Principal Authentication
Workflow Execution Engine (packages/core)
    ↓ Database Persistence
Supabase (PostgreSQL + RLS)
```

## Design Principles

**1. Contract Alignment**
- Use `JsonRpcInvokeRequest` from `packages/shared/src/contracts/invoke.ts`
- Leverage `WorkflowConfig.inputSchema/outputSchema` for schema discovery
- Follow `InvokeOptions` (timeoutMs, trace) contract
- Use standardized `ErrorCodes` for error handling

**2. Schema-Driven Discovery**
- Workflows expose JSONSchema7 for inputs/outputs
- Enables Claude to understand what data to provide
- Runtime validation against schemas

**3. Dual Execution Modes**
- **Sync mode** (timeoutMs ≤ 30s): Returns output immediately
- **Async mode** (timeoutMs > 30s): Returns invocation_id for polling

**4. Simple, Stripe-like API**
- Clear, predictable endpoints
- Consistent error responses
- Bearer token authentication

## Documentation Structure

### Planning & Requirements
- **[Requirements](./requirements.md)** - Current state, gaps, and what needs to be built
- **[Design Decisions](./design-decisions.md)** - Critical architectural decisions with rationale
- **[Data Flow](./data-flow.md)** - Complete request lifecycle documentation

### Implementation Phases
- **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)** - ✅ **COMPLETED** - Backend API implementation (Actual: 3 hours)
- **[Phase 2: MCP Tools](./phase-2-mcp-tools.md)** - ✅ **COMPLETED** - MCP server tools implementation (Actual: 50 minutes)
- **[Phase 3: Testing](./phase-3-testing.md)** - 🔄 **PENDING** - Testing strategy and execution (1-2 hours)

### Tracking
- **[Final Checklist](./final-checklist.md)** - Overall project completion tracker

## MCP Tools Overview

| Tool | Purpose | Parameters |
|------|---------|------------|
| `lucky_list_workflows` | Discover available workflows | None |
| `lucky_run_workflow` | Execute workflow (sync/async) | `workflow_id`, `input`, `options?` |
| `lucky_check_status` | Poll execution progress | `invocation_id` |
| `lucky_cancel_workflow` | Cancel running workflow | `invocation_id` |

## API Endpoints Overview

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/user/workflows` | GET | ✅ **COMPLETE** | List user's workflows with schemas |
| `/api/v1/invoke` | POST | ✅ **COMPLETE** | Workflow execution with ID resolution |
| `/api/workflow/cancel/[invocationId]` | POST | ✅ **COMPLETE** | Cancel running workflow |
| `/api/workflow/status/[invocationId]` | GET | ✅ **COMPLETE** | Check execution status |
| `/api/workflow/version/[wf_version_id]` | GET | ✅ **COMPLETE** | Get workflow version config |

**Note**: All endpoints support dual authentication (API key + Clerk session)

## Getting Started

1. Read **[Requirements](./requirements.md)** to understand current state and gaps
2. Review **[Design Decisions](./design-decisions.md)** for architectural context
3. Follow implementation phases in order:
   - Start with **[Phase 1](./phase-1-api-endpoints.md)** (API endpoints)
   - Then **[Phase 2](./phase-2-mcp-tools.md)** (MCP tools)
   - Complete with **[Phase 3](./phase-3-testing.md)** (testing)
4. Track progress in **[Final Checklist](./final-checklist.md)**

## Key Files Reference

**Core Implementation:**
- `packages/core/src/workflow/runner/invokeWorkflow.ts` - Workflow execution engine
- `packages/shared/src/contracts/` - Type definitions and contracts

**API Layer:**
- `apps/web/src/app/api/v1/invoke/route.ts` - Invoke endpoint
- `apps/web/src/lib/auth/principal.ts` - Authentication system

**MCP Server:**
- `packages/mcp-server/src/index.ts` - MCP tools definition

## Environment Variables

**MCP Server:**
- `LUCKY_API_URL` - Lucky web API URL (default: `http://localhost:3000`)

**Web API:**
- Supabase connection (standard config)
- Redis connection (for distributed state)
- Clerk authentication keys

## Success Criteria

- [x] All API endpoints implemented and tested
- [x] All MCP tools implemented and tested
- [x] TypeScript compilation passing
- [x] Smoke tests passing
- [ ] Integration tests passing (pending Phase 3)
- [ ] Manual testing with Claude Desktop successful (pending user setup)
- [x] Documentation complete and accurate

## Implementation Summary

### Phase 1 (✅ Complete)
- Implemented 5 API endpoints with dual authentication
- Fixed workflow loader to support both `wf_*` and `wf_ver_*` IDs
- Added RLS-enforced user isolation
- **Time**: 3 hours

### Phase 2 (✅ Complete)
- Implemented 4 MCP workflow tools
- Fixed 7 critical bugs:
  - Non-unique JSON-RPC IDs → `randomUUID()`
  - No fetch timeout → 30s timeout with AbortController
  - Poor error handling → Clear error messages
  - Type safety issues → Proper interfaces
  - URL validation → Startup validation
- Removed 165 lines of unused code (web scraping tools)
- **Time**: 50 minutes

### Phase 3 (🔄 Pending)
- Manual testing with Claude Desktop
- End-to-end integration tests
- Load testing

## Next Steps

1. **For Users**: Configure Claude Desktop with MCP server (see Phase 2 docs)
2. **For Developers**: Proceed to **[Phase 3: Testing](./phase-3-testing.md)** for comprehensive testing
3. **For Production**: Deploy MCP server and configure with production API URL

