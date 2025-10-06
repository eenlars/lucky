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

- `apps/web/` — Next.js UI, pages, API routes.
- `packages/core/` — Core TypeScript logic, CLI scripts, unit/integration tests.
- `apps/examples/` — Example tools, settings, and workflows.
- `packages/shared/` — Shared TypeScript utilities (built with tsup).
- `tests/e2e-essential/` — Minimal smoke + gate tests with golden trace.
- `docs/`, `resources/`, `mcp/` — Supporting assets and tools.

## Installation

Prerequisites: Bun 1.2+, Node 18+, Git.

```bash
# Clone and install dependencies at the repo root
git clone <repository-url>
cd together
bun install  # This also builds required packages

# (Optional) Create environment file(s) where needed
# For the web app, create apps/web/.env and set your provider/database keys

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

## Environment Keys (UI)

- Location: `Settings` page (`/settings`).
- Purpose: Store API keys and environment-style variables locally in the browser for use by workflows on this device.
- Storage: LocalStorage in the current browser; never synced to server or version control.
- Behavior: Add/update/remove keys, then click `Save Changes`. Use `Reset` to discard unsaved edits.
- Format: Keys must match `^[A-Z_][A-Z0-9_]*$` (e.g., `OPENAI_API_KEY`, `_DEBUG`).

## Configuration

- App env: `apps/web/.env` (see `apps/web/.env.example`). Placeholder keys are used in tests; live model checks require real keys.
- Path aliases: prefer `@core`, `@shared` in tests and code where available.
- Formatting/Linting: Prettier config at `.prettierrc.yaml`; run `cd apps/web && bun run format` or `cd packages/core && bun run format`.

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

# App environment
cp apps/web/.env.example apps/web/.env

# Run your first workflow:
cd packages/core && bun once

# Or train your first workflow (iteratively):
cd packages/core && bun iterative
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

### Architectual/first-use Todos (HIGH PRIORITY)

- [ ] Running a workflow should be possible without supabase
- [ ] Login for external users
- [ ] Isolate core module
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
