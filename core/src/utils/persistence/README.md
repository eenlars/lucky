# Core Persistence Module

Comprehensive persistence system with workflow versioning, evolutionary genealogy tracking, and multi-backend storage for autonomous workflow execution.

## Quick Start

```typescript
import {
  registerWorkflowInDatabase,
  createWorkflowInvocation,
} from "@core/persistence/workflow"
import { saveNodeInvocationToDB } from "@core/persistence/node"
import { createContextStore } from "@core/persistence/memory"

// Register workflow with evolution tracking
const workflowVersion = await registerWorkflowInDatabase({
  workflowVersionId: "wf_v1_abc123",
  workflowConfig: config,
  goal: "Analyze customer data",
  operation: "mutation",
  parentVersionId: "wf_v1_def456",
  evolutionContext: { generationId: "gen_1", runId: "run_1" },
})

// Create execution context
const contextStore = createContextStore("supabase", workflowInvocationId)
const invocation = await createWorkflowInvocation({
  workflowInvocationId: "wi_789",
  workflowVersionId: workflowVersion.id,
  workflowIO: { input: "Process this data..." },
})
```

## Architecture

```
persistence/
├── workflow/                    # Workflow lifecycle management
│   ├── registerWorkflow.ts     # Version registration with genealogy
│   ├── createInvocation.ts     # Execution instance creation
│   └── evolutionTracking.ts    # Genetic programming support
├── node/                        # Node execution persistence
│   ├── nodePersistence.ts      # Node configuration and memory
│   ├── saveNode.ts             # Node version registration
│   └── saveNodeInvocation.ts   # Execution result storage
├── message/                     # Inter-node communication
│   ├── main.ts                 # Message save/update operations
│   └── messageTypes.ts         # Message payload definitions
├── memory/                      # Context and data storage
│   ├── ContextStore.ts         # Multi-backend storage interface
│   ├── MemoryStore.ts          # In-memory storage implementation
│   ├── SupabaseStore.ts        # Cloud storage with chunking
│   └── contextHelpers.ts       # Storage utilities
├── file/                        # File-based persistence
│   ├── resultPersistence.ts    # Configuration file management
│   └── backupSystem.ts         # Timestamped backups
└── persistence.types.ts         # Shared type definitions
```

## Database Schema

### Core Tables and Relationships

```sql
-- Base workflow definitions
Workflow (id, name, description, created_at)

-- Versioned configurations with genealogy
WorkflowVersion (
  wf_version_id,           -- SHA-256 hash of config
  operation,               -- init, mutation, crossover, immigrant
  dsl,                     -- JSON workflow configuration
  parent_id,               -- Single parent reference
  parent1_id, parent2_id,  -- Crossover parent references
  generation_id,           -- Evolution generation
  run_id,                  -- Evolution run
  created_at
)

-- Individual workflow executions
WorkflowInvocation (
  workflow_invocation_id,
  workflow_version_id,
  workflow_io,             -- Input/output data
  metadata,                -- Execution metadata
  status,                  -- running, completed, failed
  created_at
)

-- Node configurations per workflow version
NodeVersion (
  node_version_id,
  workflow_version_id,
  node_id,
  system_prompt,
  tools,                   -- JSON array of available tools
  model_name,
  coordination
)

-- Individual node executions
NodeInvocation (
  node_invocation_id,
  node_version_id,
  workflow_invocation_id,
  summary,                 -- AI-generated summary
  large_summary,           -- Detailed execution summary
  usd_cost,                -- Execution cost tracking
  files_used,              -- Files accessed during execution
  status,                  -- pending, running, completed, failed
  start_time,
  end_time
)
```

## Workflow Persistence

### Version Management with Genealogy

Immutable workflow versions with complete evolution tracking:

```typescript
// Register new workflow version
const workflowVersion = await registerWorkflowInDatabase({
  workflowVersionId: generateVersionId(config), // SHA-256 hash
  workflowConfig: {
    nodes: [...],
    handoffs: [...],
    goal: "Process customer data"
  },
  operation: "mutation",              // or "crossover", "init", "immigrant"
  parentVersionId: "wf_v1_parent123", // Single parent for mutations

  // For crossover operations
  parent1Id: "wf_v1_parent1",
  parent2Id: "wf_v1_parent2",

  // Evolution context
  evolutionContext: {
    generationId: "gen_5",
    runId: "run_evolution_001",
    populationSize: 20,
    mutationRate: 0.1
  }
})
```

### Execution Lifecycle

```typescript
// Create workflow execution instance
const invocation = await createWorkflowInvocation({
  workflowInvocationId: generateId(),
  workflowVersionId: workflowVersion.id,
  workflowIO: {
    input: "Analyze this customer dataset...",
    files: ["customers.csv", "transactions.json"],
  },
  metadata: {
    configFiles: ["context.json"],
    executionMode: "production",
    priority: "high",
  },
})
```

### Evolution Tracking

Complete genealogy for genetic programming:

```typescript
// Track evolution genealogy
const genealogy = await getEvolutionGenealogy(workflowVersionId)
// Returns:
// {
//   generation: 5,
//   ancestors: ["wf_v1_gen4", "wf_v1_gen3", "wf_v1_gen2"],
//   descendants: ["wf_v1_gen6_child1", "wf_v1_gen6_child2"],
//   operation: "mutation",
//   fitness: 0.85
// }
```

## Node Persistence

### Node Configuration Storage

Persistent node configurations with memory management:

```typescript
class NodePersistenceManager {
  private memory = new Map<string, string>()
  private invocationTranscript: Array<{
    input: WorkflowMessage
    output: string
  }> = []

  // Register node configuration
  async registerNode(
    workflowVersionId: string
  ): Promise<{ nodeVersionId: string }> {
    const nodeVersion = await saveNodeToDB({
      workflowVersionId,
      nodeId: this.nodeId,
      systemPrompt: this.systemPrompt,
      tools: this.tools,
      modelName: this.modelName,
      coordination: this.coordination,
    })

    return { nodeVersionId: nodeVersion.id }
  }

  // Persistent memory management
  getMemory(): Record<string, string> {
    return Object.fromEntries(this.memory)
  }
}
```

### Execution Result Storage

```typescript
// Save node execution results
const nodeInvocation = await saveNodeInvocationToDB({
  nodeVersionId: "nv_123",
  workflowInvocationId: "wi_456",
  nodeId: "data-processor",
  output: {
    content: "Analysis complete: Found 3 key insights...",
    agentSteps: [
      { tool: "csvReader", cost: 0.001, calls: 2 },
      { tool: "contextHandler", cost: 0.0005, calls: 1 },
    ],
    handoffDecision: { type: "handoff", nextNodeId: "report-generator" },
  },
  summary: "Processed customer data and identified key trends",
  costs: {
    total: 0.025,
    model: 0.02,
    tools: 0.005,
  },
  filesUsed: ["customers.csv", "analysis_config.json"],
})
```

## Message Persistence

### Inter-Node Communication Storage

```typescript
const Messages = {
  // Save workflow message
  save: async (message: WorkflowMessage) => {
    await saveMessageToDB({
      messageId: message.id,
      workflowInvocationId: message.workflowInvocationId,
      fromNodeId: message.fromNodeId,
      toNodeId: message.toNodeId,
      payload: message.payload,
      role: message.role, // "user", "assistant", "system"
      content: message.content,
      sequence: message.sequence,
      timestamp: message.timestamp,
    })
  },

  // Update message processing status
  update: async ({ message, updates }) => {
    await updateMessageInDB(message.id, {
      status: updates.status,
      targetInvocationId: updates.targetInvocationId,
      processingResult: updates.processingResult,
      modifiedAt: new Date(),
    })
  },
}
```

### Message Types and Payloads

```typescript
type MessagePayload =
  | { type: "delegation"; data: any; instructions?: string }
  | { type: "result"; data: any; metadata?: Record<string, any> }
  | { type: "feedback"; score: number; comments: string[] }
  | { type: "data"; content: string; format: "json" | "csv" | "text" }
  | { type: "error"; error: string; recoverable: boolean }
  | { type: "control"; action: string; parameters?: any }
```

## Memory Persistence

### Multi-Backend Context Storage

Flexible storage with automatic chunking and summarization:

```typescript
interface ContextStore {
  // Core operations
  get<T>(scope: "workflow" | "node", key: string): Promise<T | undefined>
  set<T>(scope: "workflow" | "node", key: string, value: T): Promise<void>
  list(scope: "workflow" | "node"): Promise<string[]>
  delete(scope: "workflow" | "node", key: string): Promise<void>

  // Advanced operations
  getSummary(
    scope: "workflow" | "node",
    key: string
  ): Promise<string | undefined>
  listWithInfo(scope: "workflow" | "node"): Promise<ContextFileInfo[]>
}
```

### In-Memory Storage Implementation

Fast access with automatic summarization:

```typescript
class MemoryStore implements ContextStore {
  private data = new Map<string, any>()
  private summaries = new Map<string, string>()
  private metadata = new Map<string, ContextFileInfo>()

  async set<T>(
    scope: "workflow" | "node",
    key: string,
    value: T
  ): Promise<void> {
    const scopedKey = `${scope}:${key}`

    // Store data with metadata
    this.data.set(scopedKey, value)
    this.metadata.set(scopedKey, {
      key,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      size: JSON.stringify(value).length,
      dataType: typeof value,
    })

    // Generate summary for large data
    if (JSON.stringify(value).length > 1000) {
      const summary = await this.generateSummary(value)
      this.summaries.set(scopedKey, summary)
    }
  }
}
```

### Supabase Storage Implementation

Cloud persistence with chunking and atomic operations:

```typescript
class SupabaseStore implements ContextStore {
  async set<T>(
    scope: "workflow" | "node",
    key: string,
    value: T
  ): Promise<void> {
    const content = JSON.stringify(value)
    const filePath = `${this.workflowInvocationId}/${scope}/${key}`

    // Chunk large content
    if (content.length > CHUNK_SIZE) {
      await this.storeChunked(filePath, content)
    } else {
      await this.storeAtomic(filePath, content)
    }

    // Generate and store summary
    const summary = await this.generateSummary(content)
    await this.storeSummary(filePath, summary)

    // Store metadata
    await this.storeMetadata(filePath, {
      size: content.length,
      dataType: typeof value,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    })
  }

  private async storeAtomic(filePath: string, content: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .upload(filePath + "/data", content, {
        cacheControl: "3600",
        upsert: true,
      })

    if (error) {
      await this.retryWithBackoff(() => this.storeAtomic(filePath, content))
    }
  }
}
```

## Performance Optimization

### Batch Operations

```typescript
// Batch database operations
const batchOperations = [
  saveNodeInvocationToDB(node1Data),
  saveNodeInvocationToDB(node2Data),
  saveNodeInvocationToDB(node3Data),
]

// Execute in transaction
await supabase.rpc("batch_save_invocations", {
  invocations: batchOperations,
})
```

### Connection Pooling

```typescript
// Singleton database connection
class DatabaseConnection {
  private static instance: SupabaseClient

  static getInstance(): SupabaseClient {
    if (!this.instance) {
      this.instance = createClient(SUPABASE_URL, SUPABASE_KEY, {
        db: {
          schema: "public",
          pool: {
            max: 20,
            idleTimeoutMillis: 30000,
          },
        },
      })
    }
    return this.instance
  }
}
```

### Caching Strategy

```typescript
// LRU cache for frequently accessed data
class CachedContextStore implements ContextStore {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes

  async get<T>(
    scope: "workflow" | "node",
    key: string
  ): Promise<T | undefined> {
    const cacheKey = `${scope}:${key}`
    const cached = this.cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data
    }

    const data = await this.backingStore.get<T>(scope, key)
    this.cache.set(cacheKey, { data, timestamp: Date.now() })
    return data
  }
}
```

## Error Handling and Recovery

### Retry Logic with Exponential Backoff

```typescript
class RetryManager {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        if (attempt === maxRetries - 1) throw error

        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    throw new Error("Max retries exceeded")
  }
}
```

### Constraint Violation Handling

```typescript
async function saveWithConstraintHandling(data: any) {
  try {
    return await saveToDatabase(data)
  } catch (error) {
    if (error.code === "23505") {
      // Unique constraint violation
      lgg.warn("Duplicate entry detected, skipping save")
      return await findExistingRecord(data)
    }
    throw error
  }
}
```

## File-Based Persistence

### Atomic File Operations

```typescript
// Atomic JSON file writing
export const persistWorkflow = async (
  workflowConfig: WorkflowConfig,
  filename: string
): Promise<void> => {
  const outputPath = path.join(process.cwd(), "workflows", filename)

  // Ensure directory exists
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  // Write atomically with backup
  const backupPath = `${outputPath}.backup.${Date.now()}`

  try {
    // Create backup if file exists
    if (
      await fs
        .access(outputPath)
        .then(() => true)
        .catch(() => false)
    ) {
      await fs.copyFile(outputPath, backupPath)
    }

    // Write new content
    await fs.writeFile(outputPath, JSON.stringify(workflowConfig, null, 2))

    // Clean up old backups
    await cleanupOldBackups(path.dirname(outputPath))
  } catch (error) {
    // Restore backup if write failed
    if (
      await fs
        .access(backupPath)
        .then(() => true)
        .catch(() => false)
    ) {
      await fs.copyFile(backupPath, outputPath)
    }
    throw error
  }
}
```

## Integration Examples

### Workflow Integration

```typescript
// In Workflow.ts
class Workflow {
  private contextStores = new Map<string, ContextStore>()

  async setup(): Promise<void> {
    // Register workflow version with persistence
    const workflowVersion = await registerWorkflowInDatabase({
      workflowVersionId: generateVersionId(this.config),
      workflowConfig: this.config,
      goal: this.goal,
      operation: "init",
    })

    // Create context store for this invocation
    const contextStore = createContextStore(
      "supabase",
      this.workflowInvocationId
    )
    this.contextStores.set("main", contextStore)

    // Store initial workflow context
    await contextStore.set("workflow", "config", this.config)
    await contextStore.set("workflow", "goal", this.goal)
  }
}
```

### Node Integration

```typescript
// In WorkFlowNode.ts
class WorkFlowNode {
  private persistence: NodePersistenceManager

  async invoke(
    message: WorkflowMessage,
    context: WorkflowContext
  ): Promise<NodeResult> {
    // Save invocation start
    const invocationId = await this.persistence.startInvocation({
      workflowInvocationId: context.workflowInvocationId,
      input: message,
    })

    try {
      // Execute node logic
      const result = await this.executeInternal(message, context)

      // Save successful result
      await this.persistence.completeInvocation(invocationId, {
        output: result,
        costs: result.costs,
        summary: result.summary,
      })

      return result
    } catch (error) {
      // Save error result
      await this.persistence.failInvocation(invocationId, error)
      throw error
    }
  }
}
```

## Best Practices

1. **Use Scoped Storage**: Separate workflow and node-specific data
2. **Implement Retry Logic**: Handle transient failures gracefully
3. **Batch Operations**: Group related database operations
4. **Monitor Costs**: Track persistence costs alongside execution costs
5. **Cache Frequently Used Data**: Implement appropriate caching strategies
6. **Validate Before Saving**: Prevent corrupt data from entering the system
7. **Use Atomic Operations**: Ensure data consistency
8. **Implement Proper Error Handling**: Distinguish between recoverable and permanent errors
9. **Regular Cleanup**: Remove old data to prevent storage bloat
10. **Test Persistence Logic**: Comprehensive testing of all persistence operations
