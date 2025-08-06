# Runtime-Core API Documentation

This document describes the exact API and interface between the runtime and core modules in the workflow evolution system.

## Architecture Overview

```
┌─────────────────┐
│   App Module    │  (Next.js API routes & UI)
│  /app/src/      │
└────────┬────────┘
         │ imports from
         ▼
┌─────────────────┐
│  Core Module    │  (Workflow engine & evolution)
│  /core/src/     │
└────────┬────────┘
         │ imports from
         ▼
┌─────────────────┐
│ Runtime Module  │  (Configuration & settings)
│/runtime/settings│
└─────────────────┘
```

## Data Flow: Runtime → Core

### 1. Configuration Objects

**Source:** `/runtime/settings/constants.ts`  
**Consumer:** All core modules via `import { CONFIG, PATHS } from "@runtime/settings/constants"`

#### CONFIG Object Structure
```typescript
export const CONFIG: FlowRuntimeConfig = {
  // Evolution settings
  evolution: {
    mode: "cultural" | "GP",
    population: {
      size: number,
      eliteRatio: number,
      immigrantRatio: number,
      initialPopulationSize: number
    },
    maxGenerations: number,
    iterationBudget: number,
    timeBudgetSeconds: number
  },
  
  // Workflow configuration
  workflow: {
    parallelExecution: boolean,
    coordinationType: "sequential" | "hierarchical"
  },
  
  // Model selection
  models: {
    nano: { model: string, temperature: number },
    medium: { model: string, temperature: number },
    high: { model: string, temperature: number }
  },
  
  // Other settings
  verification: { allowCycles: boolean },
  improvement: { flags: { maxRetriesForWorkflowRepair: number } }
}
```

#### PATHS Object Structure
```typescript
export const PATHS: FlowPathsConfig = {
  memory: string,        // Base memory directory
  logging: string,       // Logging directory
  config: string,        // Configuration files
  prompts: string,       // Prompt templates
  dsl: string,          // DSL definitions
  test: {
    memory: string,      // Test memory directory
    logging: string      // Test logging directory
  }
}
```

### 2. Model Constants

**Source:** `/runtime/settings/constants.ts`  
**Consumer:** Core AI interaction modules

```typescript
export const MODELS = {
  nano: { model: "claude-3-5-haiku-20241022", temperature: 0.5 },
  medium: { model: "claude-3-5-sonnet-20241022", temperature: 0.7 },
  high: { model: "o1-preview", temperature: 1 }
}
```

## Data Flow: Core → App

### 1. Workflow Invocation

**Function:** `invokeWorkflow`  
**Location:** `/core/src/workflow/runner/invokeWorkflow.ts`  
**Called by:** `/app/src/app/api/workflow/invoke/route.ts`

#### Input Structure (InvocationInput)
```typescript
interface InvocationInput {
  workflow: WorkflowConfig;
  question: string;
  expectedFormat?: string;
  metadata?: {
    source?: string;
    run_id?: string;
    generation_id?: string;
    iteration?: number;
  };
}
```

#### Output Structure (RunResult)
```typescript
interface RunResult {
  result: ProcessedResponse;
  metadata: {
    duration?: number;
    nodeExecutions?: number;
    errors?: string[];
  };
}
```

### 2. Evolution Execution

**Function:** `main` (orchestrator)  
**Location:** `/core/src/main.ts`  
**Called by:** Command line scripts via `bun run` commands

#### Evolution Input
```typescript
interface EvolutionConfig {
  mode: "cultural" | "GP";
  question: string;
  expectedFormat?: string;
  iterationBudget?: number;
  timeBudgetSeconds?: number;
}
```

#### Evolution Output
- Cultural mode: Iterative improvement results
- GP mode: Population evolution results with fitness scores

### 3. Workflow Verification

**Function:** `verifyWorkflow`  
**Location:** `/core/src/workflow/dsl/verification/verifyWorkflow.ts`  
**Called by:** `/app/src/app/api/workflow/verify/route.ts`

#### Verification Input
```typescript
interface VerificationInput {
  workflow: WorkflowConfig;
  options?: {
    allowCycles?: boolean;
    checkTools?: boolean;
  };
}
```

#### Verification Output
```typescript
interface VerificationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}
```

## Type Contracts

### Shared Types Location
**File:** `/core/src/types.ts`

Key shared types:
- `FlowRuntimeConfig` - Main configuration structure
- `FlowPathsConfig` - File system paths
- `WorkflowConfig` - Workflow definition
- `NodeConfig` - Individual node configuration
- `ProcessedResponse` - Workflow execution result

## API Routes Exposed by App

### 1. POST `/api/workflow/invoke`
- **Purpose:** Execute a workflow directly
- **Core Function:** `invokeWorkflow`
- **Request Body:** `InvocationInput`
- **Response:** `RunResult`

### 2. POST `/api/workflow/execute`
- **Purpose:** Execute workflow via HTTP (decoupled)
- **Implementation:** Makes HTTP call to invoke endpoint
- **Request Body:** Same as invoke
- **Response:** Same as invoke

### 3. POST `/api/workflow/verify`
- **Purpose:** Validate workflow configuration
- **Core Function:** `verifyWorkflow`
- **Request Body:** `VerificationInput`
- **Response:** `VerificationResult`

### 4. GET `/api/evolution/[run_id]`
- **Purpose:** Get evolution run status
- **Database:** Direct Supabase query
- **Response:** Evolution run details

## Database Access Patterns

### From App Module
```typescript
// Direct queries for UI
import { retrieveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
const workflow = await retrieveWorkflowVersion(workflowId)
```

### From Core Module
```typescript
// Via utility functions
import { supabase } from "@core/utils/clients/supabase"
const { data, error } = await supabase
  .from("workflow_versions")
  .select("*")
```

## Import Rules

### ✅ Allowed Imports
- Core → Runtime (configuration only)
- App → Core (functions and types)
- App → Runtime (configuration)
- Runtime → Core (types only)

### ❌ Forbidden Imports
- Core → App (would create circular dependency)
- Runtime → App (runtime should be independent)

## Environment Variables

Required by runtime, consumed by core:
- `ANTHROPIC_API_KEY` - Claude API access
- `OPENAI_API_KEY` - OpenAI models
- `SUPABASE_ANON_KEY` - Database access
- `SUPABASE_PROJECT_ID` - Database project
- Other API keys for tools (Firecrawl, Tavily, etc.)

## Key Design Principles

1. **Unidirectional Dependencies:** App depends on Core, Core depends on Runtime
2. **Configuration-Driven:** Runtime provides all configuration
3. **Type Safety:** Shared types ensure contract compliance
4. **Decoupling:** HTTP API allows loose coupling between client and core
5. **Testability:** Each module can be tested independently

## Detailed Import Analysis

### Import Statistics
- **Core → Runtime:** 127 files import configuration and settings
- **Runtime → Core:** 55 files import types and utilities (creates circular dependency)
- **App → Core:** 60 files import workflow functions and types
- **Shared Module:** 31 files use @shared for common utilities

### Architectural Issues Found

#### 1. Circular Dependency
- Core depends on Runtime for configuration
- Runtime depends on Core for types and logging utilities
- This creates a circular dependency between modules

#### 2. Layering Violation
- `/core/src/utils/persistence/node/saveNode.ts` imports from app module:
  ```typescript
  import { safeJSON } from "../../../../../app/src/trace-visualization/db/Workflow/utils"
  ```
- This violates the principle that lower-level modules should not depend on higher-level ones

### Common Import Patterns

#### From Runtime to Core
```typescript
// Configuration constants
import { CONFIG, PATHS } from "@runtime/settings/constants"
import { MODELS } from "@runtime/settings/constants"

// Evolution settings
import { EVOLUTION_CONFIG } from "@runtime/settings/evolution"

// Tool configurations
import { TOOL_PATHS } from "@runtime/settings/tools"
```

#### From Core to App (via API routes)
```typescript
// Workflow execution
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"

// Workflow verification
import { verifyWorkflow } from "@core/workflow/dsl/verification/verifyWorkflow"

// Types and schemas
import type { WorkflowConfig, NodeConfig } from "@core/types"
```

#### From App to Core
```typescript
// Database operations
import { retrieveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"

// Workflow types
import { workflowSchema } from "@core/workflow/dsl/schemas/workflowSchema"

// Utility functions
import { parseWorkflow } from "@core/workflow/dsl/parse/parseWorkflow"
```

## Code Examples

### Example 1: Configuration Usage in Core
```typescript
// core/src/improvement/gp/EvolutionEngine.ts
import { CONFIG } from "@runtime/settings/constants"

export class EvolutionEngine {
  private readonly populationSize = CONFIG.evolution.population.size
  private readonly maxGenerations = CONFIG.evolution.maxGenerations
  
  async evolve() {
    for (let gen = 0; gen < this.maxGenerations; gen++) {
      // Evolution logic using runtime configuration
    }
  }
}
```

### Example 2: Core Function Called from App
```typescript
// app/src/app/api/workflow/invoke/route.ts
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"

export async function POST(request: Request) {
  const input = await request.json()
  
  const result = await invokeWorkflow({
    workflow: input.workflow,
    question: input.question,
    expectedFormat: input.expectedFormat
  })
  
  return Response.json(result)
}
```

### Example 3: Type Sharing
```typescript
// core/src/types.ts
export interface WorkflowConfig {
  name: string
  description: string
  setup: SetupConfig
  nodes: NodeConfig[]
}

// Used in both app and runtime modules
```

## Recommendations for Clean Architecture

1. **Extract Interface Types:** Move all shared interfaces to @shared module
2. **Dependency Injection:** Have Runtime inject config into Core at initialization
3. **Remove Circular Dependencies:** Runtime should not import from Core
4. **Fix Layering Violations:** Move shared utilities to appropriate lower-level modules
5. **Clear Module Boundaries:** Establish and enforce import rules via ESLint