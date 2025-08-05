# Workflow Ingestion System

The ingestion layer provides a unified interface for converting various evaluation formats into WorkflowIO format that can be processed by the workflow engine.

## Supported Evaluation Types

### 1. Text Evaluation

Simple question-answer pairs for direct evaluation.

```typescript
const textEval: EvaluationInput = {
  type: "text",
  question: "What is 2 + 2?",
  answer: "4",
  goal: "Solve this math problem",
  workflowId: "math-solver",
}
```

### 2. CSV Evaluation

Bulk evaluation from CSV files with expected outputs in specified columns.

```typescript
const csvEval: EvaluationInput = {
  type: "csv",
  evaluation: "column:expected_output",
  inputFile: "data.csv",
  goal: "Process each row and generate output",
  workflowId: "csv-processor",
}
```

### 3. GAIA Benchmark

Integration with the GAIA (General AI Assistants) benchmark for comprehensive AI evaluation.

```typescript
const gaiaEval: EvaluationInput = {
  type: "gaia",
  taskId: "task-123",
  level: 2, // optional: 1, 2, or 3
  split: "validation", // or "test"
  goal: "Solve this GAIA benchmark task",
  workflowId: "gaia-solver",
}
```

#### GAIA Features

- **Three Difficulty Levels**: Level 1 (simple), Level 2 (moderate), Level 3 (complex)
- **Multimodal Support**: Tasks can include file attachments (images, spreadsheets)
- **Exact Answer Matching**: Answers are strings, numbers, or comma-separated lists
- **Authentication Required**: GAIA is a gated dataset requiring HuggingFace token

#### Setting up GAIA Access

1. Request access to the GAIA dataset on [Hugging Face](https://huggingface.co/datasets/gaia-benchmark/GAIA)
2. Create an access token on HuggingFace
3. Set the environment variable: `export HUGGING_FACE_API_KEY=your_token_here`

**Important Note**: The GAIA dataset does not support the HuggingFace datasets server API because it contains arbitrary Python code. To use GAIA data, you have two options:

1. **Download the dataset files directly**:
   - Visit https://huggingface.co/datasets/gaia-benchmark/GAIA/tree/main/2023
   - Download the parquet files for your desired split
   - Load them using a local parquet reader

2. **Use the Python datasets library**:
   ```python
   from datasets import load_dataset
   dataset = load_dataset("gaia-benchmark/GAIA", "2023", use_auth_token="your_token")
   ```

The current implementation provides the structure and interface for GAIA integration, but requires one of the above approaches to actually load the data.

### 4. SWE-bench Evaluation

Software engineering benchmark for code generation and bug fixing tasks.

```typescript
const swebenchEval: EvaluationInput = {
  type: "swebench",
  swebenchId: "instance-id",
  goal: "Fix the bug described in this issue",
  workflowId: "bug-fixer",
}
```

### 5. Prompt-Only Evaluation

For cases where only the prompt matters, not the output.

```typescript
const promptOnlyEval: EvaluationInput = {
  type: "prompt-only",
  goal: "Generate creative content",
  workflowId: "content-generator",
}
```

## Usage Example

```typescript
import { IngestionLayer } from "@core/workflow/ingestion/IngestionLayer"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"

// convert any evaluation type to WorkflowIO format
const evaluation: EvaluationInput = {
  type: "gaia",
  taskId: "0-0-0-0-1",
  goal: "Solve this GAIA task",
  workflowId: "my-workflow",
}

const workflowCases = await IngestionLayer.convert(evaluation)

// each case contains:
// - workflowInput: the formatted input for the workflow
// - expectedWorkflowOutput: the expected output for evaluation
```

## Architecture

The ingestion system follows a modular pattern:

1. **IngestionLayer**: Main entry point that routes to specific converters
2. **Type-specific Loaders**: GAIALoader, SWEBenchLoader for fetching external data
3. **Conversion Methods**: Transform evaluation data into WorkflowIO format
4. **Type Definitions**: Strong typing for all evaluation formats

## Adding New Evaluation Types

To add a new evaluation type:

1. Add the type definition to `ingestion.types.ts`
2. Create a loader class if external data fetching is needed
3. Add conversion method to `IngestionLayer`
4. Add tests for the new functionality
5. Update this documentation

## Testing

Run tests for the ingestion system:

```bash
bun run test ingestion
```

Individual test files:

- `GAIALoader.test.ts` - GAIA data fetching
- `ingestion-gaia.test.ts` - GAIA conversion logic
- `SWEBenchLoader.test.ts` - SWE-bench data fetching
- `ingestion-swebench.test.ts` - SWE-bench conversion logic
