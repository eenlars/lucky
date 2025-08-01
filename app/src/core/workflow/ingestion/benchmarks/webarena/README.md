# WebArena Benchmark Integration

This directory contains the WebArena benchmark integration for the workflow ingestion system. WebArena is a realistic web environment for building and evaluating autonomous agents.

## Overview

WebArena consists of 812 test examples that evaluate agents on web-based tasks using interactive simulations. The benchmark includes tasks across different domains:

- **Shopping**: E-commerce website interactions
- **Reddit**: Social forum discussions and content management
- **GitLab**: Collaborative software development tasks
- **Map**: Navigation and location-based tasks
- **Wikipedia**: Information retrieval and editing

## Files

### Core Implementation

- **`WebArenaLoader.ts`**: Main loader class that fetches WebArena tasks and converts them to WorkflowIO format
- **Examples**: `examples/webarena-example.ts` - Usage examples and demonstrations

### Testing

- **`__tests__/WebArenaLoader.test.ts`**: Comprehensive test suite covering all functionality

### Types

WebArena types are defined in `../ingestion.types.ts`:

- `WebArenaInstance`: Individual task structure
- `WebArenaInput`: Input configuration for evaluation

## Usage

### Fetch Specific Task

```typescript
import { WebArenaLoader } from "./WebArenaLoader"

// Fetch a specific task by ID
const task = await WebArenaLoader.fetchById(0)
console.log(task.intent) // "What is the top-1 best-selling product in 2022"
```

### Convert to WorkflowIO Format

```typescript
// Convert tasks to workflow format for evaluation
const workflows = await WebArenaLoader.fetchAsWorkflowIO(5)
workflows.forEach((workflow) => {
  console.log("Input:", workflow.workflowInput)
  console.log("Expected Output:", workflow.workflowOutput)
})
```

### Filter by Sites

```typescript
// Fetch tasks for specific sites
const shoppingTasks = await WebArenaLoader.fetchBySites(["shopping"], 10)
const redditTasks = await WebArenaLoader.fetchBySites(["reddit"], 5)
```

## Task Structure

Each WebArena task contains:

```typescript
interface WebArenaInstance {
  task_id: number // Unique task identifier
  sites: string[] // Required websites (shopping, reddit, gitlab, etc.)
  intent_template: string // Parameterized task description
  intent: string // Actual task with parameters filled
  require_login: boolean // Whether authentication is needed
  eval: {
    eval_types: string[] // Evaluation methods (string_match, fuzzy_match)
    reference_answers: {
      exact_match?: string // Expected exact answer
      must_include?: string[] // Required elements in response
      fuzzy_match?: string[] // Acceptable variations
    }
  }
}
```

## WorkflowIO Conversion

The loader converts WebArena tasks into a standardized format:

- **`workflowInput`**: Contains the task intent, required sites, and login requirements
- **`workflowOutput`**: Contains evaluation criteria and expected answers for validation

## Available Sites

- `shopping_admin`: E-commerce administration
- `shopping`: Shopping website interactions
- `reddit`: Social media forum tasks
- `gitlab`: Code repository management
- `map`: Navigation and location services
- `wikipedia`: Information retrieval

## Error Handling

The implementation includes robust error handling:

- **Network errors**: Falls back to mock data when the WebArena dataset is inaccessible
- **HTTP errors**: Proper error reporting with status codes
- **JSON parsing errors**: Graceful handling of malformed data
- **Timeout handling**: 10-second timeout for requests with abort controller

## Testing

Run the comprehensive test suite:

```bash
bun run test src/core/workflow/ingestion/__tests__/WebArenaLoader.test.ts
```

Tests cover:

- Task fetching by ID
- WorkflowIO conversion
- Site filtering
- Error handling scenarios
- Network failure fallbacks
- Mock data generation

## Data Source

Tasks are fetched from the official WebArena repository:
`https://raw.githubusercontent.com/web-arena-x/webarena/main/config_files/test.raw.json`

The dataset contains 812 test cases in JSON array format, with each task representing a different web interaction scenario.
