# Self-Improving Agentic Workflows!
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-purple)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![Tests](docs/badges/tests.svg)](docs/badges/tests.svg)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey)](LICENSE)

Multi-agent systems require explicit workflow design - developers must manually configure agent roles, communication patterns, and coordination strategies. This framework addresses this limitation through evolutionary optimization of multi-agent workflows.

The system discovers effective agent collaboration patterns by treating workflows as evolvable data structures, optimized through genetic programming and iterative improvement algorithms.

![Evolutionary agentic workflows screenshot](docs/example.png)

## Technical Contributions

**1. Evolutionary Workflow Optimization**  
Implements a genetic programming algorithm for discovering agent collaboration patterns. Includes a tool-use algorithm that improves tool selection accuracy by 29% for smaller language models (measured on Claude Haiku vs baseline prompting).

**2. JSON-Based Workflow Specification**
Workflows defined as JSON data structures enable programmatic manipulation through crossover and mutation operations. No manual coding of agent interactions required.

**3. Execution Observability**  
Provides real-time visualization of workflow execution graphs, evolutionary fitness metrics, and performance tracking across accuracy, cost, and latency dimensions.

## Monorepo Layout

```
.
├── apps/
│   ├── web/              Next.js UI (port 3000+) - workflows, settings, connectors
│   └── examples/         Example tools & workflow definitions
│
├── packages/
│   ├── shared/          Zod contracts, types, utilities (BUILD FIRST)
│   ├── models/          Multi-provider model registry (OpenAI, Anthropic, etc)
│   ├── tools/           Tool framework (code tools + MCP integration)
│   ├── core/            Workflow execution engine (DAG, nodes, evolution)
│   └── adapter-supabase/ Persistence layer (optional, can use mock)
│
└── tests/
    └── e2e-essential/   Smoke tests (pre-commit) & gate tests (pre-push)
```

**Build order**: `shared` → `models` → `tools` → `core` → `web`

See `packages/*/README.md` for detailed package documentation.

## Installation

Prerequisites: Bun 1.2+, Node 18+, Git.

```bash
# Clone and install dependencies at the repo root
git clone https://github.com/eenlars/lucky.git
cd lucky
bun install  # This also builds required packages

# Configure environment at the repo root
cp .env.example .env.local
# Fill in your API keys and settings in .env.local (and optionally .env)

# Start the web interface
cd apps/web && bun run dev
```

## Common Tasks

- Build all: `bun run build` (shared → app)
- Typecheck all: `bun run tsc`
- Core: run once `cd packages/core && bun run once` · iterative `cd packages/core && bun run iterative`
- App: dev `cd apps/web && bun run dev` · start `cd apps/web && bun run start`

## Testing

- Smoke: `bun run test:smoke`
- Gate: `bun run test:gate`
- Core unit (watch): `cd packages/core && bun run dev` · one‑shot: `cd packages/core && bun run test:unit`
- Coverage: `cd apps/web && bun run coverage` or `cd packages/core && bun run coverage`

Golden updates (after intentional behavior change):

```bash
bunx tsx tests/e2e-essential/scripts/update-golden.ts
```

Husky hooks: pre‑commit runs smoke; pre‑push runs typecheck + core unit + gate.

## Configuration

### Dual Environment System

The system supports two execution contexts:

**1. Local Development (SDK/CLI)**
- Environment variables in `.env` / `.env.local`
- MCP servers in `mcp-secret.json` (path via `MCP_SECRET_PATH`)
- Direct file access, no authentication required

**2. UI-Based Workflows (Production)**
- API keys encrypted in Supabase lockbox (`lockbox.user_secrets`)
- Accessed via `secretResolver` during workflow invocation
- MCP servers: stored in browser localStorage, **not yet integrated** with workflow execution

### Environment Setup

**Local Development**:
```bash
# Root configuration
cp .env.example .env.local
# Edit .env.local with your API keys

# MCP configuration (optional)
cp apps/examples/mcp-config.example.json mcp-secret.json
export MCP_SECRET_PATH=./mcp-secret.json
```

**UI Configuration**:
- API Keys: Settings → Providers (encrypted, stored in lockbox)
- MCP Servers: Settings → Connectors (localStorage, not yet connected to execution)
- Format: Keys must match `^[A-Z_][A-Z0-9_]*$`

### Code Style

- **Path aliases**: Use `@core`, `@shared`, `@lucky/tools` instead of relative paths
- **Formatting**: Biome (`biome.json`)
  - Format all: `bun run format`
  - Check only: `bun run format:check`

## Tool Architecture

### Two Tool Types

**Code Tools** (24 tools)
- TypeScript functions in `packages/tools/src/definitions/`
- Registered explicitly in `packages/tools/src/registration/codeToolsRegistration.ts`
- Defined in `packages/shared/src/contracts/tools.ts` (source of truth)
- Examples: `csvReader`, `todoWrite`, `searchGoogleMaps`, `humanApproval`

**MCP Tools** (8+ toolkits)
- External servers via Model Context Protocol
- Registered in `packages/tools/src/registration/mcpToolsRegistration.ts`
- Configured via `mcp-secret.json` (command, args, env)
- Examples: `tavily`, `firecrawl`, `playwright`, `browserUse`

### Tool Registration Flow

**Adding a new tool name:**
1. Add to `packages/shared/src/contracts/tools.ts` → `TOOLS.code` or `TOOLS.mcp`
2. TypeScript types auto-generated: `CodeToolName` | `MCPToolName`
3. Import in `packages/tools/src/registry/types.ts` (filtered for active tools)
4. Tool name now available in node configs: `node.tools.mcps: ["toolName"]`

**MCP Registration Gap (UI → Execution):**

Currently, there's a gap between UI configuration and execution:

```
UI (Browser)
  └─ Settings → Connectors → MCP Servers
     └─ Stored in localStorage (useMCPConfigStore)
        └─ Key: "mcp_servers_config"
           └─ ⚠️  NOT YET CONNECTED TO WORKFLOW EXECUTION

Execution (Core)
  └─ packages/core/src/node/toolManager.ts
     └─ setupMCPForNode(toolNames, workflowId, configPath)
        └─ Reads from: mcp-secret.json (via MCP_SECRET_PATH)
           └─ packages/tools/src/mcp/setup.ts
```

**To connect UI → Execution**, need to:
1. Store MCP configs in Supabase (like API keys in lockbox)
2. Generate `mcp-secret.json` from DB during workflow invocation
3. Pass dynamic path to `setupMCPForNode()`

## How It Works

The system represents workflows as directed acyclic graphs (DAGs) where nodes are AI agents and edges are message-passing connections. Evolution operates on these graph structures through:

1. **Iterative Improvement**: Single-workflow optimization using LLM-based performance analysis and targeted modifications
2. **Genetic Programming**: Population-based evolution (10-50 genomes, 10+ generations) with semantic crossover and mutation operators
3. **Dynamic Routing**: Agents select successor nodes based on message content and task requirements
4. **Tool Discovery**: Automatic tool selection from 17 categories including code execution, web search, and file operations

## Architecture

### Core Execution Engine (core/src)

- Workflow engine: DAG execution with cycle detection and message passing
- Node system: autonomous agents with configurable prompts and tool sets
- Tool framework: TypeScript tool discovery and MCP protocol support
- Memory system: chunked storage and summarization for large contexts

### Evolution Module (core/src/improvement)

- Genetic programming: tournament selection, semantic crossover, multi-objective fitness
- Iterative evolution: root cause analysis with targeted improvements
- Fitness functions: weighted evaluation of accuracy (primary), cost, and execution time
- Mutation operators: prompt rewording, tool addition/removal, topology modifications

## Usage

The system requires evaluation datasets (question-answer pairs) for fitness assessment. Evolution optimizes workflows to maximize accuracy on these datasets while minimizing cost and execution time.

```typescript
// in the near future, you would be able to call:
import { Workflow } from "@flowflow/workflow"
import { tools, evals, models } from "./myData"

// Create workflow with training dataset
const workflow = await Workflow.train({
  goal: "Find all physical stores of a company",
  tools,
  evals,
  models,
})

// use the workflow with a new, untrained input.
const addresses = await workflow.ask("Find all Tony Chocolonely stores")
// ["Oudebrugsteeg 15", "Danzigerkade 23B"]
```

## Development

```bash
# Install dependencies (also builds shared packages)
bun install

# Configure environment
cp .env.example .env.local
# Fill in your API keys (OPENROUTER_API_KEY or OPENAI_API_KEY)

# Run your first workflow (without Supabase - uses in-memory storage):
USE_MOCK_PERSISTENCE=true bun -C packages/core run once

# Or train your first workflow iteratively:
USE_MOCK_PERSISTENCE=true bun -C packages/core run iterative
```

## Optimization Algorithms

Two complementary optimization strategies:

**Iterative Improvement**: Single workflow optimization through:

- Performance analysis by LLM evaluator
- Root cause identification of failures
- Targeted modifications to prompts, tools, or structure
- Typical convergence: 5-10 iterations

**Genetic Programming**: Population-based optimization through:

- Tournament selection (k=3) with elitism
- Semantic crossover preserving workflow validity
- Mutation operators: prompt modification (40%), tool changes (30%), structural changes (30%)
- Multi-objective fitness: accuracy (weight=0.7), cost (0.2), time (0.1)
- Population size: 10-50 genomes, 10+ generations

## Development Roadmap

### Architectural/First-Use Todos (HIGH PRIORITY)

- [x] Running a workflow should be possible without supabase (via `USE_MOCK_PERSISTENCE=true`)
- [x] Login for external users (Clerk authentication integrated)
- [x] Isolate core module (`@lucky/core` package with clean exports)
- [ ] Isolate Evolutionary module

### System Robustness

- [ ] Partial workflow execution from dashboard (priority 1)
- [ ] Message contracts and validation (priority 2)
- [ ] Deterministic node execution modes

### Observability Infrastructure

- [ ] Full node trace export as JSONL (priority 1)
- [ ] Single node execution and debugging (priority 3)
- [ ] OpenTelemetry integration (priority 4)
- [ ] Real-time evolutionary progress visualization

### Optimization Capabilities

- [ ] Multi-armed bandit algorithms for exploration-exploitation balance
- [ ] Fine-grained evolutionary analysis and mutation strategies
- [ ] Semantic mutation effectiveness optimization
- [ ] Cross-workflow knowledge transfer

### Tool Integration

- [ ] Shared tool knowledge base across workflows
- [ ] 3-second MCP tool integration via visual dashboard
- [ ] Workflow-to-MCP conversion for composability
- [ ] Parallel multi-message node communication
- [ ] Tool spec: for tool selection: description for selection of tool + metrics to do this
- [ ] Tool spec: for using the tool: a long description on how to use the tool + metrics

## Research Contributions

This framework serves as an experimental platform for studying evolutionary optimization of multi-agent systems:

1. **Evolvable Workflow Representation**: JSON-encoded DAGs amenable to genetic operations while maintaining semantic validity
2. **Hybrid Optimization**: Combines gradient-free genetic algorithms with LLM-based semantic understanding for workflow improvement
3. **Non-Sandboxed Evaluation**: Tests workflows on real tasks with actual tool execution (file I/O, web requests, code execution)
4. **Evolutionary Analytics**: Complete genealogy tracking, mutation effectiveness analysis, and population diversity metrics

**Empirical Results**:

- 29% improvement in tool selection accuracy for smaller models
- 80-95% context compression through hierarchical summarization
- Convergence typically within 10 generations for 5-node workflows

**Research Applications**: Automated workflow discovery, emergent agent specialization, tool-use capability enhancement for language models.

## License

CC BY‑NC 4.0 — see [LICENSE](LICENSE).
