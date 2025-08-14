# Framework for Evolutionary Agentic Workflows

[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![Tests](docs/badges/tests.svg)](docs/badges/tests.svg)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey)](LICENSE)

![Evolutionary agentic workflows screenshot](docs/example.png)

Large Language Model (LLM)-based agents use coding tools to overcome hallucinations by extending their knowledge beyond training data. Manually designing agentic workflows only works if the solution is already known, requiring time and maintenance that slows prototyping. Of the 8 largest multi-agent frameworks surveyed, all take at least 3 hours to set up; 7 frameworks lack native visualization dashboards; tool mechanisms are hard-coded, and all frameworks are designed for manual setup and maintenance.

Research on automatic design of agentic workflows is limited to sandboxed environments, making findings difficult to transfer to real-world applications.

## Abstract

This framework bridges the gap between research automation and practical optimization by supporting automatic design and maintenance of agentic workflows for any code tool. To find workflows that pass an evaluation set, we use a cultural evolution search loop that mutates and selects workflows by changing prompts, roles, tools, and workflow structure. This variant of genetic programming uses environmental feedback to perform evolutionary operations, assessing fitness on accuracy, cost, and time.

To our knowledge, this is the first framework that supports zero-code workflows using JSON, includes runtime optimization, and enables automated generation of workflow research in non-sandboxed environments.

## Installation

```bash
# Clone and install dependencies at the repo root
git clone <repository-url>
cd lucky
bun install

# (Optional) Create environment file(s) where needed
# For the web app, create app/.env and set your API keys (e.g., OpenAI, Supabase)

# Start the web interface (from app/)
cd app && bun dev
```

## How It Works

The system treats AI agent workflows as evolvable data structures. Instead of manually coding agent interactions, you define workflows in JSON that the system can automatically improve through:

1. **Cultural Learning**: Iterative analysis and improvement of individual workflows
2. **Genetic Programming**: Population-based evolution with crossover and mutation
3. **Agent Handoffs**: Automatic routing between specialized agents based on task context
4. **Tool Integration**: Automatic discovery and use of 17+ tool categories

## Architecture

### Core Module

- **Workflow Engine**: Graph-based execution with message passing
- **Node Network**: Autonomous AI agents with tool access
- **Tool Registry**: Unified interface for code tools and external services
- **Memory Manager**: Context preservation and data summarization

### Optimization Module

- **Genetic Programming**: Population-based workflow evolution
- **Cultural Learning**: Knowledge preservation across generations
- **Fitness Evaluator**: Multi-dimensional performance assessment (accuracy, cost, time)
- **Mutation/Crossover**: LLM-powered semantic operations

## Usage

```typescript
import { Workflow } from "@/core/workflow/Workflow"

const workflow = await Workflow.create({
  goal: "Extract store locations from a website",
  nodes: [
    {
      name: "scraper",
      systemPrompt: "You are a web scraping specialist",
      tools: ["browserAutomation", "locationDataManager"],
    },
    {
      name: "validator",
      systemPrompt: "You validate extracted data quality",
      tools: ["locationDataManager"],
    },
  ],
})

const result = await workflow.execute("https://example.com")
```

## Development

```bash
# Start the web app (from app/)
cd app && bun dev

# Run e2e/essential tests (from repo root)
bun run test:gate

# TypeScript checks across all workspaces (from repo root)
bun run tsc

# (Optional) Run app-specific unit tests
cd app && bun run test
```

## Roadmap for Robustness

- [ ] Run partial workflows from dashboard (1)
- [ ] Message contracts (2)

## Roadmap for Observability and debugging

- [ ] View/download full node trace as JSONL (1)
- [ ] Run a single node (3)
- [ ] Opentelemetry Observability (4)

## Roadmap for Dashboard use

- [ ] Parallel-sending nodes can send multiple, different messages to connected nodes
- [ ] Visual dashboard 3-second MCP tool integration

## Roadmap for Tools

- [ ] Shared tool knowledge base

## Roadmap for Self-improving capabilities

- [ ] Support bandit search algorithms
- [ ] Tweak evo algorithm to mutate effectively
- [ ] Tweak evo algorithm to allow for fine grained analysis

## Roadmap for nice features

- [ ] Deterministic nodes
- [ ] A workflow becomes an MCP

## Research Contribution

This framework provides the first research testbed for evolution-guided workflow discovery in non-sandboxed environments. Key contributions:

- **Zero-Code Workflow Evolution**: JSON-based workflows that genetic programming can automatically optimize
- **Runtime Optimization**: Cultural evolution and genetic programming during execution
- **Real-World Tool Integration**: Support for actual coding tools beyond sandboxed environments
- **Comprehensive Research Infrastructure**: Genealogy tracking, fitness evaluation, and evolutionary analysis

The framework enables study of self-optimizing agentic workflows, bridging the gap between research automation and practical optimization while reducing manual maintenance requirements.

## License

CC BY-NC 4.0 - see [LICENSE](LICENSE) for details.
