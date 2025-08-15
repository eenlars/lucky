# Self-evolving Agentic Workflows

[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black)](https://nextjs.org/)
[![Tests](docs/badges/tests.svg)](docs/badges/tests.svg)
[![License](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey)](LICENSE)

![Evolutionary agentic workflows screenshot](docs/example.png)

Current multi-agent frameworks require manual workflow design, taking hours to configure and lacking native optimization capabilities. This creates a bottleneck: you know what problem to solve but not how agents should collaborate to solve it efficiently.

This framework automatically discovers and optimizes multi-agent workflows through an evolutionary algorithm, eliminating manual configuration while providing full observability of the optimization process.

## Three Core Differentiators

**1. Built for Optimization**  
The cultural evolution algorithm automatically discovers optimal agent collaboration patterns, tool usage, and workflow structures. Implements a tool-use algorithm letting less capable models use tools 29% more effectively than the baseline.

**2. 30-Second Deployment**
JSON-based workflow definitions enable immediate deployment without coding agent interactions or setting up complex infrastructures.

**3. Complete Observability**  
Real-time visualization of workflow execution, evolutionary progress, and performance metrics across all optimization dimensions.

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

Provide a small dataset of question-answer pairs. The system attempts to discover optimal workflows through evolutionary optimization.

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
# Install Bun (if not already installed)
# Windows:
powershell -c "irm bun.sh/install.ps1 | iex"
# macOS/Linux:
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Add your OPENROUTER_API_KEY to .env
cp .env.example .env

# Run your first workflow:
cd core && bun once

# Or train your first workflow (iteratively):
cd core && bun iterative

```

## Optimization Algorithms

The framework implements two primary optimization approaches:

**Iterative Improvement**: Iterative improvement, using feedback from an LLM-evaluator and a root-cause analysis to improve itself.

**Cultural Evolution (GP)**: Population-based evolution with LLM-guided crossover and mutation operations on workflow structures, agent prompts, tool use and more. Fitness is evaluated across accuracy, cost, and execution time. Selects the highest-performing workflows.

## Development Roadmap

### System Robustness

- [ ] Message contracts and validation (priority 2)
- [ ] Partial workflow execution from dashboard (priority 1)
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

## Research Contribution

This framework provides the first research testbed for evolution-guided workflow discovery in non-sandboxed environments. Key contributions:

- **Zero-Code Agentic Workflow Evolution**: JSON-based workflows that genetic programming can automatically optimize
- **Runtime Optimization**: Cultural evolution and genetic programming during execution
- **Real-World Tool Integration**: Support for actual coding tools beyond sandboxed environments
- **Comprehensive Research Infrastructure**: Genealogy tracking, fitness evaluation, and evolutionary analysis

The framework enables study of self-optimizing agentic workflows, bridging the gap between research automation and practical optimization while reducing manual maintenance requirements.

## License

CC BY-NC 4.0 - see [LICENSE](LICENSE) for details.
