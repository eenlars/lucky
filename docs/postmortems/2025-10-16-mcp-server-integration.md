# What

We integrated Lucky workflows with Claude Desktop via the Model Context Protocol (MCP), enabling Claude to discover, invoke, monitor, and cancel workflows through 4 MCP tools. The MCP server (`packages/mcp-server`) uses FastMCP to expose these tools over stdio transport.

During manual testing with Claude Desktop, three critical issues prevented the integration from working:

1. **JSON-RPC Corruption**: Claude Desktop reported `Unexpected token 'F', "[FastMCP de"... is not valid JSON`
2. **Empty Tool Schemas**: Tools registered but weren't visible in Claude Desktop due to empty JSON schemas
3. **Server Crashes on Init**: MCP server exited immediately with `Either LUCKY_API_KEY or LUCKY_API_URL must be provided`

All three issues were rooted in assumptions about how FastMCP, Zod, and stdio transport interact during initialization and runtime.

### Hidden Assumptions

- FastMCP wouldn't output logs to stdout in stdio mode, but it does during initialization
- FastMCP v1.0.3 would work with Zod v4, but Zod v4 changed internal structure breaking schema conversion
- Environment variables would be available during server initialization, but in stdio mode they're passed via config at tool invocation time
- The `authenticate` callback should validate env vars on init, but in stdio mode it shouldn't block server startup

---

# Why

## Issue #1: JSON-RPC Corruption from Console Output

**Context**: MCP uses stdio transport where all stdout must be valid JSON-RPC messages. Any non-JSON output corrupts the protocol stream.

**Root Cause**: FastMCP library outputs initialization logs to stdout:
```
[FastMCP debug] Server starting...
```

These logs appeared before the JSON-RPC handshake, causing Claude Desktop's parser to fail with `Unexpected token 'F'`.

**Why it happened**:
- FastMCP's default logger writes to `console.log`
- In stdio mode, `console.log` goes to stdout
- stdout is shared with JSON-RPC messages
- No FastMCP config option to disable initialization logs

**Solution**: Suppress console output in stdio mode before FastMCP initialization:
```typescript
if (process.env.CLOUD_SERVICE !== "true" && process.env.SSE_LOCAL !== "true" && process.env.HTTP_STREAMABLE_SERVER !== "true") {
  const noop = () => {}
  console.log = noop
  console.info = noop
  console.warn = noop
  console.debug = noop
  // Keep console.error for critical errors
}
```

## Issue #2: Empty JSON Schemas - Tools Not Visible

**Context**: FastMCP converts Zod schemas to JSON Schema for MCP tool registration. Claude Desktop uses these schemas to discover and display tools.

**Root Cause**: FastMCP v1.0.3 is incompatible with Zod v4's internal structure changes.

**What happened**:
1. Tools registered successfully: `tools/list` returned 4 tools
2. But schemas were empty: `{"$schema":"http://json-schema.org/draft-07/schema#"}`
3. No `properties` or `required` fields
4. Claude Desktop filtered out tools with incomplete schemas

**Why it happened**:
- Zod v4 changed internal property names (removed `.vendor`, changed `._def` structure)
- FastMCP v1.0.3's schema converter relied on Zod v3 internals
- Conversion silently failed, returning only the `$schema` field
- No error or warning - tools appeared to register correctly

**Investigation path**:
1. Attempted Zod v3 downgrade → FastMCP v1.27.7 (hoisted) expects Zod v4 (`.vendor` error)
2. Attempted manual `zodToJsonSchema` → FastMCP types don't support `inputSchema` override
3. Solution: Upgraded FastMCP to v3.20.0 which properly supports Zod v4

**Result**: Schemas now include full JSON Schema 2020-12 format:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "workflow_id": {"type": "string"},
    "input": {}
  },
  "required": ["workflow_id", "input"],
  "additionalProperties": false
}
```

## Issue #3: Server Crashes on Initialization

**Context**: The MCP server's `authenticate` callback runs during FastMCP initialization to set up session data.

**Root Cause**: The callback called `process.exit(1)` when `LUCKY_API_URL` wasn't found in `process.env`, but in stdio mode env vars are passed via Claude Desktop config and aren't available until tool invocation.

**What happened**:
```typescript
authenticate: async (request) => {
  if (!process.env.LUCKY_API_KEY && !process.env.LUCKY_API_URL) {
    console.error("Either LUCKY_API_KEY or LUCKY_API_URL must be provided")
    process.exit(1)  // ❌ Kills server before tools can be invoked
  }
  return { luckyApiKey: process.env.LUCKY_API_KEY }
}
```

**Why it happened**:
- The authenticate callback is synchronous and runs during `new FastMCP()` construction
- In stdio mode, env vars from `claude_desktop_config.json` aren't in `process.env` during init
- They're passed via the MCP protocol at tool invocation time
- The exit killed the server before it could receive the handshake

**Solution**: Remove the env check from authenticate for non-cloud mode:
```typescript
authenticate: async (request) => {
  if (process.env.CLOUD_SERVICE === "true") {
    // Cloud mode: validate API key in headers
    const apiKey = extractApiKey(request.headers)
    if (!apiKey) throw new Error("Lucky API key is required")
    return { luckyApiKey: apiKey }
  }
  // Self-hosted/stdio: env vars checked at tool invocation time
  return { luckyApiKey: process.env.LUCKY_API_KEY }
}
```

---

# How We Fixed It

## Changes Made

**File**: `packages/mcp-server/src/index.ts`

1. **Console Suppression** (lines 10-18):
   - Added noop functions for console.log/info/warn/debug in stdio mode
   - Preserves console.error for critical errors
   - Runs before FastMCP initialization

2. **FastMCP Upgrade** (`package.json`):
   - `fastmcp`: `^1.0.3` → `^3.20.0`
   - `zod`: `^3.23.8` → `^4.1.12`

3. **Authenticate Fix** (lines 61-75):
   - Removed `process.exit(1)` call
   - Removed env var validation on init
   - Cloud mode still validates API keys in headers
   - Self-hosted mode defers validation to tool invocation

**New File**: `packages/mcp-server/test-mcp-tools.sh`
- Test script for verifying tool registration
- Checks JSON-RPC initialize and tools/list
- Validates schema completeness

## Verification

**Automated**:
```bash
cd packages/mcp-server && ./test-mcp-tools.sh
# ✓ Initialize: server info returned
# ✓ Tools list: 4 tools with complete schemas
```

**Manual** (Claude Desktop):
1. Server connects without JSON-RPC errors
2. Hammer icon shows "lucky" connected
3. All 4 tools visible and callable:
   - `lucky_list_workflows`
   - `lucky_run_workflow`
   - `lucky_check_status`
   - `lucky_cancel_workflow`

---

# Lessons Learned

## Architectural Insights

1. **Stdio Transport is Fragile**:
   - All stdout must be valid JSON-RPC
   - Libraries that log to stdout break the protocol
   - No room for debug output or warnings
   - Error messages must go to stderr

2. **Dependency Version Coupling**:
   - FastMCP's hoisted version (v1.27.7) conflicted with declared version (v1.0.3)
   - Zod v4 breaking changes weren't documented in FastMCP v1.x
   - Schema conversion failures are silent (no errors, just empty schemas)
   - Need explicit version alignment testing

3. **Initialization vs. Runtime Context**:
   - Callbacks that run during initialization can't access runtime config
   - In stdio mode, env vars arrive via protocol, not `process.env`
   - Validation must be deferred to request time
   - Early exits prevent protocol handshake

## Prevention Strategies

1. **Always suppress console output in stdio mode** - Make it the first line of any stdio MCP server
2. **Test tool discovery explicitly** - Don't assume registration == visibility
3. **Verify schema completeness** - Check for `properties` and `required` fields, not just `$schema`
4. **Never call process.exit in callbacks** - Return errors instead
5. **Add integration tests for stdio transport** - Catch protocol violations early

## Questions for Future Work

- Should we add a FastMCP wrapper that automatically suppresses stdio output?
- Can we detect Zod/FastMCP version mismatches at build time?
- Should authenticate callbacks be optional for non-cloud deployments?
- Do we need a standard test suite for all MCP server deployments?

---

# Timeline

**2025-10-16 13:00**: User reports JSON-RPC error in Claude Desktop logs
**2025-10-16 13:15**: Issue #1 identified (console output), fix applied
**2025-10-16 13:30**: Server connects but tools not visible
**2025-10-16 13:45**: Issue #2 identified (empty schemas), Zod v4 incompatibility discovered
**2025-10-16 14:00**: Attempted Zod v3 downgrade, discovered FastMCP version mismatch
**2025-10-16 14:15**: Upgraded FastMCP to v3.20.0, schemas now complete
**2025-10-16 14:30**: Server crashes on startup
**2025-10-16 14:45**: Issue #3 identified (process.exit in authenticate), fix applied
**2025-10-16 15:00**: All tests passing, manual verification in Claude Desktop successful

**Total time**: 2 hours
**Commits**: 4 (3 fixes + 1 documentation)

---

# Impact

**Severity**: Critical (P0) - MCP integration completely non-functional

**Blast radius**:
- MCP server unusable in Claude Desktop (primary use case)
- Tools not discoverable or callable
- No workflows could be invoked via Claude

**Users affected**: All users attempting to use Lucky workflows with Claude Desktop

**Mitigation**: None available until fixes deployed (no workarounds possible)

---

# Related Issues

- MCP Protocol Spec: https://modelcontextprotocol.io/docs/concepts/transports#stdio
- FastMCP Zod v4 Support: https://github.com/punkpeye/fastmcp (no explicit docs on Zod v4)
- Zod v4 Breaking Changes: https://github.com/colinhacks/zod/releases/tag/v4.0.0

---

# Commits

- `7b3c0278` - fix(mcp): upgrade FastMCP to v3.20.0 for Zod v4 compatibility
- `77d24607` - fix(mcp): remove process.exit in authenticate for stdio mode
- `f7810963` - docs(mcp): document authenticate process.exit fix in completion report
- `9bfeb006` - docs(mcp): add final status summary to Phase 3 completion report
