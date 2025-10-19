# @lucky/adapter-supabase

Persistence adapter for the together workflow system. Provides optional database persistence through a clean interface with support for both Supabase and in-memory storage.

## Installation

```bash
bun add @lucky/adapter-supabase
```

## Quick Start

```typescript
import { createPersistence } from '@lucky/adapter-supabase'

// Use Supabase (requires environment variables)
const persistence = createPersistence({ backend: 'supabase' })

// Use in-memory (for tests)
const persistence = createPersistence({ backend: 'memory' })

// Auto-detect from USE_MOCK_PERSISTENCE env var
const persistence = createPersistence()
```

## Environment Variables

For Supabase backend (server-only adapter):

```bash
# Either provide a full URL or a project ID
SUPABASE_URL=https://<project>.supabase.co
# or
SUPABASE_PROJECT_ID=your-project-id

# Choose one key path:
# - Service role (server workloads; bypasses RLS; never expose to browsers)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# - Or anon key (RLS enforced; typically for user-scoped, token-bearing clients)
SUPABASE_ANON_KEY=your-anon-key

# Optional controls
USE_MOCK_PERSISTENCE=false   # if true, always use in-memory
REQUIRE_PERSISTENCE=1        # if set, fail instead of falling back to memory
```

## Architecture

### Factory Pattern

The package exports a `createPersistence()` factory function that returns an `IPersistence` implementation:

```typescript
interface PersistenceConfig {
  backend?: 'supabase' | 'memory'
  useMock?: boolean
}

function createPersistence(config?: PersistenceConfig): IPersistence
```

### Interface Segregation

The main `IPersistence` interface is composed of specialized sub-interfaces:

- `IPersistence` - Main workflow operations (versions, invocations, config)
- `IEvolutionPersistence` - Evolution tracking (runs, generations)
- `INodePersistence` - Node versions and invocations
- `IMessagePersistence` - Message routing and updates

### Domain Modules

```
src/
├── workflows/          # Workflow version and invocation logic
├── nodes/             # Node persistence
├── messages/          # Message persistence
├── evolution/         # Evolution tracking
├── utils/             # Field mapping utilities
├── errors/            # Domain error types
├── factory.ts         # Factory function
├── persistence-interface.ts  # Type definitions
├── supabase-persistence.ts   # Supabase implementation
└── memory-persistence.ts     # In-memory implementation
```

## Usage

### Basic Workflow Operations

```typescript
const persistence = createPersistence({ backend: 'supabase' })

// Create workflow version
await persistence.createWorkflowVersion({
  workflowVersionId: 'wf_v1',
  workflowId: 'my_workflow',
  commitMessage: 'Initial version',
  dsl: { nodes: [...], edges: [...] },
  operation: 'init'
})

// Create workflow invocation
await persistence.createWorkflowInvocation({
  workflowInvocationId: 'inv_1',
  workflowVersionId: 'wf_v1',
  metadata: { user: 'test' }
})

// Update invocation
await persistence.updateWorkflowInvocation({
  workflowInvocationId: 'inv_1',
  status: 'completed',
  endTime: new Date().toISOString(),
  fitnessScore: 0.95
})
```

### Evolution Tracking

```typescript
const persistence = createPersistence({ backend: 'supabase' })

// Create evolution run
const runId = await persistence.evolution.createRun({
  goalText: 'Optimize workflow performance',
  config: { populationSize: 20, generations: 10 },
  status: 'running',
  evolutionType: 'gp'
})

// Create generation
const genId = await persistence.evolution.createGeneration({
  generationNumber: 1,
  runId
})

// Complete generation with stats
await persistence.evolution.completeGeneration(
  {
    generationId: genId,
    bestWorkflowVersionId: 'wf_v2'
  },
  {
    generation: 1,
    bestFitness: 0.95,
    avgFitness: 0.78,
    worstFitness: 0.42,
    fitnessStdDev: 0.15,
    evaluationCost: 2.5,
    evaluationsPerHour: 120,
    improvementRate: 0.12
  }
)
```

### Node Operations

```typescript
// Save node version
const { nodeVersionId } = await persistence.nodes.saveNodeVersion({
  nodeId: 'analyzer',
  workflowVersionId: 'wf_v1',
  config: {
    modelName: 'claude-3-5-sonnet-20241022',
    systemPrompt: 'You are a data analyzer...',
    mcpTools: ['fetch', 'search'],
    codeTools: ['processData'],
    description: 'Analyzes input data',
    memory: {},
    handOffs: ['reporter']
  }
})

// Save node invocation
const { nodeInvocationId } = await persistence.nodes.saveNodeInvocation({
  nodeId: 'analyzer',
  workflowInvocationId: 'inv_1',
  workflowVersionId: 'wf_v1',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  messageId: 'msg_1',
  usdCost: 0.05,
  output: { analysis: '...' },
  summary: 'Analyzed 100 records',
  model: 'claude-3-5-sonnet-20241022'
})
```

### Message Operations

```typescript
// Save message
await persistence.messages.save({
  messageId: 'msg_1',
  fromNodeId: 'analyzer',
  toNodeId: 'reporter',
  role: 'user',
  payload: { data: '...' },
  createdAt: new Date().toISOString(),
  workflowInvocationId: 'inv_1'
})

// Update message
await persistence.messages.update('msg_1', {
  payload: { data: '...updated' }
})
```

### Error Handling

The adapter provides domain-specific errors:

```typescript
import {
  PersistenceError,
  WorkflowNotFoundError,
  NodeVersionMissingError,
  DatasetRecordNotFoundError,
  InvalidInputError
} from '@lucky/adapter-supabase'

try {
  await persistence.loadWorkflowConfig('invalid_id')
} catch (error) {
  if (error instanceof WorkflowNotFoundError) {
    // Handle missing workflow
  } else if (error instanceof PersistenceError) {
    // Handle general persistence error
    console.error(error.cause)  // Access underlying error
  }
}
```

## Database Schema

### Core Tables

**Workflow**
- `wf_id` (PK) - Workflow identifier
- `description` - Workflow description

**WorkflowVersion**
- `wf_version_id` (PK) - Version identifier
- `workflow_id` (FK) - References Workflow
- `commit_message` - Version description
- `dsl` (JSONB) - Workflow configuration
- `operation` - init | crossover | mutation | immigrant
- `parent1_id`, `parent2_id` (FK) - Evolution genealogy
- `generation_id` (FK) - References Generation
- `created_at` - Timestamp

**WorkflowInvocation**
- `wf_invocation_id` (PK) - Invocation identifier
- `wf_version_id` (FK) - References WorkflowVersion
- `status` - running | completed | failed
- `start_time`, `end_time` - Execution times
- `usd_cost` - Execution cost
- `fitness_score` - Fitness evaluation
- `accuracy` - Accuracy score
- `run_id` (FK) - References EvolutionRun
- `generation_id` (FK) - References Generation
- `metadata` (JSONB) - Custom metadata
- `workflow_input`, `expected_output` - Input/output data

**NodeVersion**
- `node_version_id` (PK) - Version identifier
- `node_id` - Node identifier
- `wf_version_id` (FK) - References WorkflowVersion
- `version` - Version number
- `llm_model` - Model name
- `system_prompt` - System prompt
- `tools` (JSONB) - Tool list
- `description` - Node description
- `memory` (JSONB) - Node memory
- `handoffs` (JSONB) - Handoff rules

**NodeInvocation**
- `node_invocation_id` (PK) - Invocation identifier
- `node_id` - Node identifier
- `wf_invocation_id` (FK) - References WorkflowInvocation
- `wf_version_id` (FK) - References WorkflowVersion
- `start_time`, `end_time` - Execution times
- `usd_cost` - Execution cost
- `output` (JSONB) - Node output
- `summary` - Execution summary
- `model` - Model used
- `status` - completed | failed
- `extras` (JSONB) - Additional data

**Message**
- `msg_id` (PK) - Message identifier
- `from_node_id` - Source node
- `to_node_id` - Target node
- `wf_invocation_id` (FK) - References WorkflowInvocation
- `role` - Message role
- `payload` (JSONB) - Message content
- `timestamp` - Creation time

### Evolution Tables

**EvolutionRun**
- `run_id` (PK) - Run identifier
- `goal_text` - Evolution goal
- `config` (JSONB) - Run configuration
- `status` - running | completed | failed
- `start_time`, `end_time` - Run times
- `evolution_type` - gp | iterative
- `notes` - Run notes

**Generation**
- `generation_id` (PK) - Generation identifier
- `number` - Generation number
- `run_id` (FK) - References EvolutionRun
- `start_time`, `end_time` - Generation times
- `best_workflow_version_id` (FK) - Best genome
- `comment` - Generation summary
- `feedback` - Evolution feedback

**DatasetRecord**
- `dataset_record_id` (PK) - Record identifier
- `workflow_input` - Input data
- `ground_truth` - Expected output

## Field Mapping

The adapter automatically converts between camelCase (application) and snake_case (database):

```typescript
// Application code (camelCase)
{
  workflowVersionId: 'wf_v1',
  workflowInvocationId: 'inv_1',
  fitnessScore: 0.95
}

// Database (snake_case)
{
  wf_version_id: 'wf_v1',
  wf_invocation_id: 'inv_1',
  fitness_score: 0.95
}
```

Mapping is handled transparently by the `applyFieldMappings()` and `reverseFieldMappings()` utilities.

## Testing

Use in-memory persistence for tests:

```typescript
import { createPersistence } from '@lucky/adapter-supabase'

describe('workflow tests', () => {
  let persistence

  beforeEach(() => {
    persistence = createPersistence({ backend: 'memory' })
  })

  it('should create workflow version', async () => {
    await persistence.createWorkflowVersion({
      workflowVersionId: 'test_v1',
      workflowId: 'test',
      commitMessage: 'Test version',
      dsl: { nodes: [] }
    })

    const exists = await persistence.workflowVersionExists('test_v1')
    expect(exists).toBe(true)
  })
})
```

## Cleanup

The adapter provides maintenance utilities:

```typescript
// Cleanup stale records (>10 minutes old)
const stats = await persistence.cleanupStaleRecords()

console.log(stats)
// {
//   workflowInvocations: 3,
//   nodeInvocations: 12,
//   evolutionRuns: 1,
//   generations: 2,
//   messages: 45,
//   evolutionRunsEndTimes: 1
// }
```

## Advanced Usage

### Direct Implementation Access

For advanced use cases, you can directly instantiate implementations:

```typescript
import { SupabasePersistence, InMemoryPersistence } from '@lucky/adapter-supabase'

const supabase = new SupabasePersistence()
const memory = new InMemoryPersistence()
```

### Custom Error Handling

```typescript
import { PersistenceError } from '@lucky/adapter-supabase'

class CustomPersistenceWrapper {
  constructor(private persistence: IPersistence) {}

  async safeLoadConfig(id: string) {
    try {
      return await this.persistence.loadWorkflowConfig(id)
    } catch (error) {
      if (error instanceof PersistenceError) {
        // Log, retry, or fallback logic
        throw new ApplicationError('Config load failed', error)
      }
      throw error
    }
  }
}
```
