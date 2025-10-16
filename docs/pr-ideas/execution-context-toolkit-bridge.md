# Execution Context Toolkit Bridge

## Problem

Toolkits configured via UI are stored in `mcp.user_server_configs` but never loaded during workflow execution. The execution layer looks for `mcp-secret.json` (file-based config), ignoring database entirely. This causes all UI-configured toolkits to fail at runtime:

```
⚠️  MCP Configuration Missing
📁 Expected location: /apps/examples/mcp-secret.json
🔍 Requested: 'filesystem'
❌ Failed tools: filesystem
🚫 No MCP tools are available
```

Users configure toolkits in the UI, save successfully to database, then watch workflows fail because the execution context doesn't know about them. The two systems are completely disconnected.

## Root Cause

1. `/api/workflow/invoke` loads user secrets and principal, but skips toolkit configs
2. `withExecutionContext()` doesn't accept toolkit parameter
3. `setupMCPForNode()` hardcodes `MCP_SECRET_PATH` env var lookup, never checks execution context
4. No fallback logic exists—file missing means total failure

The execution context exists specifically to pass runtime configuration, but toolkits were never wired through it.

## Solution

Load toolkit configs from database before workflow execution and pass them via execution context. Modify tool setup to check context first, fall back to file for local dev.

### Database Query (in `/api/workflow/invoke`)

```typescript
const { data: toolkitConfigs } = await supabase
  .schema("mcp")
  .from("user_server_configs")
  .select("name, config_json")
  .eq("user_id", clerkId)
  .eq("enabled", true)
  .is("server_id", null) // stdio servers only

const toolkits = await Promise.all(
  toolkitConfigs.map(async (cfg) => {
    const client = await createMCPClient(cfg.config_json) // this function already exists (experimental_....)
    return { name: cfg.name, client }
  })
)
```

### Context Extension

Update `ExecutionContext` interface to include toolkits:

```typescript
interface ExecutionContext {
  principal: Principal
  secrets: SecretResolver
  toolkits?: Array<{ name: string; client: MCPClientTypeNoIdeaWhatTheTypeIs }>
}
```

Pass to workflow in every file where the workflow is invoked WITH tools:

```typescript
await withExecutionContext({ principal, secrets, toolkits }, async () => {
  await workflow.run(input)
})
```

### Tool Setup Modification (in `packages/tools/src/mcp/setup.ts`)

```typescript
export async function setupMCPForNode(toolNames: string[]): Promise<Tool[]> {
  const ctx = getExecutionContext()

  // Try context first (database configs)
  if (ctx?.toolkits) {
    return loadFromContext(ctx.toolkits, toolNames)
  }

  // Fallback to file (local dev)
  const filePath = process.env.MCP_SECRET_PATH
  if (filePath && fs.existsSync(filePath)) {
    return loadFromFile(filePath, toolNames)
  }

  throw new Error("No toolkit configs found in ctx or file")
}
```

## Impact

- Toolkit configs from UI work immediately in workflows
- No more file path hardcoding
- Backward compatible—local dev still uses `mcp-secret.json` if present
- Execution context serves its intended purpose (runtime config injection)
- Error messages become actionable (missing config vs missing file)

## Testing

1. Configure `filesystem` toolkit via UI
2. Create workflow using `filesystem` tool
3. Run workflow
4. Verify: no "mcp-secret.json missing" error
5. Verify: tool executes successfully
6. Check logs for "Using context toolkits" message
7. Test local dev: verify file-based fallback still works when `MCP_SECRET_PATH` is set

## Checklist

- Search codebase for existing context-based toolkit loading
- Review execution context flow in `/api/workflow/invoke`
- Update `ExecutionContext` type in `packages/shared/src/types`
- Modify `/api/workflow/invoke/route.ts` to load toolkits from database
- Create `createMCPClient(config)` helper if it doesn't exist
- Update `withExecutionContext()` signature to accept toolkits parameter
- Modify `setupMCPForNode()` to check `getExecutionContext()?.toolkits` first
- Implement `loadFromContext(toolkits, toolNames)` function
- Keep `loadFromFile()` for backward compatibility
- Add error handling for toolkit spawn failures
- Add logging for context vs file source (debug visibility)
- Write unit test for context-based toolkit loading
- Write unit test for file-based fallback
- Write integration test: UI config → workflow execution end-to-end
- Update documentation to reflect execution context bridge
- Verify no breaking changes to local dev workflow

Start by looking into the /docs section and the readme (these can be somewhat outdated, do not rely on them), checking if this plan is not bullshit. Do a thorough check if this hasnt already been implemented somewhere. Start by making a plan. Do not touch any code yet. You must be 100% sure you know the codebase well. Always remember that minimal code is better than 1000s lines of code. Write code like Patrick Collison, and check and verify yourself as if you're Elon Musk but do not mention any of these names anywhere. You must also never mention you are Claude Code. If you find anything strange in the PR idea, you can ask questions.
