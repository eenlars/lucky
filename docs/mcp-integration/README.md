# MCP Workflow Integration

## Overview

This documentation covers the integration of Lucky's workflow execution system with the MCP (Model Context Protocol) server, enabling users to discover, execute, and monitor workflows through MCP clients like Claude Desktop.

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
- **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)** - Backend API implementation (2-3 hours)
- **[Phase 2: MCP Tools](./phase-2-mcp-tools.md)** - MCP server tools implementation (2-3 hours)
- **[Phase 3: Testing](./phase-3-testing.md)** - Testing strategy and execution (1-2 hours)

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
| `/api/user/workflows` | GET | **NEW** | List user's workflows with schemas |
| `/api/v1/invoke` | POST | **UPDATE** | Add workflow_id resolution |
| `/api/workflow/cancel/:invocation_id` | POST | **NEW** | Cancel running workflow |
| `/api/workflow/status/:invocation_id` | GET | **EXISTS** | Check execution status |

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

- [ ] All API endpoints implemented and tested
- [ ] All MCP tools implemented and tested
- [ ] Integration tests passing
- [ ] Manual testing with Claude Desktop successful
- [ ] Documentation complete and accurate

## Next Steps

Start with **[Phase 1: API Endpoints](./phase-1-api-endpoints.md)** to build the backend foundation.

