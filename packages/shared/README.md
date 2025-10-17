# @lucky/shared

**Contracts, types, and utilities foundation for the Lucky workflow system.**

The shared package is the **source of truth** for all data structures, validation rules, and type definitions used across the monorepo. Every other package depends on it.

## 🎯 Purpose

- **Contracts**: Zod schemas defining data shapes with runtime validation
- **Types**: TypeScript types (auto-generated from contracts and Supabase)
- **Utilities**: Shared helpers (ID generation, guards, validators)

## 📦 What's Inside

```
packages/shared/
├── src/
│   ├── contracts/          Zod schemas (source of truth)
│   │   ├── agent.ts        Agent/node configuration
│   │   ├── workflow.ts     Workflow DAG structure
│   │   ├── runtime.ts      Runtime configuration
│   │   ├── evolution.ts    Evolution settings
│   │   ├── tools.ts        Tool definitions & names
│   │   ├── messages.ts     Node-to-node messages
│   │   ├── config.ts       Core configuration
│   │   ├── ingestion.ts    Data ingestion (CSV, evals)
│   │   ├── invoke.ts       Model invocation
│   │   └── mcp.ts          MCP toolkit schemas
│   │
│   ├── types/              TypeScript types
│   │   ├── database.types.ts    Auto-generated from Supabase
│   │   ├── lockbox.types.ts     Auto-generated from Supabase lockbox
│   │   ├── supabase.types.ts    Supabase client types
│   │   └── *.types.ts           Manual type definitions
│   │
│   ├── client.ts           Type guards & utilities
│   └── env-models.ts       Environment variable models
│
└── dist/                   Built package (tsup)
```

## 🚀 Usage

### Contracts (Zod Schemas)

Contracts provide runtime validation + TypeScript types in one:

```typescript
import { agentConfigSchema, type AgentConfig } from "@lucky/shared/contracts/agent"

// Validate at runtime
const agent: AgentConfig = agentConfigSchema.parse({
  prompt: "You are a helpful assistant",
  model: "claude-3-5-sonnet-20241022",
  tools: {
    mcps: ["tavily"],
    code: ["csvReader"]
  }
})

// TypeScript knows the shape
console.log(agent.prompt) // ✅ string
console.log(agent.invalidField) // ❌ Type error
```

### Tool Names (Single Source of Truth)

Tool names are defined once in `contracts/tools.ts`:

```typescript
import { TOOLS, type CodeToolName, type MCPToolName } from "@lucky/shared/contracts/tools"

// All available tools
console.log(TOOLS.code)  // { csvReader: "...", todoWrite: "...", ... }
console.log(TOOLS.mcp)   // { tavily: "...", firecrawl: "...", ... }

// Type-safe tool names
const codeTools: CodeToolName[] = ["csvReader", "todoWrite"]
const mcpTools: MCPToolName[] = ["tavily"]
```

**Adding a new tool name**:
1. Add to `TOOLS.code` or `TOOLS.mcp` in `contracts/tools.ts`
2. Types auto-generated: `CodeToolName` | `MCPToolName`
3. Available everywhere in the monorepo

### Type Guards & Utilities

```typescript
import { isNir, isNilOrEmpty, genShortId } from "@lucky/shared"

// Null/undefined checks
isNir(value)         // null | undefined
isNilOrEmpty(value)  // null | undefined | "" | []

// ID generation
genShortId()  // "x7k3p2" (6-char alphanumeric)
```

### Database Types (Auto-Generated)

```typescript
import type { Database } from "@lucky/shared/types/database.types"
import type { Tables, TablesInsert } from "@lucky/shared/types/database.types"

// Type-safe Supabase queries
const workflows: Tables<"workflows">[] = await supabase
  .from("workflows")
  .select("*")

// Type-safe inserts
const newWorkflow: TablesInsert<"workflows"> = {
  name: "My Workflow",
  config: { nodes: [], edges: [] }
}
```

## 🔄 Regenerating Database Types

Database types are auto-generated from Supabase schema:

```bash
cd packages/shared
bun run generate
```

**Never manually edit**:
- `src/types/database.types.ts`
- `src/types/lockbox.types.ts`

Format them after generation, but don't change the content.

## 📊 Contracts Reference

### Core Workflow Contracts

**`agent.ts`** - Agent/node configuration
```typescript
import { agentConfigSchema } from "@lucky/shared/contracts/agent"
// Shape: { prompt, model, tools: { mcps, code }, routing, ... }
```

**`workflow.ts`** - Workflow DAG structure
```typescript
import { workflowConfigSchema } from "@lucky/shared/contracts/workflow"
// Shape: { nodes, edges, routing, metadata }
```

**`runtime.ts`** - Runtime configuration
```typescript
import { runtimeConfigSchema } from "@lucky/shared/contracts/runtime"
// Shape: model defaults, tool settings, limits
```

### Tool Contracts

**`tools.ts`** - Tool definitions (source of truth)
```typescript
import { TOOLS, DEFAULT_INACTIVE_TOOLS } from "@lucky/shared/contracts/tools"
// All tool names and descriptions
```

**`mcp.ts`** - MCP toolkit schemas
```typescript
import { toolkitSchema, serverSchema } from "@lucky/shared/contracts/mcp"
// MCP server and toolkit validation
```

### Invocation Contracts

**`invoke.ts`** - Model invocation parameters
```typescript
import { modelInvokeSchema } from "@lucky/shared/contracts/invoke"
// Streaming, temperature, max tokens, etc
```

**`messages.ts`** - Node-to-node messages
```typescript
import { messageSchema } from "@lucky/shared/contracts/messages"
// Message passing format between nodes
```

### Evolution Contracts

**`evolution.ts`** - Evolution settings
```typescript
import { evolutionSettingsSchema } from "@lucky/shared/contracts/evolution"
// GP parameters, iterative settings
```

## 🏗️ Build System

**Build command**: `bun run build` (uses tsup)

**Output**: `dist/` directory with:
- ESM modules (`dist/**/*.js`)
- Type definitions (`dist/**/*.d.ts`)

**Package exports** (package.json):
```json
{
  "exports": {
    "./contracts/*": "./dist/contracts/*.js",
    "./types/*": "./dist/types/*.js",
    "./client": "./dist/client.js",
    ...
  }
}
```

## 🔗 Dependencies

**None** - This is the foundation package. It has no dependencies on other `@lucky/*` packages.

**All packages depend on shared**:
- `@lucky/models`
- `@lucky/tools`
- `@lucky/core`
- `apps/web`

**Build order**: Shared must be built first (`bun run build` at root handles this via Turbo).

## 📝 Validation Philosophy

**Why Zod contracts?**
1. **Single source of truth** - Define once, use everywhere
2. **Runtime safety** - Catch bad data before it breaks things
3. **TypeScript integration** - Auto-generated types from schemas
4. **Composability** - Build complex schemas from simple ones

**Example**:
```typescript
// Define once
export const nodeSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  model: z.string(),
})

// Use everywhere
export type Node = z.infer<typeof nodeSchema>

// Validate anywhere
const node = nodeSchema.parse(untrustedData)
```

## 🤝 Contributing

**Adding a new contract**:
1. Create `src/contracts/yourContract.ts`
2. Define Zod schema
3. Export schema + inferred type
4. Run `bun run build`
5. Import in other packages: `@lucky/shared/contracts/yourContract`

**Adding a new tool name**:
1. Edit `src/contracts/tools.ts`
2. Add to `TOOLS.code` or `TOOLS.mcp`
3. TypeScript types auto-update
4. Build: `bun run build`

**Modifying database types**:
1. Change Supabase schema (migrations)
2. Run `bun run generate` in this package
3. Format: `bun run format`
4. Commit generated files

## 📄 License

Part of the Lucky project.
