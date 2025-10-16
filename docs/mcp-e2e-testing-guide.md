# MCP End-to-End Testing Guide
**Updated for `mcp.user_server_configs` persistence**

## Prerequisites

```bash
# Start the dev server from the repository root
bun run dev
```

## Test 1: Configure MCP Server via UI

### Steps:

1. **Open browser** → `http://localhost:3000`
2. **Login** with your account
3. **Navigate to** Connectors → MCP Servers (`/connectors`)
4. **Click** "Show JSON configuration"
5. **Paste** this test config:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

6. **Click** "Apply"

### Expected Results:

- ✅ Toast: "MCP config saved to database"
- ✅ Server "filesystem" appears in the list
- ✅ Network tab shows `POST /api/mcp/config` → `200 OK`
- ✅ Response: `{"success": true, "inserted": 1, "updated": 0, "deleted": 0}`

---

## Test 2: Verify Database Persistence

### Option A: Check via Supabase SQL Editor

```sql
SELECT
  usco_id,
  user_id,
  name,
  config_json,
  server_id,
  enabled,
  created_at,
  updated_at
FROM mcp.user_server_configs
WHERE server_id IS NULL  -- Stdio servers only
  AND enabled = true
ORDER BY created_at DESC;
```

**Expected:**
- Row with `name = 'filesystem'`
- `server_id = NULL`
- `config_json = {"command": "npx", "args": [...], "env": {...}}`
- `enabled = true`

### Option B: Check via API

```bash
# Get your session cookie from browser DevTools → Application → Cookies
curl http://localhost:3000/api/mcp/config \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  | jq
```

**Expected response:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {
        "DEBUG": "mcp:*"
      }
    }
  }
}
```

---

## Test 3: Verify Auto-Load on Page Refresh

### Steps:

1. Add MCP server (see Test 1)
2. **Refresh the page** (F5 or Cmd+R)
3. Navigate back to **Connectors → MCP Servers**

### Expected Results:

- ✅ Server "filesystem" is still there (loaded from database, not localStorage)
- ✅ Network tab shows `GET /api/mcp/config` → `200 OK`
- ✅ **No toast** on page load (silent load)

---

## Test 4: Create Workflow Using MCP Tools

### Steps:

1. **Navigate to** Workflows
2. **Create new workflow** or edit existing one
3. **Add a node** that uses MCP tools
4. In node configuration, **select MCP tools**:
   - Tool source: `MCP`
   - Available tools: should show tools from `filesystem` server

Example node config:
```json
{
  "id": "mcp-test-node",
  "type": "agent",
  "prompt": "List files in /tmp directory",
  "tools": ["mcp.filesystem.list_directory"],
  "model": "claude-3-5-sonnet-20241022"
}
```

5. **Save workflow**

---

## Test 5: Invoke Workflow and Verify MCP Loading

### Steps:

1. **Invoke the workflow** via UI or API
2. **Watch server logs** in terminal where `bun run dev` is running

### Expected Logs:

```
[workflow/invoke] Loading MCP configs from database for user: user_xxx
[workflow/invoke] Loaded 1 MCP server(s): filesystem
[setupMCPForNode] Using context toolkits for: filesystem
[mcp-client] Starting stdio transport: npx -y @modelcontextprotocol/server-filesystem /tmp
[mcp-client] Connected to server: filesystem
[mcp-client] Available tools: list_directory, read_file, write_file, ...
```

### Expected Workflow Execution:

- ✅ MCP server spawns successfully
- ✅ Tools are available to the agent
- ✅ Agent can call MCP tools (e.g., `list_directory`)
- ✅ Results are returned

---

## Test 6: Full End-to-End Flow

### Complete Test Scenario:

**Objective:** Configure an MCP server in UI, create a workflow that uses it, and verify it executes correctly.

#### Step 1: Configure MCP Server

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Step 2: Create Test Workflow

```json
{
  "name": "MCP Search Test",
  "nodes": [
    {
      "id": "search-node",
      "type": "agent",
      "prompt": "Search for 'Model Context Protocol' and summarize the results",
      "tools": ["mcp.brave-search.brave_web_search"],
      "model": "claude-3-5-sonnet-20241022"
    }
  ],
  "edges": []
}
```

#### Step 3: Invoke Workflow

**Via UI:**
1. Navigate to workflow
2. Click "Run"
3. Enter input: `"Search for Model Context Protocol"`
4. Watch execution

**Via API:**
```bash
curl -X POST http://localhost:3000/api/workflow/invoke \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{
    "workflowVersionId": "wfv_xxx",
    "input": "Search for Model Context Protocol"
  }'
```

#### Step 4: Verify Execution

**Server logs should show:**
```
[workflow/invoke] Loaded MCP toolkits from database: brave-search
[setupMCPForNode] Creating MCP client for: brave-search
[mcp-client] Connected to brave-search
[node-executor] Agent calling tool: brave_web_search
[tool-result] Search returned 10 results
```

**Expected output:**
- Agent successfully searches using Brave API
- Results are summarized
- No errors related to MCP loading

---

## Test 7: Update MCP Configuration

### Steps:

1. **Navigate to** Connectors → MCP Servers
2. **Edit JSON** to add a second server:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "your-token-here"
      }
    }
  }
}
```

3. **Click** "Apply"

### Expected Results:

- ✅ Toast: "MCP config saved to database"
- ✅ Both servers appear in list
- ✅ Database query shows 2 rows with `server_id IS NULL`
- ✅ Next workflow invocation loads both toolkits

---

## Test 8: Delete MCP Server

### Steps:

1. **Edit JSON** to remove a server:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      "env": {}
    }
  }
}
```

2. **Click** "Apply"

### Expected Results:

- ✅ "github" server disappears from list
- ✅ POST response: `{"success": true, "inserted": 0, "updated": 0, "deleted": 1}`
- ✅ Database query shows only "filesystem" server
- ✅ Next workflow invocation only loads "filesystem" toolkit

---

## Debugging Commands

### Check Current User's MCP Configs

```sql
-- Replace 'user_xxx' with actual clerk_id
SELECT
  name,
  config_json,
  enabled,
  created_at
FROM mcp.user_server_configs
WHERE user_id = 'user_xxx'
  AND server_id IS NULL
  AND enabled = true;
```

### Check API Endpoint

```bash
# Should return 401 if not authenticated
curl -i http://localhost:3000/api/mcp/config

# With auth cookie (get from browser)
curl http://localhost:3000/api/mcp/config \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  | jq
```

### Watch Workflow Invocation Logs

```bash
# In terminal where dev server is running
# Look for these patterns:
grep "workflow/invoke" logs.txt
grep "setupMCPForNode" logs.txt
grep "mcp-client" logs.txt
```

---

## Success Criteria Checklist

### UI Configuration
- [ ] Can add MCP server via JSON editor
- [ ] Server appears in UI list immediately
- [ ] Toast confirms successful save
- [ ] Network request shows `200 OK`

### Database Persistence
- [ ] Config saved in `mcp.user_server_configs` table
- [ ] `server_id IS NULL` for stdio servers
- [ ] Config persists after page refresh
- [ ] Can query via SQL and see stored `config_json` values

### Workflow Execution
- [ ] Workflow invocation loads MCP configs from database
- [ ] Server logs show toolkit loading
- [ ] MCP clients spawn successfully
- [ ] Tools are available to agents
- [ ] Agent can call MCP tools and get results

### Updates & Deletes
- [ ] Can add/remove servers via JSON editor
- [ ] Changes immediately reflected in database
- [ ] Next workflow invocation uses updated config

---

## Troubleshooting

### "Failed to save MCP config"

**Check:**
- Browser console for detailed error
- Verify logged in (check `__session` cookie)
- Server logs for backend error
- Database permissions (RLS policies)

### "Failed to load MCP config"

**Check:**
- Network tab: `GET /api/mcp/config` should be `200`, not `401`
- Database: run SQL query to verify row exists
- Server logs for any errors

### Workflow doesn't use MCP servers

**Check:**
- Node config references MCP tools: `mcp.{server-name}.{tool-name}`
- Server logs show toolkit loading: `[workflow/invoke] Loaded MCP toolkits`
- Principal auth method: should be `"session"` for UI-based invocations
- MCP client spawns: look for `[mcp-client] Connected to {server-name}`

### MCP client fails to start

**Check:**
- Server logs for spawn errors
- Command exists: `npx` is available
- Package exists: try running command manually
- Environment variables are set correctly in `env` field
- No port conflicts (if using HTTP transport)

---

## Advanced: Verify Context-Based Toolkit Loading

### Check workflow invoke route loads configs

**File:** `apps/web/src/app/api/workflow/invoke/route.ts`

**Look for:**
```typescript
// Load MCP configs from database
const mcpConfigs = await loadMCPConfigsFromDatabase(clerkId)

// Pass to execution context
const result = await withExecutionContext(
  {
    principal,
    secrets,
    apiKeys,
    mcp: { toolkits: mcpConfigs }
  },
  () => invokeWorkflow(...)
)
```

**Verify in logs:**
```
[workflow/invoke] Loaded MCP toolkits from database: filesystem, brave-search
[executionContext] MCP toolkits in context: 2
```

### Check tools setup uses context toolkits

**File:** `packages/tools/src/mcp/setup.ts`

**Expected behavior:**
1. `setupMCPForNode` receives `opts.toolkits` from execution context
2. Prefers context toolkits over `mcp-secret.json`
3. Creates MCP client from toolkit transportSpec
4. Returns available tools

**Verify in logs:**
```
[setupMCPForNode] Using context toolkits for: filesystem
[setupMCPForNode] Context toolkit transportSpec: {"command":"npx","args":[...]}
[mcp-client] Creating stdio transport
```

---

## Summary

**Full flow:**
1. **UI** → Configure MCP server → POST `/api/mcp/config`
2. **Database** → Stores in `mcp.user_server_configs` (server_id=NULL)
3. **Workflow Invocation** → GET `/api/mcp/config` → Load configs
4. **Execution Context** → Pass toolkits via `withExecutionContext`
5. **Tool Setup** → Read from context → Spawn MCP clients
6. **Agent** → Call MCP tools → Get results

**No localStorage dependency. No file writes. Pure database persistence.**
