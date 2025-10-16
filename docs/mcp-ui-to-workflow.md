# Bridging the MCP Gap: UI → Execution (Context-Carried Toolkits)

Author: (Acting as a product+engineering owner)

Status: Revised proposal. Scope is minimal, multi‑tenant safe, and reversible.

---

## Executive Summary

We’ll close the UI → Execution gap by carrying MCP “toolkits” (server + its tools) via the workflow Execution Context, not by writing files or maintaining a global registry.

- Add `mcp.toolkits` to the Execution Context. Each toolkit provides a transport (e.g., stdio) and optional pre‑fetched tool metadata.
- Tool initialization in the engine becomes context‑aware: `setupMCPForNode(...)` prefers the toolkit transports already present in context.
- Keep local‑dev behavior intact as a fallback: if no toolkits are present in context, we still read `mcp-secret.json` (or `MCP_SECRET_PATH`).

This aligns with how we already pass model keys and provider config through context, keeps boundaries clean, and scales well under multi-tenant concurrency.

---

## Implementation Checklist (Do This Exactly)

Follow these precise steps in order. Do not improvise. Keep diffs small and isolated.

1) Add the runtime “toolkits” contract (shared)
- File: `packages/shared/src/contracts/mcp-runtime.ts`
- Add Zod schemas and types for runtime MCP toolkits and transport specs (stdio now; ws/http reserved).
- Export from `packages/shared/src/index.ts`.

2) Extend Execution Context (core)
- File: `packages/core/src/context/executionContext.ts`
- Extend `ZExecutionSchema` with optional `mcp` field typed as `ExecutionMCPContext` from the new contract.
- Do not change existing fields or behavior.

3) Map UI config → toolkits in invoke route (web)
- File: `apps/web/src/app/api/workflow/invoke/route.ts`
- After `principal` and secrets resolution (before `invokeWorkflow`):
  - Load user MCP config JSON (lockbox or temporary store).
  - Transform `{ mcpServers: { [name]: { command, args, env? } } }` → `toolkits: MCPToolkitMap` with `transport: { kind: "stdio", spec }`.
  - Call `withExecutionContext({ ..., mcp: { toolkits } }, () => invokeWorkflow(...))`.
- Use placeholder env (e.g., `"GOOGLE_KEY": "anythingrandomthiswillbeignoredanyways"`) as needed.

4) Prefer context toolkits in tools setup (tools)
- File: `packages/tools/src/mcp/setup.ts`
- Update signature to accept options bag:
  - `export async function setupMCPForNode(toolNames, workflowId, configPath?, opts?: { toolkits?: MCPToolkitMap }): Promise<ToolSet>`
- Resolution order inside `setupMCPForNode`:
  1. If `opts?.toolkits` has an entry for the requested name → build transport and client from it.
  2. Else if `configPath` → read as today.
  3. Else if `process.env.MCP_SECRET_PATH` → read as today.
- Keep client cache behavior; key by `workflowId` (use `workflowVersionId` value supplied by ToolManager).

5) Pass context toolkits from ToolManager (core)
- File: `packages/core/src/node/toolManager.ts`
- Low-diff Option B (recommended): keep eager MCP init in `initializeTools()` and pass `opts.toolkits` down.
  - Retrieve context: `const ctx = getExecutionContext()?.get("mcp")` (import from `@core/context/executionContext`).
  - Call: `setupMCPForNode(this.mcpToolNames, this.workflowVersionId, mcpConfigPath, { toolkits: ctx?.toolkits })`.

6) Cleanup (optional but recommended)
- In `invoke` route, after success/error, call `clearWorkflowMCPClientCache(workflowVersionId)` to avoid idle MCP client buildup.

7) Tests and verification
- Run `bun run tsc` (no type errors) and smoke tests.
- Add unit tests for `setupMCPForNode`: context-first, fallback path, mixed success/failure.

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
     - Load the user’s MCP config JSON (lockbox or dedicated storage). Shape:
       ```json
       { "mcpServers": { "tavily": { "command": "npx", "args": ["-y", "tavily-mcp"], "env": { "TAVILY_API_KEY": "anythingrandomthiswillbeignoredanyways" } } } }
       ```
     - Convert to `toolkits` with `transportSpec` per entry (don’t instantiate transports here unless we strongly want warm‑start).
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

- Types compile: `bun run tsc` at repo root.
- Smoke tests pass: `bun run test:smoke`.
- Unit tests added for context-first `setupMCPForNode` and fallback path.
- Manual run: UI-configured “tavily” appears and executes without `mcp-secret.json`.
- No file writes. No env leakage for session-auth. Logs show toolkit→tool resolution.

