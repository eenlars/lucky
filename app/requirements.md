# Self-Composing Workflow Platform – **Requirements v 0.1**

Core Goal

> Build an **autonomous workflow engine** in which “nodes” (LLM-powered agents) iteratively **learn, mutate, and compose themselves** into ever cheaper, more successful graphs.

## Part 1: Graph

### Workflow Execution

- Orchestrate directed graphs of agents exchanging structured messages.
- Enforce iteration and time budgets to avoid infinite loops.
- Capture full provenance of messages and state transitions.

### Versioning

- Immutable, lineage-tracked versions for workflows and nodes.
- Metadata to support diffs, rollbacks, and audits.

### Nodes

- Mutate system prompt, model, or tool set; each yields a new NodeVersion.
- Optional scoped memory to persist context across invocations.

### Edges

- Directed links from node outputs to inputs.
- Enforce acyclic or bounded-cycle structures.

### Messages

- Messages can be sent over edges.
- A message contains a payload.

### Node Invocation Logging

- It is possible to have a node wait for multiple messages until it starts the node invocation.
- Record start/end timestamps, USD cost, source node/edge, and JSON payloads.
- Centralize logs for analysis, debugging, and fitness scoring.

### Self-Improvement Loop

- Critic agent analyzes traces and suggests mutations.
- Generate and evaluate WorkflowVersion variants.
- Promote top-performing versions for future runs.

## Part 2: Self improvement (EVO)

After each workflow run, we want to evolve the workflow.

### Evolutionary Operations

#### Mutation

- Mutate the system prompt
- Mutate the tool use
- Create a new node

#### Selection

- Select top-performing nodes based on fitness metrics
- Prune underperforming variants

#### Crossover

- Combine successful traits from multiple nodes

#### Reproduction

- Clone and slightly modify successful nodes
- Scale population based on performance distribution
