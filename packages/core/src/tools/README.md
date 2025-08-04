# Tools System Documentation

This directory contains the **unified tools framework** for the autonomous workflow system. It provides a hybrid architecture supporting both **Code Tools** (TypeScript functions) and **MCP Tools** (Model Context Protocol servers) with automatic discovery, type safety, and intelligent tool selection.

## 🎯 System Overview

The tools system enables AI agents to execute complex workflows by providing:

1. **Code Tools**: Direct TypeScript function execution with full type safety
2. **MCP Tools**: External process integration via Model Context Protocol
3. **Auto-Discovery**: Automatic tool detection and registration from filesystem
4. **Intelligent Selection**: AI-driven tool strategy selection based on context
5. **Unified Interface**: Consistent API regardless of tool implementation

## 🏗️ Architecture Pattern

### Core Framework Components

- **`toolFactory.ts`** - The **unified tool creation framework** using `defineTool()`
- **`tool.types.ts`** - Type definitions and active tool filtering system
- **`/code/AutoDiscovery.ts`** - **Automatic filesystem-based tool discovery**
- **`/code/CodeToolRegistry.ts`** - **Tool registration and lifecycle management**
- **`/any/selectToolStrategy.ts`** - **AI-powered tool selection logic**
- **`/mcp/mcp.ts`** - External MCP tool client management

### Tool Implementation Areas

- **`/src/runtime/code_tools/`** - **Actual tool implementations** (auto-discovered)
- **`/src/runtime/tools.ts`** - **Tool descriptions and metadata**

## 🔧 The defineTool Pattern

All tools follow the **unified `defineTool()` pattern** for consistency:

```typescript
import { defineTool, commonSchemas } from "@tools/toolFactory"
import { z } from "zod"

const myTool = defineTool({
  name: "toolName", // Must match entry in /runtime/tools.ts
  params: z.object({
    // Zod schema for validation
    input: commonSchemas.query,
    optional: z.string().optional(),
  }),
  async execute(params, context) {
    // Type-safe execution
    // Implementation with full context access
    return result
  },
})

export const tool = myTool // Standard export convention
```

the context is the following:

interface ToolExecutionContext {
workflowInvocationId: string
workflowFiles: WorkflowFile[]
expectedOutputType: ExpectedOutputSchema | undefined
mainWorkflowGoal: string
workflowId: string
}

therefore, you never have to ask one of these parameters. you can use them. check if they're really functioning though.

### Key Features

1. **Runtime Validation**: Zod schemas validate inputs before execution
2. **Type Safety**: Full TypeScript inference for params and results
3. **Context Access**: Every tool receives `ToolExecutionContext` with workflow info
4. **Error Handling**: Automatic try/catch with structured error responses
5. **Consistent Interface**: Same pattern for all tools regardless of complexity

## 🚀 Auto-Discovery System

Tools are **automatically discovered** from the filesystem using glob patterns:

### Discovery Process (`/code/AutoDiscovery.ts`)

1. **Scan**: Searches `/src/runtime/code_tools/**/tool*.ts` for tool files
2. **Import**: Dynamically imports each discovered file
3. **Validate**: Checks for valid tool exports (`tool`, `default`, or tool-like objects)
4. **Register**: Adds validated tools to the global registry
5. **Setup**: Makes tools available to workflow nodes

### Tool File Convention

```typescript
// /src/runtime/code_tools/my-tool/tool.ts
export const tool = defineTool({
  name: "myTool",
  // ... tool definition
})
```

**Auto-discovery finds**: `/tool.ts`, `/tool-*.ts` files  
**Ignores**: Test files (`*.test.ts`, `*.spec.ts`)

## 🧠 Intelligent Tool Selection

### AI-Powered Strategy Selection (`/any/selectToolStrategy.ts`)

The system uses **AI to determine optimal tool usage** based on:

- **System prompt analysis**: Scans for tool mentions and requirements
- **Context Awareness**: Considers previous workflow steps
- **Dynamic Selection**: Chooses between `auto`, `required`, `none`, or specific tools
- **Multi-Step Coordination**: Adapts tool choice per workflow step

## 📁 System Organization

### 1. **Code Tools** - Direct TypeScript Execution

- **Location**: `/src/runtime/code_tools/`
- **Pattern**: Each tool in its own directory with `tool.ts`
- **Examples**: `file-saver/`, `expected-output-handler/`, `googlescraper/`
- **Benefits**: Full type safety, easy debugging, shared context

### 2. **MCP Tools** - External Process Integration

- **Location**: `/src/core/tools/mcp/`
- **Pattern**: Configured external processes via stdio transport
- **Examples**: `tavily` (web search), `filesystem`, `firecrawl`
- **Benefits**: Language agnostic, isolated execution, npm ecosystem

## 📁 Complete Directory Structure

```
src/core/tools/                   # 🏗️ Core Framework
├── README.md                     # This documentation
├── toolFactory.ts                # 🔧 defineTool() creation framework
├── tool.types.ts                 # 📝 Type definitions and filtering
├── any/                          # 🧠 Cross-cutting tool logic
│   ├── getAvailableTools.ts      # Tool enumeration utilities
│   ├── selectToolStrategy.ts     # AI-powered tool selection (v1)
│   ├── selectToolStrategyV2.ts   # Enhanced tool selection (v2)
│   └── selectToolStrategyV3.ts   # Latest tool selection (v3)
├── code/                         # 💻 Code Tool Management
│   ├── AutoDiscovery.ts          # 🔍 Filesystem tool discovery
│   ├── CodeToolRegistry.ts       # 📚 Tool registration system
│   ├── codeToolsSetup.ts         # ⚙️ Setup and initialization
│   ├── output.types.ts           # 📊 Standardized response formats
│   └── __tests__/                # 🧪 Test suites
├── context/                      # 📋 Tool Context Management
│   ├── contextStore.types.ts     # Context storage type definitions
│   ├── debug/                    # Context debugging utilities
│   └── __tests__/                # Context system tests
├── mcp/                          # 🌐 External Tool Integration
│   ├── mcp.ts                    # MCP client management
│   └── __tests__/                # 🧪 MCP integration tests
└── constraintValidation.ts       # Tool constraint validation

src/runtime/code_tools/           # 🛠️ Tool Implementations (Auto-Discovered)
├── expected-output-handler/      # New tool example
│   ├── tool.ts                   # Main tool definition
│   └── __tests__/                # Tool-specific tests
├── file-saver/                   # File operations
├── googlescraper/                # Google Maps integration
├── csv-handler/                  # CSV processing tools
├── contexthandler/               # Workflow context management
└── [other-tools]/                # Additional tool directories

src/runtime/
├── tools.ts                      # 📋 Tool descriptions registry
└── constants.ts                  # Configuration and models
```

## 📋 Tool Registration System

### Tool Metadata (`/src/runtime/tools.ts`)

**Central registry** of all tool descriptions:

```typescript
export const TOOLS = {
  mcp: {
    tavily: "Search the web",
    filesystem: "Save and load files",
    firecrawl: "Extract structured data from websites",
    proxy: "Proxy requests to a specific URL",
  },
  code: {
    expectedOutputHandler:
      "Handle LLM requests with expected output validation",
    searchGoogleMaps: "Search Google Maps for business information",
    saveFileLegacy: "Save any data to a file at specified path",
    verifyLocation: "Get geographic coordinates using Mapbox",
    csvReader: "Extract column data from CSV files with pagination",
    contextHandler: "Store/retrieve workflow or node-scoped data",
    // ... 20+ other tools
  },
} as const
```

### Type Generation (`/src/core/tools/tool.types.ts`)

**Automatic TypeScript types** generated from tool registry:

```typescript
export type MCPToolName = keyof typeof TOOLS.mcp // "tavily" | "filesystem" | ...
export type CodeToolName = keyof typeof TOOLS.code // "csvReader" | "contextHandler" | ...
export type AllToolNames = MCPToolName | CodeToolName

// Active tool filtering (respects CONFIG.tools.inactive)
export const getActiveTools = <T>(tools: T): T => {
  /* filters inactive tools */
}
```

## 🚀 Quick Start: Adding New Tools

### 1. Create Code Tool Implementation

```typescript
// /src/runtime/code_tools/my-new-tool/tool.ts
import { defineTool, commonSchemas } from "@tools/toolFactory"
import { z } from "zod"

const myNewTool = defineTool({
  name: "myNewTool", // Must match tools.ts entry
  params: z.object({
    input: commonSchemas.query,
    options: z.string().optional(),
  }),
  description: "A very very very good description of how someone would use this tool. This description should assume someone has 0 knowledge."
  async execute(params, context) {
    // Implementation with full context access
    // context.workflowInvocationId, context.workflowFiles

    const result = await processInput(params.input)
    return result
  },
})

export const tool = myNewTool // Standard export name
```

### 2. Register Tool Description

```typescript
// /src/runtime/tools.ts
export const TOOLS = {
  code: {
    myNewTool: "Description of what my new tool does, including limits",
    // ... existing tools
  },
}
```

### 3. Add to Static Registry

**IMPORTANT:** You must register your code tool in the static registry:

```typescript
// /src/runtime/code_tools/registry.ts
import { tool as myNewTool } from "./my-new-tool/tool"

export const ALL_TOOLS = [
  myNewTool,
  // ... other existing tools
]
```

### 4. System Integration

- Tool is **available immediately** to all workflow nodes via `CodeToolRegistry.initialize()`
- **TypeScript types** regenerated from tools.ts
- **AI system** can intelligently select when to use it

### Common Schemas Available

```typescript
commonSchemas.query // z.string() - search queries
commonSchemas.filePath // z.string() - file paths
commonSchemas.data // z.string() - data content
commonSchemas.resultCount // z.number().optional() - result limits
```

## 🔄 Tool Lifecycle & Integration

### Workflow Integration

Tools integrate seamlessly into the autonomous workflow system:

```typescript
// Node configuration specifies available tools
const nodeConfig = {
  id: "data-processor",
  systemPrompt:
    "Process CSV data and save results using csvReader and contextHandler",
  tools: ["csvReader", "contextHandler", "saveFileLegacy"],
  coordination: "sequential",
}

// AI system automatically selects optimal tools based on:
// 1. System prompt analysis
// 2. Previous step context
// 3. Available tool capabilities
// 4. Workflow requirements
```

### Tool Context Access

Every tool receives rich execution context:

```typescript

// Example usage in tool
async execute(params, context): Promise<ToolResult<T>> {
  // Access workflow-scoped data
  const workflowId = context.workflowInvocationId

  // Process accessible files
  const csvFiles = context.workflowFiles.filter(f => f.name.endsWith('.csv'))

  // Tool can coordinate with other tools via shared context
  return result
}
```

### Error Handling & Reliability

**Structured Error Responses** from `defineTool()`:

```typescript
// All tools return consistent ToolResult format
type ToolResult<T> = {
  readonly success: boolean
  readonly data: T | null
  readonly error: string | null
}

// Automatic error handling prevents workflow crashes
try {
  const result = await tool.execute(params, context)
  // { success: true, data: result, error: null }
} catch (err) {
  // { success: false, data: null, error: "Error message" }
}
```

## 🏆 Summary

The tools system provides a **production-ready framework** for autonomous AI workflows with:

- **🔧 Simple Creation**: `defineTool()` pattern for all tools
- **🔍 Auto-Discovery**: Filesystem-based tool detection
- **🧠 Smart Selection**: AI-driven tool strategy optimization
- **🔗 Rich Integration**: Full workflow context access
- **⚡ High Performance**: Efficient execution and error handling

**Perfect for**: Complex data processing, web automation, file operations, API integrations, and any task requiring tool coordination in autonomous AI workflows.
