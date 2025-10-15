# @lucky/tools

**Unified Tool Framework for AI-Powered Workflows**

A complete, production-ready framework for creating, managing, and executing tools in AI-powered workflows. Provides both code tools (TypeScript functions) and MCP tools (external servers) with a unified API.

## 🎯 Features

✅ **Unified API** - Same structure for code tools and MCP tools
✅ **Type-Safe** - Full TypeScript support with strict types
✅ **Validated** - Automatic validation of tool registrations
✅ **Toolkit-Based** - Logical toolkits of related functionality
✅ **Explicit Registration** - No magic auto-discovery, full control
✅ **Production Ready** - Battle-tested in production workflows

## 📦 Installation

```bash
bun add @lucky/tools
```

## 🚀 Quick Start

### 1. Register Tools at Startup

```typescript
import { registerAllTools } from "@lucky/tools"
import { TOOL_TOOLKITS } from "@lucky/examples/definitions/registry-grouped"

// Register all 24 code tools across 10 toolkits
await registerAllTools(TOOL_TOOLKITS)
```

### 2. Use Tools in Your Workflow

```typescript
import { setupCodeToolsForNode } from "@lucky/tools"

const tools = await setupCodeToolsForNode(["csvReader", "todoWrite", "searchGoogleMaps"], {
  workflowInvocationId: "workflow-123",
  workflowVersionId: "v1",
  workflowFiles: [],
  workflowId: "wf-123",
  mainWorkflowGoal: "Process data",
})

// Use with AI SDK
import { generateText } from "ai"

const result = await generateText({
  model,
  prompt: "Read the CSV and create a todo list",
  tools,
})
```

## 📚 Architecture

```
packages/tools/
├── src/
│   ├── factory/           # Tool creation (defineTool, toAITool)
│   ├── registry/          # Tool registry and management
│   ├── config/            # Tool metadata and settings
│   ├── mcp/               # MCP client and integration
│   ├── registration/      # Tool registration and validation
│   │   ├── codeToolsRegistration.ts    # Code tools manifest
│   │   ├── mcpToolsRegistration.ts     # MCP tools manifest
│   │   ├── startup.ts                  # Registration helpers
│   │   ├── validation.ts               # Validation logic
│   │   └── verify.ts                   # Verification script
│   └── definitions/       # Actual tool implementations (24 tools)
└── dist/                  # Built package
```

## 🔧 Code Tools (24 total)

### CSV Tools (4)

- `csvWriter` - Create and write CSV files
- `csvReader` - Read and extract CSV data with pagination
- `csvFilter` - Filter CSV data based on conditions
- `csvInfo` - Get CSV metadata and statistics

### Context Tools (4)

- `contextGet` - Retrieve data from context store
- `contextSet` - Store data in context store
- `contextList` - List all context store keys
- `contextManage` - Manage context store entries

### Todo Tools (2)

- `todoRead` - Read session todo list
- `todoWrite` - Create and manage todo items

### Location Tools (2)

- `locationDataInfo` - Get location data information
- `locationDataManager` - Manage location data (CRUD)

### Human Tools (2)

- `humanApproval` - Request human approval
- `humanHelp` - Request human assistance

### Web Tools (4)

- `firecrawlAPI` - Scrape websites with Firecrawl
- `searchGoogleMaps` - Search Google Maps for businesses
- `urlToMarkdown` - Convert web pages to markdown
- `browserAutomation` - Automate browser with Playwright

### File Tools (1)

- `saveFileLegacy` - Save data to files

### Development Tools (3)

- `runInspector` - Inspect workflow execution
- `jsExecutor` - Execute JavaScript in sandbox
- `expectedOutputHandler` - Validate workflow outputs

### Mapping Tools (1)

- `verifyLocation` - Geocode locations with Mapbox

### Memory Tools (1)

- `memoryManager` - Manage long-term agent memories

## 🌐 MCP Tools (8 total)

### Web Search (3)

- `tavily` - Tavily AI search
- `serpAPI` - SerpAPI search
- `googleScholar` - Google Scholar search

### Web Scraping (3)

- `firecrawl` - Firecrawl server
- `browserUse` - Browser automation
- `playwright` - Playwright server

### File System (1)

- `filesystem` - File operations

### Proxy (1)

- `proxy` - HTTP proxy

## 🎓 Usage Guide

### Registering Specific Toolkits

```typescript
import { registerToolGroups } from "@lucky/tools"
import { TOOL_GROUPS } from "@examples/definitions/registry-grouped"

// Register only CSV and todo tools
await registerToolGroups(TOOL_GROUPS, ["csv", "todo"])
```

### Validation

```typescript
import { validateAllRegistrations, mcpToolkits } from "@lucky/tools"
import { TOOL_TOOLKITS } from "@lucky/examples/definitions/registry-grouped"

// Validate both code and MCP registrations
const valid = validateAllRegistrations(
  TOOL_TOOLKITS.toolkits,
  mcpToolkits.toolkits,
  true, // throw on error
)
```

### Creating Custom Tools

```typescript
import { defineTool } from "@lucky/tools"
import { z } from "zod"

const myTool = defineTool({
  name: "myCustomTool",
  description: "Does something amazing",
  params: z.object({
    input: z.string().describe("The input data"),
  }),
  async execute(params, context) {
    // Your implementation
    return {
      success: true,
      data: `Processed: ${params.input}`,
    }
  },
})

// Register it
import { codeToolRegistry } from "@lucky/tools"
codeToolRegistry.register(myTool)
```

### MCP Configuration

Create `mcp-secret.json`:

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": ["@tavily/mcp-server"],
      "env": {
        "TAVILY_API_KEY": "${TAVILY_API_KEY}"
      }
    }
  }
}
```

Use MCP tools:

```typescript
import { MCPClientManager } from "@lucky/tools"

const mcpManager = new MCPClientManager({
  configPath: "./mcp-secret.json",
})

const mcpTools = await mcpManager.setupMCPForNode(["tavily"], "workflow-123")
```

## 📊 Validation

All tool registrations are automatically validated for:

- ✅ Unique tool names (no duplicates)
- ✅ Unique toolkit names
- ✅ Non-empty descriptions
- ✅ Valid tool functions with `execute` method
- ✅ Matching tool names between registration and definition
- ⚠️ Warnings for missing metadata

Run validation manually:

```bash
bun run packages/tools/src/registration/verify.ts
```

## 🧪 Testing

```bash
# Run tool tests
cd core && bun test src/tools/code/__tests__/

# Verify registrations
bun run packages/tools/src/registration/verify.ts
```

## 📝 Type Safety

The package exports strict types for everything:

```typescript
import type {
  CodeToolName, // Union of all code tool names
  MCPToolName, // Union of all MCP tool names
  ToolExecutionContext, // Execution context for tools
  ToolkitToolDefinition, // Toolkit tool definition structure
  ToolkitDefinition, // Toolkit structure
  ValidationResult, // Validation result type
} from "@lucky/tools"
```

## 🔄 Migration from Old System

**Before:**

```typescript
// Auto-discovery (removed)
await codeToolAutoDiscovery.setupCodeTools()
```

**After:**

```typescript
// Explicit registration (current)
import { registerAllTools } from "@lucky/tools"
import { TOOL_TOOLKITS } from "@lucky/examples/definitions/registry-grouped"

await registerAllTools(TOOL_TOOLKITS)
```

## 🎯 Design Principles

1. **Explicit over Magic** - No auto-discovery, clear registration
2. **Type Safety** - Full TypeScript support
3. **Single Responsibility** - Each tool does one thing well
4. **Consistent API** - Same patterns for code and MCP tools
5. **Production Ready** - Validated, tested, documented

## 📖 Further Reading

- `REGISTRATION.md` - Detailed registration guide
- `src/registration/` - Registration implementation
- `src/definitions/` - Tool implementations

## 🤝 Contributing

When adding new tools:

1. Create tool in `src/definitions/[category]/`
2. Add to appropriate toolkit in `src/registration/codeToolsRegistration.ts`
3. Run `bun run build:tools`
4. Run `bun run packages/tools/src/registration/verify.ts`
5. Ensure tests pass

## 📄 License

Part of the Lucky project.
