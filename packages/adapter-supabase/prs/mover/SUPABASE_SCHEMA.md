# Supabase Database Schema & Dependents

Complete documentation of the database schema, relationships, and all code that depends on it.

---

## Overview

**9 Core Tables** organized into **3 functional domains:**

1. **Workflow Domain** - Workflow definitions, versions, and executions
2. **Evolution Domain** - Evolution runs, generations, and genetic programming
3. **Support Domain** - Messages, datasets, evaluators, feedback

---

## How the Adapter is Used: Integration Points

### Where the Adapter Lives

```
packages/adapter-supabase/
├── src/
│   ├── persistence-interface.ts      ← Contract that consumers depend on
│   ├── supabase-persistence.ts       ← Main adapter implementation
│   ├── memory-persistence.ts         ← In-memory fallback (testing)
│   ├── factory.ts                    ← Creates persistence instances
│   ├── evolution/
│   │   └── evolution-persistence.ts  ← Evolution-specific operations
│   ├── workflows/
│   │   └── workflow-persistence.ts   ← Workflow-specific operations
│   ├── nodes/
│   │   └── node-persistence.ts       ← Node-specific operations
│   └── messages/
│       └── message-persistence.ts    ← Message-specific operations
└── dist/
    └── index.ts                      ← Public exports
```

### Adapter Instantiation: Where It's Created

#### 1. **Core Package Entry Point** (`@lucky/core`)

**File:** `packages/core/src/core/main.ts`

```typescript
// Creates the persistence adapter once at startup
import { createPersistence } from "@together/adapter-supabase"

export function initializePersistence() {
  const persistence = createPersistence({
    projectId: process.env.SUPABASE_PROJECT_ID,
    anonKey: process.env.SUPABASE_ANON_KEY,
  })
  return persistence
}

// Global instance used throughout @lucky/core
export const persistence = initializePersistence()
```

**Why here:** Core initializes the adapter at startup so all downstream modules can use it.

---

#### 2. **Evolution Engine** (`@lucky/core/src/improvement/gp/`)

**File:** `packages/core/src/improvement/gp/EvolutionEngine.ts`

```typescript
export class EvolutionEngine {
  constructor(private persistence: IPersistence) {}

  async runEvolution() {
    // Uses persistence for reading/writing evolution state
    const run = await this.persistence.evolution?.createRun({...})
    const generation = await this.persistence.evolution?.createGeneration({...})
    // ...
  }
}
```

**Injected:** Passed as constructor dependency from main.ts

---

#### 3. **Workflow Execution** (`@lucky/core/src/workflow/`)

**File:** `packages/core/src/workflow/Workflow.ts`

```typescript
export class Workflow {
  async save(persistence: IPersistence) {
    await persistence.createWorkflowVersion({...})
    await persistence.createWorkflowInvocation({...})
  }
}
```

**Usage:** Called by workflow runner

---

### Usage Pattern 1: Creating a Workflow Run

**Flow:**
```
invokeWorkflow()                           ← Entry point
  ├─ persistence.createWorkflowInvocation()
  │   └─ Insert into WorkflowInvocation table
  ├─ Queue node executions
  │   ├─ persistence.nodes.createNodeInvocationStart()
  │   └─ Insert into NodeInvocation table
  ├─ Node execution loop
  │   ├─ Execute LLM
  │   ├─ persistence.messages.save()
  │   └─ Insert into Message table
  └─ Complete invocation
      ├─ persistence.updateWorkflowInvocation()
      └─ Update WorkflowInvocation with results
```

**File Locations:**

| Step | File | Method |
|------|------|--------|
| Entry | `packages/core/src/workflow/runner/invokeWorkflow.ts:205` | `invokeWorkflow()` |
| Create invocation | `packages/core/src/workflow/Workflow.ts:362` | `createInvocation()` |
| Save node invocation start | `packages/core/src/node/invocation/executeNode.ts:150` | `createNodeInvocationStart()` |
| Save message | `packages/core/src/messages/pipeline/MessageQueue.ts:87` | `messages.save()` |
| Update on completion | `packages/core/src/workflow/runner/invokeWorkflow.ts:398` | `updateWorkflowInvocation()` |

---

### Usage Pattern 2: Evolution Run

**Flow:**
```
EvolutionEngine.run()                      ← Main evolution loop
  ├─ persistence.evolution.createRun()
  │   └─ Insert into EvolutionRun table
  ├─ Loop: for each generation
  │   ├─ persistence.evolution.createGeneration()
  │   │   └─ Insert into Generation table
  │   ├─ Create population (genomes)
  │   │   ├─ persistence.createWorkflowVersion() × population_size
  │   │   └─ Insert into WorkflowVersion table
  │   ├─ Evaluate population
  │   │   ├─ persistence.createWorkflowInvocation() × population_size
  │   │   └─ Run each workflow invocation (see Pattern 1)
  │   ├─ Compute fitness
  │   ├─ persistence.evolution.completeGeneration()
  │   │   └─ Update Generation with best_workflow_version_id
  │   └─ Select best genomes for crossover/mutation
  └─ persistence.evolution.completeRun()
      └─ Update EvolutionRun with end_time
```

**File Locations:**

| Step | File | Method |
|------|------|--------|
| Main loop | `packages/core/src/improvement/gp/EvolutionEngine.ts:50` | `run()` |
| Create run | `packages/core/src/improvement/gp/RunService.ts:45` | `createRun()` |
| Create generation | `packages/core/src/improvement/gp/RunService.ts:85` | `createGeneration()` |
| Create workflow versions | `packages/core/src/improvement/gp/Genome.ts:120` | `save()` |
| Evaluate workflow | (Pattern 1 above) | `invokeWorkflow()` |
| Complete generation | `packages/core/src/improvement/gp/RunService.ts:200` | `completeGeneration()` |

---

### Where Each Package Uses the Adapter

#### **@lucky/core** - Main consumer

```
packages/core/src/
├── workflow/
│   ├── Workflow.ts              ← Saves workflow versions
│   ├── runner/
│   │   ├── invokeWorkflow.ts    ← Creates/updates workflow invocations
│   │   └── queueRun.ts          ← Creates node invocations
│   └── __tests__/
│       └── save-workflow-db.spec.test.ts ← Tests persistence
├── node/
│   ├── invocation/
│   │   └── executeNode.ts       ← Creates node invocations, saves messages
│   └── tools/
│       └── context.ts           ← Reads workflow context from persistence
├── messages/
│   ├── pipeline/
│   │   ├── MessageQueue.ts      ← Saves messages
│   │   └── create/
│   │       └── createMessage.ts ← Creates messages for inter-node comms
├── improvement/
│   ├── gp/
│   │   ├── EvolutionEngine.ts   ← Reads/writes evolution state
│   │   ├── RunService.ts        ← Creates runs and generations
│   │   ├── Genome.ts            ← Saves workflow versions (genomes)
│   │   ├── Population.ts        ← Queries workflow versions for evaluation
│   │   └── Fitness.ts           ← Updates fitness in invocations
└── context/
    └── executionContext.ts      ← Stores clerk_id and other metadata
```

**Critical File:** `packages/core/src/core/main.ts` initializes and exports the global `persistence` instance.

---

#### **apps/web** - Frontend integration

```
apps/web/src/
├── lib/api/
│   ├── api-client.ts            ← Calls backend API endpoints
│   ├── query.ts                 ← React Query hooks for data fetching
│   └── schemas.ts               ← Type validation (mirrors adapter types)
├── components/
│   ├── WorkflowList.tsx         ← Lists workflows (calls API)
│   ├── WorkflowVersionHistory.tsx ← Shows workflow versions (calls API)
│   ├── ExecutionTracker.tsx     ← Shows invocation progress (calls API)
│   └── EvolutionMonitor.tsx     ← Shows evolution runs (calls API)
```

**Note:** Frontend doesn't use adapter directly. It calls backend API endpoints that use the adapter.

---

#### **@lucky/shared** - Type definitions

```
packages/shared/src/types/
├── public.types.ts              ← Supabase generated types
├── supabase.types.ts            ← Re-exports for convenience
└── contracts/
    └── workflow.ts              ← Domain-specific types (NOT used yet)
```

**Note:** Shared exports types that adapter and core both depend on.

---

### Data Flow: How a Request Flows Through the System

#### Scenario: Frontend user clicks "Run Workflow"

```
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (apps/web)                                             │
│  ├─ User clicks "Execute Workflow"                              │
│  └─ API call: POST /api/workflows/{id}/execute                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend API (apps/web/api or packages/core/src/http)           │
│  ├─ Route handler receives request                              │
│  └─ Calls: invokeWorkflow(workflowVersionId)                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Workflow Execution (@lucky/core/src/workflow/)                  │
│  ├─ Create workflow invocation                                  │
│  │   └─ persistence.createWorkflowInvocation()                  │
│  │       └─ Adapter inserts into WorkflowInvocation table       │
│  ├─ Queue node executions                                       │
│  │   └─ persistence.nodes.createNodeInvocationStart()           │
│  │       └─ Adapter inserts into NodeInvocation table           │
│  ├─ Execute nodes sequentially                                  │
│  │   ├─ For each node:                                          │
│  │   │   ├─ persistence.loadWorkflowConfig()                    │
│  │   │   │   └─ Adapter reads WorkflowVersion DSL               │
│  │   │   ├─ Execute node.execute() (LLM call)                   │
│  │   │   ├─ persistence.messages.save()                         │
│  │   │   │   └─ Adapter inserts into Message table              │
│  │   │   └─ persistence.nodes.updateNodeInvocationEnd()         │
│  │   │       └─ Adapter updates NodeInvocation                  │
│  └─ Complete workflow                                           │
│      └─ persistence.updateWorkflowInvocation()                  │
│          └─ Adapter updates WorkflowInvocation with results     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Supabase Database                                               │
│  ├─ WorkflowVersion table (read)                                │
│  ├─ WorkflowInvocation table (insert, update)                   │
│  ├─ NodeInvocation table (insert, update)                       │
│  └─ Message table (insert)                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (apps/web) - Real-time updates                         │
│  ├─ Polls API for execution status                              │
│  ├─ API calls: persistence.loadWorkflowInvocation()             │
│  │   └─ Adapter reads from WorkflowInvocation table             │
│  └─ Displays progress to user                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Data Flow: How Evolution Works

```
┌─────────────────────────────────────────────────────────────────┐
│ Evolution Initialization                                        │
│  ├─ EvolutionEngine.run(config)                                 │
│  └─ persistence.evolution.createRun()                           │
│      └─ Adapter inserts into EvolutionRun table                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ For each generation (G = 1..max_generations):                   │
│                                                                 │
│  1. Create generation                                           │
│     └─ persistence.evolution.createGeneration()                 │
│         └─ Adapter inserts into Generation table                │
│                                                                 │
│  2. Create population (P = population_size genomes)             │
│     For each genome G in population:                            │
│     └─ Genome.save() (mutation or crossover)                    │
│         └─ persistence.createWorkflowVersion()                  │
│             └─ Adapter inserts into WorkflowVersion table       │
│                 (parent1_id/parent2_id track genetics)          │
│                                                                 │
│  3. Evaluate population                                         │
│     For each genome G in population:                            │
│     ├─ invokeWorkflow(wf_version_id) [See workflow flow above]  │
│     └─ persistence.createWorkflowInvocation()                   │
│         ├─ Adapter inserts into WorkflowInvocation              │
│         └─ Sets generation_id for tracking                      │
│                                                                 │
│  4. Compute fitness                                             │
│     ├─ Query: SELECT * FROM WorkflowInvocation WHERE            │
│     │         generation_id = ?                                 │
│     └─ Evaluate outputs, compute fitness scores                 │
│         └─ persistence.updateWorkflowInvocation()               │
│             └─ Adapter updates fitness scores                   │
│                                                                 │
│  5. Select best genomes                                         │
│     ├─ Query: SELECT * FROM WorkflowVersion WHERE               │
│     │         generation_id = ? ORDER BY fitness DESC           │
│     └─ Keep top K for next generation                           │
│                                                                 │
│  6. Complete generation                                         │
│     └─ persistence.evolution.completeGeneration()               │
│         └─ Adapter updates Generation with stats                │
│            (best_workflow_version_id, avg_fitness, etc.)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Evolution Completion                                            │
│  └─ persistence.evolution.completeRun()                         │
│      └─ Adapter updates EvolutionRun with end_time              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Frontend (apps/web)                                             │
│  ├─ Polls for evolution status                                  │
│  ├─ Shows generation progress                                   │
│  ├─ Shows fitness trends                                        │
│  └─ Allows user to stop or export best workflow                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Critical Adapter Methods Used

#### **Workflow Domain Methods**

| Method | Called From | Purpose | Tables Affected |
|--------|-------------|---------|-----------------|
| `ensureWorkflowExists()` | `Workflow.save()` | Ensure parent WF exists | Workflow |
| `createWorkflowVersion()` | `Workflow.save()`, `Genome.save()` | Save workflow definition | WorkflowVersion, NodeVersion |
| `createWorkflowInvocation()` | `invokeWorkflow()` | Create execution record | WorkflowInvocation |
| `updateWorkflowInvocation()` | `invokeWorkflow()`, `Fitness.compute()` | Update execution results | WorkflowInvocation |
| `loadWorkflowConfig()` | `executeNode()`, workflow runner | Get workflow DSL | WorkflowVersion |
| `nodes.createNodeInvocationStart()` | `executeNode()` | Record node start | NodeInvocation |
| `nodes.updateNodeInvocationEnd()` | `executeNode()` | Record node completion | NodeInvocation |
| `messages.save()` | `MessageQueue.add()` | Store inter-node message | Message |

#### **Evolution Domain Methods**

| Method | Called From | Purpose | Tables Affected |
|--------|-------------|---------|-----------------|
| `evolution.createRun()` | `EvolutionEngine.run()` | Start evolution | EvolutionRun |
| `evolution.createGeneration()` | `RunService.createGeneration()` | Create generation | Generation |
| `evolution.completeGeneration()` | `RunService.completeGeneration()` | Finalize generation | Generation |
| `evolution.getLastCompletedGeneration()` | Evolution replay | Get previous state | Generation, EvolutionRun |

---

### Testing: In-Memory Adapter

**File:** `packages/adapter-supabase/src/memory-persistence.ts`

```typescript
// For tests, use in-memory implementation
const inMemoryPersistence = new InMemoryPersistence()

// Has same interface as SupabasePersistence
await inMemoryPersistence.createWorkflowInvocation(data)
```

**Used in tests:**
- `packages/core/src/workflow/__tests__/save-workflow-db.spec.test.ts`
- `packages/core/src/improvement/gp/__tests__/Evolution.spec.test.ts`

---

### Summary: The Adapter's Role

```
                    @lucky/core
              (Workflow execution engine)
                        ↓
          IPersistence interface contract
          (persistence-interface.ts)
                        ↓
        ┌──────────────────────────────┐
        │  SupabasePersistence         │ ← Production
        │  (supabase-persistence.ts)   │
        │                              │
        │  InMemoryPersistence         │ ← Testing
        │  (memory-persistence.ts)     │
        └──────────────────────────────┘
                        ↓
      Supabase PostgreSQL Database
```

**The adapter:**
- ✅ Implements `IPersistence` interface
- ✅ Handles all database operations
- ✅ Translates between application code and database
- ✅ Manages entity lifecycle (create, read, update)
- ✅ Enforces constraints (WFV must have WF, WI must have WFV)
- ✅ Provides both Supabase and in-memory implementations

**The responsibility boundary:**
- ❌ Adapter does NOT decide business logic (only implements interface)
- ❌ Adapter does NOT know about LLM execution (only stores results)
- ❌ Adapter does NOT do fitness computation (only stores computed values)
- ✅ Adapter ONLY handles persistence layer concerns

---

## Domain 1: Workflow Execution

### Table: `Workflow` (WF)

**Purpose:** Top-level workflow definition. One workflow can have multiple versions.

**Schema:**
```
PrimaryKey: wf_id (string)
Columns:
  - wf_id: string (PK, caller-provided)
  - description: string (required)
  - clerk_id: string | null (who owns this workflow)
  - created_at: string (auto-set)
  - updated_at: string (auto-set)

Insert Contract:
  - description: required
  - wf_id: optional (generated if not provided)
  - clerk_id: optional (from context)

Upsert Strategy: Safe (low cardinality, workflow definitions are stable)
```

**Dependents:**
- **Read by:** `supabase-persistence.ts:ensureWorkflowExists()`
- **Created by:** `RunService.ts`, `invokeWorkflow.ts`
- **References from:** `WorkflowVersion.workflow_id` (FK)
- **CLI:** Used in Turbo workflow runs
- **Frontend:** Listed on workspace dashboard

**Relationships:**
```
Workflow (1) ──→ (Many) WorkflowVersion
                   └─→ (Many) WorkflowInvocation
```

---

### Table: `WorkflowVersion` (WFV)

**Purpose:** Immutable snapshot of workflow configuration. Each version is complete and self-contained.

**Schema:**
```
PrimaryKey: wf_version_id (string)
ForeignKeys:
  - workflow_id → Workflow.wf_id
  - generation_id → Generation.generation_id (optional, for evolution)
  - parent1_id → WorkflowVersion.wf_version_id (for GP crossover parent 1)
  - parent2_id → WorkflowVersion.wf_version_id (for GP crossover parent 2)

Columns:
  - wf_version_id: string (PK, caller-provided or generated)
  - workflow_id: string (FK, required)
  - dsl: Json (required, workflow DAG configuration)
  - commit_message: string (required, describes changes)
  - operation: "init" | "crossover" | "mutation" | "immigrant" (required)
  - generation_id: string | null (if created during evolution)
  - parent_id: string | null (deprecated, use parent1_id/parent2_id)
  - parent1_id: string | null (primary parent in crossover)
  - parent2_id: string | null (secondary parent in crossover)
  - input_schema: Json (input validation schema)
  - output_schema: Json | null (expected output schema)
  - knowledge: Json | null (evolution knowledge state)
  - iteration_budget: number (default: 10)
  - time_budget_seconds: number (default: 3600)
  - created_at: string (auto-set)
  - updated_at: string (auto-set)

Insert Contract:
  - workflow_id: required
  - dsl: required
  - commit_message: required
  - operation: required
  - wf_version_id: optional (generated if not provided as "wf_ver_${shortId()}")

Upsert Strategy: Safe (by wf_version_id, creation is atomic)
```

**State Transitions:**
```
Workflow NOT_EXISTS + WFV NOT_EXISTS
  → Auto-create Workflow + create WFV ⚠️ WARNING

Workflow EXISTS + WFV NOT_EXISTS
  → Create WFV ✅

Workflow EXISTS + WFV EXISTS
  → Upsert WFV ⚠️ WARNING: "Version already exists, updating"
```

**Dependents:**
- **Created by:** `RunService.createGeneration()`, `Workflow.save()`, `Genome.ts`
- **Read by:** `loadWorkflowConfig()`, all workflow execution
- **Referenced in:** Generation tracking, fitness evaluation
- **Evolution chain:** parent1_id, parent2_id track genetic lineage
- **DSL contains:** Node definitions, handoff rules, tool assignments
- **Frontend:** Version history, visualization
- **Queries:**
  - `SELECT * FROM WorkflowVersion WHERE workflow_id = ?` (get all versions)
  - `SELECT * FROM WorkflowVersion WHERE generation_id = ?` (best from generation)
  - `SELECT * FROM WorkflowVersion WHERE wf_version_id = ?` (load for execution)

**Relationships:**
```
WorkflowVersion (1) ──→ (Many) WorkflowInvocation
WorkflowVersion (1) ──→ (Many) NodeVersion
WorkflowVersion (1) ← (Many) WorkflowVersion (self-references via parent1/parent2)
WorkflowVersion (Many) ←─ (1) Generation.best_workflow_version_id
```

---

### Table: `WorkflowInvocation` (WI)

**Purpose:** Execution record for a workflow at a specific version. Captures input, output, and metrics.

**Schema:**
```
PrimaryKey: wf_invocation_id (string)
ForeignKeys:
  - wf_version_id → WorkflowVersion.wf_version_id (required)
  - run_id → EvolutionRun.run_id (optional, for evolution tracking)
  - generation_id → Generation.generation_id (optional, which evolution generation)
  - dataset_record_id → DatasetRecord.dataset_record_id (optional, for evaluation)
  - evaluator_id → Evaluator.evaluator_id (optional, who evaluated this)

Columns:
  - wf_invocation_id: string (PK, MUST be caller-provided, NOT generated)
  - wf_version_id: string (FK, required)
  - status: "running" | "completed" | "failed" (default: "running")
  - start_time: string (when execution started, default: now())
  - end_time: string | null (when execution ended)
  - usd_cost: number (cost of execution, default: 0)
  - workflow_input: Json | null (input to workflow)
  - workflow_output: Json | null (output from workflow)
  - run_id: string | null (for evolution runs)
  - generation_id: string | null (which generation this was evaluated in)
  - fitness: Json | null (computed fitness for evolution)
  - dataset_record_id: string | null (for dataset-based evaluation)
  - expected_output: string | null (ground truth for evaluation)
  - actual_output: string | null (evaluated output)
  - evaluator_id: string | null (which evaluator produced this result)
  - expected_output_type: Json | null (schema for expected output)
  - preparation: string | null (preparation steps taken)
  - feedback: string | null (feedback on execution)
  - extras: Json | null (implementation-specific extras)

Insert Contract (STRICT):
  - wf_invocation_id: REQUIRED, MUST be provided by caller
           (format: typically from workflow runner, e.g., "wfi_${hash}")
  - wf_version_id: required
  - start_time: optional (defaults to now())
  - status: optional (defaults to "running")
  - usd_cost: optional (defaults to 0)
  - All others: optional

Upsert Strategy: Update only (upsert allows updates to running invocations)
```

**Critical Constraints:**
```
❌ CANNOT insert without wf_invocation_id
   Reason: Invocations must have predictable IDs from workflow runner

❌ CANNOT insert if wf_version_id doesn't exist
   Reason: Every invocation must reference valid workflow definition

⚠️ AUTO-DEFAULTS applied:
   - status = "running"
   - start_time = now()
   - end_time = null
   - usd_cost = 0
```

**Dependents:**
- **Created by:** `Workflow.createInvocation()`, `queueRun.ts`
- **Updated by:** `invokeWorkflow.ts` (end state), `RunService.ts` (fitness)
- **Read by:** All execution tracking, evolution fitness calculation
- **Cascade updates:**
  - When WI completes → set end_time, status, usd_cost, workflow_output
  - When evaluated → set fitness, actual_output, evaluator_id
- **Queries:**
  - `SELECT * FROM WorkflowInvocation WHERE wf_version_id = ?` (all runs of version)
  - `SELECT * FROM WorkflowInvocation WHERE generation_id = ?` (all in generation)
  - `SELECT * FROM WorkflowInvocation WHERE run_id = ?` (all in evolution run)
  - `SELECT AVG(fitness) FROM WorkflowInvocation WHERE generation_id = ?` (average fitness)

**Relationships:**
```
WorkflowInvocation (Many) ←─ (1) WorkflowVersion
WorkflowInvocation (1) ──→ (Many) NodeInvocation
WorkflowInvocation (1) ──→ (Many) Message
WorkflowInvocation (Many) ←─ (1) Generation (for evolution)
WorkflowInvocation (Many) ←─ (1) EvolutionRun (for evolution)
```

---

### Table: `NodeVersion` (NV)

**Purpose:** Definition of a single AI agent node within a workflow version.

**Schema:**
```
PrimaryKey: node_version_id (string)
ForeignKey: wf_version_id → WorkflowVersion.wf_version_id (required)

Columns:
  - node_version_id: string (PK, generated or caller-provided)
  - wf_version_id: string (FK, required - which workflow contains this node)
  - node_id: string (logical node identifier within workflow)
  - llm_model: string (required, which LLM to use: "claude-3-5-sonnet", etc.)
  - system_prompt: string (required, agent system instructions)
  - tools: string[] (required, array of tool names available to node)
  - handoffs: string[] | null (valid node IDs this can handoff to)
  - waiting_for: string[] | null (node IDs that must complete first)
  - memory: Json | null (persistent memory state for node)
  - extras: Json (implementation-specific configuration)
  - description: string | null (human-readable node description)
  - version: number (required, versioning within workflow)
  - created_at: string (auto-set)
  - updated_at: string (auto-set)

Insert Contract:
  - wf_version_id: required
  - node_id: optional (auto-generated if not provided)
  - llm_model: required
  - system_prompt: required
  - tools: required (minimum 1)
  - extras: required
  - version: required
```

**Dependents:**
- **Created by:** Workflow DSL creation, evolution mutations
- **Read by:** Workflow execution engine
- **Referenced in:** NodeInvocation.node_version_id
- **Evolution:** Mutated in genetic programming (prompt, tools, model changes)
- **Queries:**
  - `SELECT * FROM NodeVersion WHERE wf_version_id = ?` (all nodes in workflow)
  - `SELECT system_prompt FROM NodeVersion WHERE node_version_id = ?` (load prompt for execution)

**Relationships:**
```
NodeVersion (1) ──→ (Many) NodeInvocation
NodeVersion (Many) ←─ (1) WorkflowVersion
```

---

### Table: `NodeInvocation` (NI)

**Purpose:** Execution record for a single node within a workflow execution.

**Schema:**
```
PrimaryKey: node_invocation_id (string)
ForeignKeys:
  - wf_version_id → WorkflowVersion.wf_version_id (required)
  - wf_invocation_id → WorkflowInvocation.wf_invocation_id (optional)
  - node_version_id → NodeVersion.node_version_id (optional)

Columns:
  - node_invocation_id: string (PK, usually auto-generated)
  - wf_version_id: string (FK, required - workflow context)
  - node_id: string (required - which node in workflow)
  - node_version_id: string | null (which node definition was used)
  - wf_invocation_id: string | null (parent workflow invocation)
  - status: "running" | "completed" | "failed" (required)
  - start_time: string (required)
  - end_time: string | null
  - output: Json | null (what the node produced)
  - summary: string | null (human-readable summary of node execution)
  - error: Json | null (error details if failed)
  - model: string | null (actual LLM model used)
  - usd_cost: number (cost of this node invocation)
  - files: string[] | null (files created during execution)
  - metadata: Json | null (internal metadata)
  - extras: Json | null (implementation-specific data)
  - attempt_no: number (which attempt: 1st, 2nd retry, etc.)
  - updated_at: string (auto-updated)

Insert Contract:
  - node_invocation_id: optional (usually auto-generated)
  - wf_version_id: required
  - node_id: required
  - status: required
  - start_time: required
```

**Dependents:**
- **Created by:** Execution pipeline when node starts
- **Updated by:** Execution pipeline when node completes
- **Read by:** Execution tracking, message routing
- **Used for:** Retries (attempt_no), debugging (summary, error)
- **Queries:**
  - `SELECT * FROM NodeInvocation WHERE wf_invocation_id = ?` (all nodes in workflow run)
  - `SELECT SUM(usd_cost) FROM NodeInvocation WHERE wf_invocation_id = ?` (total cost)

**Relationships:**
```
NodeInvocation (Many) ←─ (1) WorkflowInvocation
NodeInvocation (1) ──→ (Many) Message (origin_invocation_id)
NodeInvocation (1) ──→ (Many) Message (target_invocation_id)
```

---

## Domain 2: Evolution & Genetic Programming

### Table: `EvolutionRun` (ER)

**Purpose:** Top-level container for a genetic programming or iterative evolution run.

**Schema:**
```
PrimaryKey: run_id (string)

Columns:
  - run_id: string (PK, caller-provided or generated)
  - goal_text: string (required, what are we optimizing for)
  - evolution_type: string | null ("genetic_programming" or "iterative")
  - config: Json (required, evolution configuration)
  - status: "running" | "completed" | "interrupted" | "failed"
  - start_time: string (required, auto-set)
  - end_time: string | null (when run finished)
  - notes: string | null (summary or reason for stopping)
  - clerk_id: string | null (who initiated this run)

Insert Contract:
  - goal_text: required
  - config: required
  - run_id: optional (generated if not provided as "run_${shortId()}")
```

**Dependents:**
- **Created by:** Evolution engine (`EvolutionEngine.ts`, `RunService.ts`)
- **Updated by:** When evolution completes
- **Contains:** Multiple generations
- **Queries:**
  - `SELECT * FROM EvolutionRun WHERE clerk_id = ?` (user's runs)
  - `SELECT * FROM EvolutionRun ORDER BY start_time DESC LIMIT 10` (recent runs)

**Relationships:**
```
EvolutionRun (1) ──→ (Many) Generation
EvolutionRun (1) ──→ (Many) WorkflowInvocation (via run_id)
```

---

### Table: `Generation`

**Purpose:** Single generation within an evolution run. Contains population of genome candidates.

**Schema:**
```
PrimaryKey: generation_id (string)
ForeignKeys:
  - run_id → EvolutionRun.run_id (required)
  - best_workflow_version_id → WorkflowVersion.wf_version_id (optional)

Columns:
  - generation_id: string (PK, caller-provided or generated)
  - run_id: string (FK, required - which evolution run)
  - number: number (required, generation index: 0, 1, 2, ...)
  - start_time: string (required, when generation started)
  - end_time: string | null (when generation completed)
  - best_workflow_version_id: string | null (best genome of this generation)
  - comment: string | null (generation summary/stats)
  - feedback: string | null (feedback on generation performance)
  - clerk_id: string | null (user who owns this)

Insert Contract:
  - run_id: required
  - number: required (generation sequential number)
  - generation_id: optional (generated if not provided as "gen_${shortId()}")
  - start_time: optional (defaults to now())

Upsert Strategy: Update allowed (generation state evolves as population is evaluated)
```

**State Machine:**
```
CREATE generation
  ↓
ADD workflow invocations (WI entries with generation_id)
  ↓
EVALUATE all invocations (compute fitness)
  ↓
UPDATE generation with best_workflow_version_id and stats
  ↓
COMPLETE generation (set end_time)
```

**Dependents:**
- **Created by:** `RunService.createGeneration()`
- **Updated by:** When evaluation completes with fitness stats
- **References:** All `WorkflowInvocation` where `generation_id = this.generation_id`
- **Queries:**
  - `SELECT * FROM Generation WHERE run_id = ? ORDER BY number DESC LIMIT 1` (last generation)
  - `SELECT COUNT(*) FROM WorkflowInvocation WHERE generation_id = ?` (population size)
  - `SELECT AVG(fitness) FROM WorkflowInvocation WHERE generation_id = ?` (avg fitness)

**Relationships:**
```
Generation (1) ──→ (Many) WorkflowInvocation
Generation (Many) ←─ (1) EvolutionRun
Generation (Many) ←─ (1) WorkflowVersion (best_workflow_version_id)
```

---

## Domain 3: Support Tables

### Table: `Message`

**Purpose:** Communication record between nodes during workflow execution.

**Schema:**
```
PrimaryKey: msg_id (string)
ForeignKeys:
  - wf_invocation_id → WorkflowInvocation.wf_invocation_id (required)
  - origin_invocation_id → NodeInvocation.node_invocation_id (optional)
  - target_invocation_id → NodeInvocation.node_invocation_id (optional)

Columns:
  - msg_id: string (PK, auto-generated)
  - wf_invocation_id: string (FK, required - which workflow context)
  - from_node_id: string | null (sending node ID)
  - to_node_id: string | null (receiving node ID)
  - origin_invocation_id: string | null (which node execution sent it)
  - target_invocation_id: string | null (which node execution receives it)
  - payload: Json (required, message content)
  - role: "user" | "assistant" | "system" | "function" (required)
  - seq: number (sequence in conversation)
  - created_at: string (auto-set)

Insert Contract:
  - wf_invocation_id: required
  - payload: required
  - role: required
  - msg_id: optional (auto-generated)
  - seq: optional (auto-incrementing per invocation)
```

**Dependents:**
- **Created by:** Message routing system
- **Read by:** LLM context building
- **Used for:** Conversation history reconstruction
- **Queries:**
  - `SELECT * FROM Message WHERE wf_invocation_id = ? ORDER BY seq` (conversation history)

**Relationships:**
```
Message (Many) ←─ (1) WorkflowInvocation
Message (Many) ←─ (1) NodeInvocation (via origin_invocation_id)
Message (Many) ←─ (1) NodeInvocation (via target_invocation_id)
```

---

### Table: `DataSet` & `DatasetRecord` & `DatasetVersion`

**Purpose:** Storage of evaluation datasets for workflow testing.

**Schema Summary:**
```
DataSet (1) ──→ (Many) DatasetRecord
DataSet (1) ──→ (Many) DatasetVersion

DatasetRecord contains:
  - dataset_id (FK)
  - workflow_input: Json | null (input to test workflow with)
  - ground_truth: unknown (expected output)
  - rubric: Json | null (evaluation criteria)

DatasetVersion is a snapshot of dataset at a point in time.
```

**Dependents:**
- **Used by:** Workflow evaluation (comparing actual vs expected)
- **Referenced in:** WorkflowInvocation.dataset_record_id
- **Queries:**
  - `SELECT * FROM DatasetRecord WHERE dataset_id = ? LIMIT 100` (sample records)

---

### Table: `Evaluator`

**Purpose:** Definition of how to evaluate workflow outputs.

**Schema:**
```
PrimaryKey: evaluator_id (string)

Columns:
  - evaluator_id: string (PK)
  - name: string (required)
  - config: Json | null (evaluator-specific configuration)
  - rubric: Json | null (evaluation criteria)
  - clerk_id: string | null (owner)
  - created_at: string (auto-set)
```

**Dependents:**
- **Referenced in:** WorkflowInvocation.evaluator_id
- **Used by:** Evaluation pipeline to compute fitness

---

### Table: `WorkflowInvocationEval`

**Purpose:** Evaluation results for a workflow invocation.

**Schema:**
```
PrimaryKey: wf_inv_eval_id (string)
ForeignKey: wf_inv_id → WorkflowInvocation.wf_invocation_id

Columns:
  - wf_inv_eval_id: string (PK)
  - wf_inv_id: string | null (FK)
  - accuracy: number | null (computed accuracy score)
  - feedback: string | null (evaluator feedback)
  - created_at: string (auto-set)
```

**Dependents:**
- **Created by:** Evaluation system
- **Used for:** Tracking evaluation history

---

### Table: `feedback`

**Purpose:** User feedback on system performance.

**Schema:**
```
PrimaryKey: feedback_id (string)

Columns:
  - feedback_id: string (PK)
  - content: string (required)
  - context: string | null (where feedback came from)
  - status: string | null (feedback status)
  - clerk_id: string | null (who provided feedback)
  - created_at: string (auto-set)
```

**Dependents:**
- **Used for:** System improvement feedback

---

## Cross-Domain Dependencies

### The Execution Flow

```
1. Workflow created
   └─→ Workflow (inserted)

2. Workflow version created (static DSL)
   ├─→ WorkflowVersion (inserted)
   ├─→ NodeVersion × N (one per node in DAG)
   └─→ Can be from evolution run or manual creation

3. Workflow invocation created (new execution)
   ├─→ WorkflowInvocation (inserted)
   ├─→ NodeInvocation × N (one per node per execution)
   └─→ Message × M (inter-node communication)

4. For evolution runs:
   ├─→ EvolutionRun (inserted once at start)
   ├─→ Generation × K (one per generation)
   ├─→ WorkflowVersion × K (best genomes)
   ├─→ WorkflowInvocation × (K × population_size)
   └─→ Fitness computed from evaluator
```

### Cascade Effects

**When Workflow is created/updated:**
- Nothing cascades (workflow is stable)

**When WorkflowVersion is created:**
- NodeVersion entries must also be created (part of same transaction)
- May reference Generation if from evolution

**When WorkflowInvocation is created:**
- NodeInvocation entries created as execution proceeds
- Message entries created during node-to-node communication
- May reference Generation and EvolutionRun if part of evolution

**When Generation completes:**
- All WorkflowInvocation records with this generation_id are finalized
- Fitness computed from invocation results
- Best WorkflowVersion selected
- May trigger new Generation or end EvolutionRun

---

## Critical Paths for Adapter Responsibility

### Path 1: Create Workflow Invocation

```
INPUT: createWorkflowInvocation({
  wf_invocation_id,        // MUST be provided by caller
  wf_version_id,           // MUST exist
  workflow_input,          // optional
  run_id,                  // optional (for evolution)
  generation_id,           // optional (for evolution)
})

VALIDATION:
  1. Check: wf_invocation_id is provided ✅ If not → Error
  2. Check: wf_version_id exists ✅ If not → Error
  3. Infer: workflow_id from wf_version_id
  4. Check: workflow exists ✅ If not → Error (inconsistent state)
  5. If run_id provided: check EvolutionRun exists
  6. If generation_id provided: check Generation exists

DEFAULTS APPLIED:
  - status = "running"
  - start_time = now()
  - end_time = null
  - usd_cost = 0

INSERT: WorkflowInvocation record with all fields
```

### Path 2: Create Workflow Version (from evolution)

```
INPUT: createWorkflowVersion({
  wf_version_id,           // optional (generated)
  workflow_id,             // required
  dsl,                     // required
  operation,               // required ("init", "crossover", "mutation")
  generation_id,           // optional (if from evolution)
  parent1_id, parent2_id,  // optional (for crossover genealogy)
})

VALIDATION:
  1. Check: workflow_id exists
     If not → Auto-create Workflow with description=commit_message ⚠️
  2. Generate: wf_version_id if not provided
  3. Ensure: dsl has __schema_version

INSERT: WorkflowVersion record
```

### Path 3: Update Workflow Invocation (completion)

```
INPUT: updateWorkflowInvocation({
  wf_invocation_id,       // required (must exist)
  status,                 // "completed" or "failed"
  end_time,              // when it ended
  workflow_output,       // result of execution
  usd_cost,              // final cost
  actual_output,         // for evaluation
  fitness,               // computed by evaluator
})

VALIDATION:
  1. Check: wf_invocation_id exists ✅ If not → Error
  2. Check: status transition is valid (running → completed|failed)

UPDATE: WorkflowInvocation record
```

---

## Schema Constraints & Assumptions

### Hard Constraints
```
✅ wf_invocation_id: Must be provided, never auto-generated
✅ wf_version_id: Must exist before creating invocation
✅ workflow_id: Must exist before creating version (or auto-create)
✅ run_id & generation_id: Must both be provided together (or both absent)
```

### Assumptions
```
⚠️ Timestamps use ISO-8601 format (2024-01-15T10:30:00.000Z)
⚠️ All IDs are strings (no auto-increment integers)
⚠️ Json fields support arbitrary nested structures
⚠️ Status enums: "running" | "completed" | "failed"
⚠️ Nulls are allowed for optional fields, not undefined
```

### Queries Used by Core

```sql
-- Get workflow version
SELECT * FROM WorkflowVersion WHERE wf_version_id = ?

-- Get all nodes in workflow
SELECT * FROM NodeVersion WHERE wf_version_id = ?

-- Get invocation for updates
SELECT * FROM WorkflowInvocation WHERE wf_invocation_id = ?

-- Get all nodes executed in this invocation
SELECT * FROM NodeInvocation WHERE wf_invocation_id = ?

-- Get message history for context
SELECT * FROM Message WHERE wf_invocation_id = ? ORDER BY seq

-- Get generation stats
SELECT
  COUNT(*) as population_size,
  AVG(fitness) as avg_fitness,
  MAX(fitness) as best_fitness
FROM WorkflowInvocation
WHERE generation_id = ?

-- Get last generation
SELECT * FROM Generation
WHERE run_id = ?
ORDER BY number DESC
LIMIT 1
```

---

## Summary: What Depends on What

| If You Change... | These Break |
|---|---|
| Workflow fields | Workflow creation, workflow lookups |
| WorkflowVersion fields | DSL loading, version comparison, evolution |
| WorkflowInvocation.wf_version_id FK | Need to ensure version exists before insert |
| WorkflowInvocation.status enum | Status transitions, workflow state machines |
| Generation.number semantics | Evolution run ordering, generation numbering |
| Message.role enum | LLM context building, conversation history |
| NodeInvocation → WorkflowInvocation FK | Execution tracking, cost aggregation |

---

## Migration Path

If the adapter needs to change how it works:

1. **Query patterns** - These are hardcoded in workflow execution code
2. **Default values** - Changing start_time, status defaults breaks expectations
3. **Foreign keys** - Removing FK constraints breaks validation
4. **Enums** - Adding or removing status/operation options breaks workflows

Any schema change should:
- ✅ Be backward compatible (add columns as nullable)
- ✅ Update this documentation
- ✅ Add migration in Supabase migrations folder
- ✅ Update types in `public.types.ts`
- ✅ Run type generation script

