# Server Tool Introspection & Discovery

## Problem

Users see server names in the UI ("filesystem", "tavily"), not the individual tools each server exposes. When building workflows, they can't select `filesystem.read_file` or `tavily.search`—they can only select "filesystem" as a monolithic block. This breaks the mental model and makes tool selection opaque.

The root issue: tool lists are hardcoded in `packages/shared/src/contracts/tools.ts`. Adding a new server requires code changes instead of configuration. MCP servers expose tool manifests via protocol, but we never introspect them. Custom toolkits (user-defined tool collections) have a registry, so this also needs to be implemented, preferably the same way.

This is like showing "npm" as a single command instead of `npm install`, `npm run`, `npm test`.

## Architecture

The existing schema distinguishes between:

1. **Marketplace servers**: Published MCP servers (`mcp.servers`) with tools stored in `mcp.tools` (linked via `sver_id`)
2. **User-configured stdio servers**: In `mcp.user_server_configs` where `server_id IS NULL`
3. **Custom toolkits**: Not yet supported

Current gap: Marketplace servers have tools in `mcp.tools`, but stdio/custom servers have no tool storage. We need discovery and caching for user-configured servers without disrupting marketplace architecture.

## Solution

Add tool introspection for user-configured servers (stdio and custom) while preserving marketplace server tooling.

### Database Schema Changes

**Add config type to user_server_configs**

```sql
ALTER TABLE mcp.user_server_configs
ADD COLUMN config_type TEXT NOT NULL DEFAULT 'mcp_stdio'
CHECK (config_type IN ('mcp_stdio', 'mcp_marketplace', 'custom'));

COMMENT ON COLUMN mcp.user_server_configs.config_type IS
  'mcp_stdio: user stdio server (server_id IS NULL), mcp_marketplace: marketplace instance (server_id IS NOT NULL), custom: custom toolkit (server_id IS NULL)';
```

**Create user server tools table**

```sql
CREATE TABLE mcp.user_server_tools (
  utool_id TEXT NOT NULL DEFAULT gen_prefixed_id('utool'),
  usco_id TEXT NOT NULL REFERENCES mcp.user_server_configs(usco_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  input_schema_json JSONB NOT NULL
    CHECK (
      jsonb_typeof(input_schema_json) = 'object' AND
      (input_schema_json->>'type') = 'object'
    ),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_server_tools_pkey PRIMARY KEY (utool_id),
  CONSTRAINT user_server_tools_unique UNIQUE (usco_id, name)
);

CREATE INDEX idx_user_server_tools_usco_id ON mcp.user_server_tools(usco_id);
CREATE INDEX idx_user_server_tools_active ON mcp.user_server_tools(usco_id, is_active);

COMMENT ON TABLE mcp.user_server_tools IS
  'Discovered tools from user-configured stdio and custom servers. Marketplace server tools remain in mcp.tools.';
```

This keeps marketplace tools in `mcp.tools` (linked to `sver_id`) and user server tools in `mcp.user_server_tools` (linked to `usco_id`). Clean separation.

### Introspection Module

**New file: `packages/tools/src/server/introspection.ts`**

```typescript
interface ToolManifest {
  name: string
  title?: string
  description?: string
  inputSchema: Record<string, unknown>
}

async function introspectMCPServer(
  config: { command: string; args: string[]; env?: Record<string, string> }
): Promise<ToolManifest[]> {
  // Spawn stdio server (timeout: 10s)
  // Send MCP initialize request
  // Send MCP tools/list request
  // Parse response, validate schemas
  // Return manifests
  // Error handling: spawn failures, protocol errors, timeouts
}

async function introspectCustomToolkit(
  config: {
    tools: Array<{
      name: string
      title?: string
      description?: string
      inputSchema: unknown
      execute: string // function reference or code
    }>
  }
): Promise<ToolManifest[]> {
  // Validate tool definitions from config
  // Return manifests
}

export async function introspectUserServerConfig(
  configType: 'mcp_stdio' | 'custom',
  configJson: Record<string, unknown>
): Promise<ToolManifest[]> {
  if (configType === 'mcp_stdio') {
    return introspectMCPServer(configJson as any)
  } else if (configType === 'custom') {
    return introspectCustomToolkit(configJson as any)
  }
  throw new Error(`Unsupported config type: ${configType}`)
}
```

### API Endpoints

**POST /api/mcp/config/introspect**

Request: `{ uscoId: string }`

Response: `{ tools: ToolManifest[] }`

Flow:
1. Validate `uscoId` belongs to authenticated user
2. Load config from `mcp.user_server_configs`
3. Call `introspectUserServerConfig(config_type, config_json)`
4. Delete old tools for this `usco_id` from `mcp.user_server_tools`
5. Insert new tools
6. Return tool manifests

**GET /api/mcp/config/tools**

Query: `?uscoId=usco_xxx` (optional - defaults to all user's servers)

Response: `{ tools: Record<string, ToolManifest[]> }` (grouped by server name)

Flow:
1. Query `mcp.user_server_tools` joined with `mcp.user_server_configs`
2. Filter by `uscoId` if provided
3. Check cache age (if >1 hour, trigger re-introspection)
4. Return tools grouped by server config name

**POST /api/mcp/config** (existing - update)

Add support for `config_type` field:
- Default: `'mcp_stdio'` if `server_id IS NULL`
- Validate config based on type
- Trigger background introspection after save
- Return `usco_id` in response

### Custom Toolkit Config Format

Custom toolkits are stored in `mcp.user_server_configs` with `config_type = 'custom'` and `server_id IS NULL`.

**config_json structure:**

```json
{
  "tools": [
    {
      "name": "my_custom_tool",
      "title": "My Custom Tool",
      "description": "Does something useful",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param1": { "type": "string", "description": "Parameter 1" }
        },
        "required": ["param1"]
      },
      "execute": "function_reference_or_code"
    }
  ]
}
```

No separate registry—introspection reads directly from `config_json`.

### UI Changes

**Update: `apps/web/src/app/components/agent-detail/tools-section.tsx`**

- Remove hardcoded `ACTIVE_MCP_TOOL_NAMES` import
- Fetch from `/api/mcp/config/tools` on mount
- Group by server config name (collapsible sections: "filesystem", "my-custom-toolkit")
- Show loading/error states during introspection
- Add "Refresh Tools" button for manual cache invalidation

**Update: `/connectors` page** (existing MCP servers page)

- Add `config_type` dropdown when adding server (mcp_stdio, custom)
- Show introspected tools in expandable sections under each server config
- Add "Introspect" button per server to trigger discovery
- For custom toolkits: JSON editor for tool definitions with validation

**Update: `apps/web/src/stores/mcp-config-store.ts`**

- Add `introspectServer(uscoId: string)` action
- Add `tools: Record<string, ToolManifest[]>` state (keyed by usco_id)
- Load tools from `/api/mcp/config/tools`
- Silent load on mount, toast only on manual introspection

### Execution Integration

No changes needed—PR #1 (Execution Context Bridge) already handles loading servers from `mcp.user_server_configs` and passing them via execution context. This PR only adds discovery and UI visibility.

Pre-execution validation:
- For stdio/custom servers: check tools exist in `mcp.user_server_tools`
- For marketplace servers: check tools exist in `mcp.tools` (existing behavior)
- Fail fast with error: "Tool 'filesystem.read_file' not found in server 'filesystem'. Re-introspect server or remove tool."

## Impact

- Users see granular tools (`filesystem.read_file`) instead of server names
- Adding new stdio servers requires zero code changes
- Custom toolkits enable user-defined tool collections (1+ tools per toolkit)
- Tool metadata (schemas, descriptions) available during workflow building
- Cached discovery avoids repeated spawning (performance)
- Workflows fail fast if tools missing (validation at build time, not runtime)
- Fits cleanly into existing schema (no conflicts with marketplace server architecture)

## Testing

1. Configure `filesystem` stdio server via UI (saves to `mcp.user_server_configs` with `config_type='mcp_stdio'`)
2. Call `POST /api/mcp/config/introspect` with `uscoId`
3. Verify tools saved to `mcp.user_server_tools` (read_file, write_file, list_directory, etc.)
4. Open workflow builder
5. Verify tool selector shows individual filesystem tools grouped under "filesystem"
6. Create custom toolkit with 2 tools (`config_type='custom'`)
7. Introspect, verify both tools appear in `mcp.user_server_tools`
8. Select tools from both stdio and custom servers in workflow
9. Run workflow, verify both types execute correctly
10. Change server config, verify cache invalidates and re-introspection triggers
11. Verify marketplace server tools still work (from `mcp.tools`, unaffected by this PR)

## Checklist

- Review `/docs` and README for existing introspection code
- Search codebase for `tools/list`, `introspect`, `discover` patterns
- Read MCP protocol spec for `initialize` and `tools/list` messages
- Verify `mcp.tools` table structure (stays for marketplace servers only)
- Create migration to add `config_type` column to `mcp.user_server_configs`
  - Set default: `'mcp_stdio'` for existing rows where `server_id IS NULL`
  - Set `'mcp_marketplace'` for existing rows where `server_id IS NOT NULL`
  - Add CHECK constraint
- Create migration for `mcp.user_server_tools` table
  - Primary key: `utool_id`
  - Foreign key to `mcp.user_server_configs.usco_id` with CASCADE delete
  - Unique constraint on `(usco_id, name)`
  - Indexes on `usco_id` and `(usco_id, is_active)`
- Add RLS policies to `mcp.user_server_tools`
  - Users can only SELECT their own tools (via user_id join)
  - Service role has full access
- Implement `introspectMCPServer()` in `packages/tools/src/server/introspection.ts`
  - Spawn stdio server with 10s timeout
  - Send MCP initialize request with client info
  - Send MCP tools/list request
  - Parse response, validate tool schemas
  - Return typed `ToolManifest[]`
  - Error handling: spawn failures, protocol errors, timeouts, malformed responses
- Implement `introspectCustomToolkit()` in same file
  - Validate tool definitions from `config_json.tools`
  - Check inputSchema is valid JSON schema
  - Return `ToolManifest[]`
- Implement `introspectUserServerConfig()` wrapper
  - Dispatches to correct introspection function based on `config_type`
  - Returns unified `ToolManifest[]`
- Create `POST /api/mcp/config/introspect` in `apps/web/src/app/api/mcp/config/introspect/route.ts`
  - Auth: validate `uscoId` belongs to authenticated user (via RLS)
  - Load `config_type` and `config_json` from `mcp.user_server_configs`
  - Call `introspectUserServerConfig()`
  - Delete old tools: `DELETE FROM mcp.user_server_tools WHERE usco_id = $1`
  - Insert new tools: batch insert with `discovered_at = now()`
  - Return tool manifests with 200 status
  - Error handling: return 404 if config not found, 500 if introspection fails
- Create `GET /api/mcp/config/tools` in `apps/web/src/app/api/mcp/config/tools/route.ts`
  - Query: join `mcp.user_server_tools` with `mcp.user_server_configs`
  - Filter: by `uscoId` if provided, otherwise all user's configs
  - Select: `name, title, description, input_schema_json, discovered_at, server_name`
  - Cache check: if `discovered_at` older than 1 hour, trigger re-introspection
  - Group by server config name
  - Return: `{ tools: Record<string, ToolManifest[]>, cached: boolean }`
- Update existing `POST /api/mcp/config` route
  - Accept `config_type` field in request body
  - Validate: `config_type` matches server type (stdio vs marketplace vs custom)
  - Default: `'mcp_stdio'` if `server_id IS NULL`, `'mcp_marketplace'` if not
  - After save: trigger background introspection (fire-and-forget)
  - Return: `usco_id` in response
- Update `apps/web/src/app/components/agent-detail/tools-section.tsx`
  - Remove hardcoded `ACTIVE_MCP_TOOL_NAMES` from `@lucky/tools/client`
  - Add `useEffect` to fetch from `/api/mcp/config/tools` on mount
  - Render tools grouped by server config name (collapsible sections)
  - Show loading spinner during fetch
  - Show error message if fetch fails
  - Add "Refresh Tools" button that calls `/api/mcp/config/introspect` for each server
- Update `apps/web/src/stores/mcp-config-store.ts`
  - Add `introspectServer(uscoId: string): Promise<void>` action
  - Add `tools: Record<string, ToolManifest[]>` state (keyed by server name)
  - Add `loadTools(): Promise<void>` action
  - Call `/api/mcp/config/tools` and update state
  - Silent load on mount (no toast)
  - Toast on manual introspection (success/error)
- Update `/connectors` page (`apps/web/src/app/(protected)/connectors/page.tsx`)
  - Add `config_type` selector when adding new server (dropdown: mcp_stdio, custom)
  - For custom configs: show JSON editor for `tools` array
  - Show introspected tools under each server config (expandable accordion)
  - Add "Introspect" button per server (calls `/api/mcp/config/introspect`)
  - Show introspection status (pending, success, error)
- Update `packages/shared/src/types/mcp.types.ts`
  - Add `config_type` field to `user_server_configs` Row/Insert/Update types
  - Add types for `mcp.user_server_tools` table (Row, Insert, Update)
  - Add `ToolManifest` interface
  - Regenerate types: `cd packages/shared && bun run generate`
- Add pre-execution validation to workflow runner
  - Before executing node with tools, check tool availability
  - For stdio/custom servers: query `mcp.user_server_tools`
  - For marketplace servers: query `mcp.tools` (existing)
  - If tool missing: fail fast with error message including server name
  - Error format: "Tool 'X' not found in server 'Y'. Re-introspect or remove tool."
- Write unit tests for `introspectMCPServer()`
  - Mock stdio spawn and MCP protocol responses
  - Test cases: valid server, invalid command, timeout, malformed tools/list response, missing schemas
  - Verify error handling for each case
- Write unit tests for `introspectCustomToolkit()`
  - Test cases: valid config, invalid inputSchema, missing required fields, malformed JSON
  - Verify validation logic
- Write integration test for introspection API
  - Setup: configure stdio server and custom toolkit in test database
  - Test: call `/api/mcp/config/introspect` for both
  - Verify: tools saved to `mcp.user_server_tools` with correct structure
  - Test: call `/api/mcp/config/tools`
  - Verify: returns grouped tools, cache flag accurate
  - Test: change config, re-introspect, verify cache invalidation
- Write E2E test for UI flow
  - Navigate to `/connectors`
  - Add stdio server (filesystem) via UI
  - Add custom toolkit via UI (2 tools)
  - Trigger introspection for both
  - Navigate to workflow builder
  - Open tool selector
  - Verify: filesystem tools appear grouped under "filesystem"
  - Verify: custom tools appear grouped under custom toolkit name
  - Select tools from both
  - Run workflow
  - Verify: both tool types execute correctly in workflow logs
- Update documentation in `/docs/mcp-ui-to-workflow.md`
  - Add section: "Tool Introspection for User Servers"
  - Document `config_type` field and usage
  - Document custom toolkit config format
  - Document introspection API endpoints
  - Document cache strategy (TTL: 1 hour)
  - Add troubleshooting section for introspection failures
  - Add examples for both stdio and custom servers
- Consider adding cache TTL config to `packages/core/src/core-config`
  - Default: 1 hour
  - Environment variable: `MCP_TOOL_CACHE_TTL_MS`
- Consider auto-introspection after config save
  - Background job: spawn introspection after successful POST to `/api/mcp/config`
  - Fire-and-forget, don't block user
  - Log failures but don't surface to user (manual introspect available)
- Verify stdio introspection works correctly
  - Test with known MCP servers: filesystem, github, etc.
  - Future: consider http/sse/websocket transport introspection

Start by looking into the /docs section and the readme (these can be somewhat outdated, do not rely on them), checking if this plan is not bullshit. Do a thorough check if this hasnt already been implemented somewhere. Start by making a plan. Do not touch any code yet. You must be 100% sure you know the codebase well. Always remember that minimal code is better than 1000s lines of code. Write code like Patrick Collison, and check and verify yourself as if you're Elon Musk but do not mention any of these names anywhere. You must also never mention you are Claude Code. If you find anything strange in the PR idea, you can ask questions.
