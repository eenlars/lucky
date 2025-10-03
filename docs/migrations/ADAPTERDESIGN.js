/* 
  PERFECT ADAPTER DESIGN - Ultrathinking

  Core principle: Persistence is OPTIONAL observability, not execution requirement.

  The workflow system has two concerns:
  1. Execute workflows (core) - always needed
  2. Observe/track executions (persistence) - optional

  Current problem: these are tangled. Core can't run without DB.

  Perfect solution: Inversion of control
  - Core executes, returns rich results
  - Caller decides: log it, ignore it, transform it
  - Adapter is just a convenience for common case (save to Supabase)

  The adapter handles:
  - Observability: workflow invocations, node outputs, metrics
  - Version management: workflow/agent versions, genealogy
  - Dataset storage: datasets, records
  - Evolution tracking: runs, generations, fitness

  But NONE of this is required for execution.

  This file is a design sketch, not executable code.
  It demonstrates the ideal API and architecture.
  */

// ============ USAGE EXAMPLES ============

function exampleUsageWithPersistence() {
  // import { Workflow } from '@together/core'
  // import { SupabasePersistence } from '@together/adapter-supabase'

  const _persistence = {} // new SupabasePersistence({ url: '...', key: '...' })

  const _workflow = {} // Workflow.create({ agents: [...], entryNodeId: "start" }, { persistence })

  // Now workflow automatically logs invocations
  // const result = await workflow.run({ question: "analyze this", context: {...} })

  // Behind scenes: persistence.saveInvocation(result) called
  // But workflow.run() doesn't know/care - it's a hook
}

function exampleVersionManagement() {
  const _persistence = {}

  // Load existing version
  // const workflow = await persistence.loadWorkflowVersion('wf_123')

  // Save new version
  const _newWorkflow = {}
  // await persistence.saveWorkflowVersion({
  //   dsl: newWorkflow.toDSL(),
  //   parentId: 'wf_123',
  //   operation: 'mutation',
  //   commitMessage: 'Added error handling'
  // })
}

function exampleEvolution() {
  // import { EvolutionEngine } from '@together/evolution'

  const _persistence = {}
  const _engine = {} // new EvolutionEngine({ persistence })

  // Evolution loads versions, runs them, saves fitness
  // await engine.evolve({ runId: 'run_456', generations: 10, populationSize: 20 })

  // Evolution is just another consumer of:
  // - persistence.loadPopulation()
  // - workflow.run()
  // - persistence.updateFitness()
}

// ============ THE ADAPTER INTERFACE (minimal) ============

class SupabasePersistence {
  constructor(config) {
    // Lazy: only connects when methods called
    this.config = config
    this.client = null
  }

  // Observability
  async saveInvocation({ workflowId, nodeOutputs, duration, error }) {
    // INSERT into invocation table
  }

  async saveMetrics({ invocationId, metrics }) {
    // INSERT into metrics table
  }

  // Version management
  async saveWorkflowVersion({ dsl, parentId, operation, commitMessage }) {
    // INSERT into workflow_version, return ID
  }

  async loadWorkflowVersion(_id) {
    // SELECT and reconstruct Workflow
  }

  // Evolution queries (more complex)
  async loadPopulation(_runId, _generation) {
    // SELECT where run_id AND generation_id
  }

  async updateFitness(_workflowId, _fitness) {
    // UPDATE workflow_version SET fitness_score
  }

  // Datasets
  async saveDataset({ name, records }) {
    // INSERT dataset + records
  }
}

// ============ IN-MEMORY ADAPTER (for tests) ============

class InMemoryPersistence {
  constructor() {
    this.invocations = []
    this.versions = new Map()
    this.datasets = new Map()
  }

  async saveInvocation(data) {
    this.invocations.push(data)
  }

  async saveWorkflowVersion(data) {
    const id = `wf_${this.versions.size}`
    this.versions.set(id, data)
    return id
  }

  // ... same interface, zero config
}

// ============ HOW CORE USES IT (optional hooks) ============

class Workflow {
  constructor(dsl, options = {}) {
    this.dsl = dsl
    this.persistence = options.persistence // optional
    this.id = "wf_...."
  }

  async execute(_input) {
    // Core execution logic here
    return {
      nodeOutputs: {},
      error: null,
    }
  }

  async run(input) {
    const startTime = Date.now()

    // Execute (core logic, no DB)
    const result = await this.execute(input)

    // Observe (optional side effect)
    if (this.persistence) {
      await this.persistence.saveInvocation({
        workflowId: this.id,
        nodeOutputs: result.nodeOutputs,
        duration: Date.now() - startTime,
        error: result.error,
      })
    }

    return result
  }
}

// Prevent "not used" warnings
void exampleUsageWithPersistence
void exampleVersionManagement
void exampleEvolution
void SupabasePersistence
void InMemoryPersistence
void Workflow
