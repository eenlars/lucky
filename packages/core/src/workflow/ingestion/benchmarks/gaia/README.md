# GAIA Benchmark Integration

This directory contains the GAIA (General AI Assistants) benchmark dataset loader for workflow evaluation.

## Overview

GAIA is a comprehensive benchmark that tests AI capabilities including reasoning, multi-modality handling, web browsing, and tool-use proficiency across three difficulty levels.

## Setup Instructions

1. **Install Python dependencies** (if not already installed):

   ```bash
   pip install datasets
   ```

2. **Set your HuggingFace token**:

   ```bash
   export HUGGING_FACE_API_KEY="your_token_here"
   # or
   export HF_TOKEN="your_token_here"
   ```

3. **Download the GAIA dataset**:

   ```bash
   python download_gaia.py
   ```

   This will download the GAIA dataset and save it as JSON files in the `data/` directory.

## Files

- `GAIALoader.ts` - Main loader with API fallback and local data preference
- `GAIALocalLoader.ts` - TypeScript loader that reads from cached JSON files
- `download_gaia.py` - Python script to download and cache GAIA dataset
- `examples/gaia-example.ts` - Example usage script

## Usage

### Basic Usage

```typescript
import { IngestionLayer } from "@workflow/ingestion/IngestionLayer"

const gaiaEvaluation = {
  type: "gaia",
  taskId: "task-123", // Use actual task ID from dataset
  level: 1, // optional: filter by difficulty level
  split: "validation", // "validation" or "test"
  goal: "Solve this GAIA task",
  workflowId: "my-workflow",
}

const workflowCases = await IngestionLayer.convert(gaiaEvaluation)
```

### Direct Loader Usage

```typescript
import { GAIALocalLoader } from "./GAIALocalLoader"

// Fetch specific task
const task = GAIALocalLoader.fetchById("task-123")

// Fetch by level
const level1Tasks = GAIALocalLoader.fetchByLevel(1, "validation", 10)

// Get random tasks
const randomTasks = GAIALocalLoader.fetchRandom(5)

// Get dataset statistics
const stats = GAIALocalLoader.getStats()
```

## Dataset Information

- **Total Questions**: ~450 non-trivial questions
- **Difficulty Levels**: 3 (Level 1 = easiest, Level 3 = hardest)
- **Splits**: validation (public), test (private answers)
- **Features**: Some tasks include file attachments
- **Answer Format**: Strings, numbers, or comma-separated lists

## Testing

Run the example to verify everything is working:

```bash
bun run examples/gaia-example.ts
```

## Important Notes

1. GAIA is a gated dataset on Hugging Face - you need to request access
2. Set HF_TOKEN environment variable for authentication
3. Some GAIA tasks include file attachments (images, spreadsheets)
4. The benchmark has 466 total questions across 3 difficulty levels
5. The system prefers local cached data over API calls for performance

## Data Flow

1. **Download**: Use `download_gaia.py` to cache dataset locally
2. **Local Access**: `GAIALocalLoader` reads from cached JSON files
3. **API Fallback**: `GAIALoader` falls back to API if local data unavailable
4. **Integration**: `IngestionLayer` converts GAIA tasks to WorkflowIO format
