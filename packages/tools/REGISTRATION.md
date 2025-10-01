# Tool Registration System

This directory contains the unified tool registration system for both **Code Tools** (TypeScript functions) and **MCP Tools** (external servers).

## Architecture

Both code tools and MCP tools use **the same grouping structure** for easy maintenance:

```typescript
{
  groups: [
    {
      groupName: string
      description: string
      tools: ToolDefinition[]
    }
  ]
}
```

## Code Tools

**File:** `registration.ts`

Code tools are TypeScript functions that run in-process.

### Structure

```typescript
type CodeToolDefinition = {
  toolName: string
  toolFunc: any // The actual tool function
  description: string
}
```

### Registration

```typescript
import { registerAllTools } from "@examples/tools/registerAllTools"

// At startup
await registerAllTools() // Registers 24 tools across 10 groups
```

### Groups (10 total)

- **csv** (4 tools): CSV file operations
- **context** (4 tools): Workflow state management
- **todo** (2 tools): Task tracking
- **location** (2 tools): Geographic data
- **human** (2 tools): Human-in-the-loop
- **web** (4 tools): Web scraping
- **file** (1 tool): File operations
- **development** (3 tools): Testing & debugging
- **mapping** (1 tool): Geocoding
- **memory** (1 tool): Long-term memory

## MCP Tools

**File:** `mcpRegistration.ts`

MCP tools are external server processes that communicate via the Model Context Protocol.

### Structure

```typescript
type MCPToolDefinition = {
  toolName: string
  serverName: string // Reference to mcp-secret.json
  description: string
}
```

### Configuration

MCP tools require a `mcp-secret.json` configuration file:

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["@tavily/mcp-server"],
      "env": { "TAVILY_API_KEY": "${TAVILY_API_KEY}" }
    }
  }
}
```

### Groups (4 total)

- **web-search** (3 tools): tavily, serpAPI, googleScholar
- **web-scraping** (3 tools): firecrawl, browserUse, playwright
- **filesystem** (1 tool): filesystem operations
- **proxy** (1 tool): HTTP proxy

## Usage

### Code Tools

```typescript
// 1. Register all tools at startup
import { registerAllTools } from "@examples/tools/registerAllTools"
await registerAllTools()

// 2. Use tools in your workflow
import { setupCodeToolsForNode } from "@lucky/tools"
const tools = await setupCodeToolsForNode(["csvReader", "todoWrite"], context)
```

### MCP Tools

```typescript
// 1. Configure MCP servers in mcp-secret.json
// 2. Instantiate MCP client manager
import { MCPClientManager } from "@lucky/tools"
const mcpManager = new MCPClientManager({
  configPath: "./mcp-secret.json",
})

// 3. Setup MCP tools for a workflow
const mcpTools = await mcpManager.setupMCPForNode(["tavily"], workflowId)
```

## Verification

Run the verification script to see both registrations:

```bash
bun run examples/tools/verify-registrations.ts
```

## Benefits

✅ **Same structure** for both code and MCP tools
✅ **Easy maintenance** - update one, understand both
✅ **Grouped organization** - related tools stay together
✅ **Type-safe** - TypeScript types for all definitions
✅ **Explicit registration** - no auto-discovery magic
✅ **Clear documentation** - each tool has a description

## File Structure

```
examples/tools/
├── registration.ts           # Code tools registration
├── mcpRegistration.ts        # MCP tools registration
├── registerAllTools.ts       # Code tools startup helper
├── verify-registrations.ts   # Verification script
└── README.md                 # This file
```
