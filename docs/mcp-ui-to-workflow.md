# Bridging the MCP Gap: UI → Execution (Context-Carried Toolkits)

Author: (Acting as a product+engineering owner)

Status: ✅ **IMPLEMENTED** - Context-based MCP toolkit bridge with database persistence

---

## Executive Summary

We’ll close the UI → Execution gap by carrying MCP “toolkits” (server + its tools) via the workflow Execution Context, not by writing files or maintaining a global registry.

- Add `mcp.toolkits` to the Execution Context. Each toolkit provides a transport (e.g., stdio) and optional pre‑fetched tool metadata.
- Tool initialization in the engine becomes context‑aware: `setupMCPForNode(...)` prefers the toolkit transports already present in context.
- Keep local‑dev behavior intact as a fallback: if no toolkits are present in context, we still read `mcp-secret.json` (or `MCP_SECRET_PATH`).

This aligns with how we already pass model keys and provider config through context, keeps boundaries clean, and scales well under multi-tenant concurrency.

---

## Implementation Status

✅ **Core Bridge (Complete)**
1. ✅ Runtime toolkits contract added (`packages/shared/src/contracts/mcp-runtime.ts`)
2. ✅ Execution context extended with `mcp.toolkits` field (`packages/core/src/context/executionContext.ts`)
3. ✅ Invoke route loads from database and passes to context (`apps/web/src/app/api/workflow/invoke/route.ts`)
4. ✅ Tools setup accepts and prioritizes context toolkits (`packages/tools/src/mcp/setup.ts`)
5. ✅ ToolManager passes context to MCP setup (`packages/core/src/node/toolManager.ts`)

✅ **Persistence Layer (Complete)**
6. ✅ API endpoints for MCP config persistence (`/api/mcp/config` GET/POST)
   - Storage in `mcp.user_server_configs` (stdio servers with `server_id = NULL`)
   - Zod validation for all inputs
   - Reliable database persistence (no localStorage dependency)
7. ✅ Client-side Zustand store (`apps/web/src/stores/mcp-config-store.ts`)
   - Auto-loads config from backend on mount
   - Auto-syncs changes to database
   - Error handling and loading states

🔄 **Pending (Future Work)**
- Unit tests for `setupMCPForNode` context-first resolution
- Integration tests for end-to-end MCP config flow
- UI integration: auto-save on MCP config changes
- Client cache cleanup after workflow completion

---

## The Gap (Grounded in Code)

- UI config is localStorage only
  - `apps/web/src/stores/mcp-config-store.ts` (key `mcp_servers_config`)
  - Editor: `apps/web/src/app/(protected)/connectors/mcp-servers.tsx`

- Execution expects a file on disk
  - `packages/core/src/node/toolManager.ts` → `setupMCPForNode(names, workflowVersionId, configPath)`
  - `packages/tools/src/mcp/setup.ts` → reads `mcp-secret.json` or `MCP_SECRET_PATH`

Result: UI never reaches runtime; runtime never sees UI.

---

## Goals and Non‑Goals

- Goals
  - Make UI‑configured MCP toolkits available to workflows by injecting transports into the Execution Context.
  - Support concurrent users safely and deterministically (no global shared state).
  - Preserve local‑dev (filesystem JSON) as a fallback path.

- Non‑Goals
  - Secrets management re‑design. For examples we will hardcode placeholders (e.g., `"GOOGLE_KEY": "anythingrandomthiswillbeignoredanyways"`). Lockbox binding is out‑of‑scope here.
  - Marketplace/approvals. This plan focuses on transport plumbing only.

---

## Proposed Architecture (Context-Carried Toolkits)

Principle: MCP state is a property of a workflow invocation. Carry the toolkit(s) in the Execution Context and let the tools layer consume them directly.

1) Extend Execution Context schema
   - File: `packages/core/src/context/executionContext.ts`
   - Extend `ZExecutionSchema` with an optional `mcp` object:
     ```ts
     mcp?: z.object({
       toolkits: z.record(
         z.object({
           // Option A (preferred): transport spec → created in tools layer
           transportSpec: z.object({ command: z.string(), args: z.array(z.string()), env: z.record(z.string()).optional() }).optional(),
           // Option B: prebuilt transport instance (stdio/ws/http)
           // Use z.custom here; instance is in‑memory only
           transport: z.custom<any>().optional(),
           // Optional: pre-fetched tools metadata for faster readiness
           tools: z.record(z.any()).optional(),
         })
       )
     }).optional()
     ```

2) Build toolkits at invocation time (Web → Core)
   - File: `apps/web/src/app/api/workflow/invoke/route.ts`
   - Steps:
     - Load the user's MCP config JSON from `mcp.user_server_configs` (where `server_id IS NULL`). Shape:
       ```json
       { "mcpServers": { "tavily": { "command": "npx", "args": ["-y", "tavily-mcp"], "env": { "TAVILY_API_KEY": "anythingrandomthiswillbeignoredanyways" } } } }
       ```
     - Convert to `toolkits` with `transportSpec` per entry (don't instantiate transports here unless we strongly want warm‑start).
     - Call `withExecutionContext({ principal, secrets, apiKeys, mcp: { toolkits } }, () => invokeWorkflow(...))`.

3) Initialize MCP clients from context in tools layer
   - File: `packages/tools/src/mcp/setup.ts`
   - Change: allow `setupMCPForNode(...)` to accept an options bag that includes either `contextToolkits` (map) or a `transportProvider(name) → transport | transportSpec`.
     - Flow:
       - If a context toolkit exists for `name`, create the MCP client from that transport/transportSpec and skip file/env lookup.
       - Else, fall back to current behavior: read `configPath` → env.
     - Maintain existing client cache behavior. Use `workflowVersionId` (or `workflowId`) for isolation.

4) Make ToolManager pass context to MCP setup
   - File: `packages/core/src/node/toolManager.ts`
   - Today MCP tools are initialized eagerly in `initializeTools()` before code tools. Two workable options:
     - Option A (cleanest): move MCP init to `getAllTools(toolExecutionContext)` so both code tools and MCP tools become context‑aware. Initialize MCP once per node upon first call.
     - Option B (low‑diff): keep eager init, but fetch `const ctx = getExecutionContext()?.get("mcp")` and pass `ctx?.toolkits` down to `setupMCPForNode` via an options bag.

Backwards compatibility
  - If `mcp.toolkits` is absent, `setupMCPForNode` uses the current `mcp-secret.json`/env flow unchanged.

---

## Why “Toolkit” Terminology

In the codebase we sometimes refer to an MCP server as a “toolkit” exposing one or more “tools.” This plan adopts that language:

- Toolkit: an MCP server binding (name, transport/transportSpec, optional pre-fetched `tools`).
- Tools: the callable tool definitions returned by `client.tools()` and consumed by the AI SDK.

This keeps our mental model aligned with runtime: servers (“toolkits”) deliver callable tool sets (“tools”).

---

## Golden Interfaces (Copy/Paste)

- New shared contract (summarized):
  - `ExecutionMCPContextSchema = z.object({ toolkits: MCPToolkitMapSchema })`
  - `MCPToolkit = { transport: { kind: "stdio", spec: { command: string, args: string[], env?: Record<string,string> } }, tools?: Record<string, unknown> }`
  - `MCPToolkitMap = Record<string, MCPToolkit>`

- tools setup signature:
  ```ts
  import type { MCPToolkitMap } from "@lucky/shared/contracts/mcp-runtime"
  export async function setupMCPForNode(
    toolNames: MCPToolName[] | null | undefined,
    workflowId: string,
    configPath?: string,
    opts?: { toolkits?: MCPToolkitMap },
  ): Promise<ToolSet>
  ```

- ToolManager call site (Option B):
  ```ts
  import { getExecutionContext } from "@core/context/executionContext"
  const ctx = getExecutionContext()?.get("mcp")
  const mcp = await setupMCPForNode(this.mcpToolNames, this.workflowVersionId, mcpConfigPath, {
    toolkits: ctx?.toolkits,
  })
  ```

- Invoke route mapping snippet:
  ```ts
  import type { MCPToolkitMap } from "@lucky/shared/contracts/mcp-runtime"
  // uiConfig: { mcpServers: Record<string, { command: string; args: string[]; env?: Record<string,string> }> }
  const toolkits: MCPToolkitMap = Object.fromEntries(
    Object.entries(uiConfig.mcpServers).map(([name, s]) => [
      name,
      {
        transport: { kind: "stdio", spec: { command: s.command, args: s.args, env: s.env ?? {} } },
      },
    ]),
  )

  const result = await withExecutionContext({ principal, secrets, apiKeys, mcp: { toolkits } }, async () =>
    invokeWorkflow({ ...input, abortSignal: controller.signal })
  )
  ```

---

## Precise Change List (Small, Surgical)

1) Core Execution Context
   - `packages/core/src/context/executionContext.ts`
     - Extend `ZExecutionSchema` and `ExecutionSchema` with optional `mcp.toolkits`.

2) Tools Setup
   - `packages/tools/src/mcp/setup.ts`
     - Add an options bag to `setupMCPForNode(toolNames, workflowVersionId, configPath?, opts?)` where `opts?.toolkits` is `Record<string, ToolkitCtx>`.
     - If `opts.toolkits[name]` exists, use its `transport` or `transportSpec` to create the MCP client; else fallback to file/env.

3) Tool Manager
   - `packages/core/src/node/toolManager.ts`
     - Option A: make MCP initialization context‑aware inside `getAllTools(toolExecutionContext)` and only run once per node.
     - Option B: keep eager init and look up `getExecutionContext()?.get("mcp")?.toolkits` to pass into `setupMCPForNode`.

4) Web API
   - `apps/web/src/app/api/workflow/invoke/route.ts`
     - Load per‑user MCP config JSON.
     - Convert to `toolkits` with `transportSpec` entries. For example env values, hardcode placeholders like `"GOOGLE_KEY": "anythingrandomthiswillbeignoredanyways"` where needed.
     - Supply `mcp: { toolkits }` to `withExecutionContext` around `invokeWorkflow(...)`.
     - No filesystem writes. No global mutable state.

---

## Failure Modes & Mitigations

- No user toolkits in context → fallback to file/env; structured warning shows remediation.
- Transport creation fails → keep surviving toolkits/tools; log which toolkit failed and why.
- Concurrency/isolation → context is per‑invocation; client cache remains keyed by workflow ID/version; no cross‑user bleed.

---

## Observability

- Counters: `mcp.context.toolkits_used`, `mcp.clients.started`, `mcp.clients.failed`, `mcp.tools.materialized`.
- Tags: `workflowVersionId`, `toolkit`, `tool`.
- Optional dev log: call `logMCPStatus()` after MCP init.

---

## Effort, Risk, and Reversibility

- Effort: 1–2 engineering days for MVP (including tests), plus 1 day for polish.
- Risk: Low. Additive, context‑scoped; falls back cleanly.
- Reversible: Remove the new `mcp` field from context and the options bag; behavior reverts to file/env path.

---

## Acceptance Criteria

- UI‑configured toolkits appear as available tools during execution without any `mcp-secret.json` present.
- Session‑auth invocations do not touch process.env or filesystem for MCP configuration.
- Local dev continues to work from `mcp-secret.json` when `mcp.toolkits` is not provided.
- Workflows referencing `TOOLS.mcp` names resolve to tool definitions via context‑carried toolkits.

---

## Test Plan

- Unit: tools/setup prefers `opts.toolkits` over file/env; falls back correctly.
- Integration: API invoke → `withExecutionContext({ mcp.toolkits })` → ToolManager → `setupMCPForNode` → `client.tools()` returns expected tools.
- Regression: local dev with only `mcp-secret.json` still initializes MCP tools.

---

## Pitfalls to Avoid (Read This Twice)

- Do not write `mcp-secret.json` during UI invocation. No filesystem writes.
- Do not stash user config in globals or singletons. Use Execution Context only.
- Do not fetch from `process.env` for session-auth users. Lockbox or context only.
- Do not construct transports in the browser. All transport creation is server-only.
- Do not import Node/server files into client routes/components.
- Do not change tool names. They must remain within `ACTIVE_MCP_TOOL_NAMES`.
- Do not remove existing file/env fallback in tools. Keep local-dev working.

---

## Validation Rules (Make Silent Failures Impossible)

- UI → mapping: ensure each server has `command: string` and `args: string[]`.
- Cap servers per invocation at a sane number (e.g., 16) and log a warning when exceeded.
- Normalize env values to strings; allow placeholders like `"GOOGLE_KEY": "anythingrandomthiswillbeignoredanyways"`.
- When `toolNames` includes an MCP name not present in `toolkits`, log: requested vs available.
- In `setupMCPForNode`, if a transport fails to start, remove its client from cache and include the name in `failedTools`.

---

## Developer Quick QA Scenarios

- No UI config stored → File/env fallback initializes tools.
- UI config present, session-auth → Tools start from context (no file/env access).
- Mixed success: one toolkit fails to spawn → Remaining toolkits still provide tools; warning printed.
- Repeated invocations with same `workflowVersionId` → Clients are reused; optional cleanup clears them.

---

## Definition of Done (Signer Checklist)

- ✅ Types compile: `bun run tsc` at repo root.
- ⏳ Smoke tests pass: `bun run test:smoke`.
- ⏳ Unit tests added for context-first `setupMCPForNode` and fallback path.
- ⏳ Manual run: UI-configured "tavily" appears and executes without `mcp-secret.json`.
- ✅ No file writes. No env leakage for session-auth. Logs show toolkit→tool resolution.

---

## Persistence Layer Architecture

### Storage
MCP configurations are stored in the dedicated MCP schema:
- **Table**: `mcp.user_server_configs`
- **Filter**: `server_id IS NULL` (stdio servers only, marketplace servers have `server_id NOT NULL`)
- **Format**: Each server is a row with `config_json` containing `{ command, args, env }`
- **RLS**: Row-level security enforces user isolation via `user_id = clerk_id`

### API Endpoints

**GET /api/mcp/config**
- Returns MCP configurations for authenticated user from `mcp.user_server_configs`
- Filters: `user_id = clerk_id`, `server_id IS NULL`, `enabled = true`
- Returns `{ mcpServers: {} }` if no configs exist
- Transforms rows to `{ mcpServers: { name: config_json } }` format

**POST /api/mcp/config**
- Body: `{ mcpServers: Record<string, MCPServerConfig> }`
- Validates with Zod schema: `command` (string), `args` (string[]), `env?` (Record<string, string>)
- Performs insert/update/delete operations to sync state
- Sets `server_id = NULL` and `secrets_json = {}` for stdio servers
- Returns: `{ success: true, inserted, updated, deleted }`

### Client-Side Store

**useMCPConfigStore (Zustand)**
```typescript
const { config, isSyncing, addServer, deleteServer, updateConfig, loadFromBackend } = useMCPConfigStore()
```

- **Auto-saves** to database on every change
- **No localStorage persist** - all state lives in database
- **Toast notifications** for save/load feedback
- **Error handling** with `lastSyncError` state

### Migration Path

1. **New implementation** (database-only):
   - All MCP servers stored in `mcp.user_server_configs` with `server_id = NULL`
   - Reliable persistence, survives localStorage clears
   - Prepared for future: can "un-nullify" `server_id` to require marketplace entries

2. **Separation of concerns**:
   - Stdio servers (user-defined): `server_id = NULL`
   - Marketplace servers (future): `server_id` references `mcp.servers`

### Security

- ✅ RLS policies enforce user_id isolation
- ✅ No file writes for session-auth users
- ✅ No environment variable leakage
- ✅ Check constraint: stdio configs must have `command` field
- ✅ Server-side validation with Zod
- ✅ Database-level constraints prevent data corruption

### Performance

- ✅ Single query per workflow invocation (cached in context)
- ✅ Indexed queries: `user_id, server_id, enabled`
- ✅ Client cache for MCP clients (keyed by workflowVersionId)
- ⏳ Optional cleanup: `clearWorkflowMCPClientCache()` after invocation

