# Workflow Evolution Visualization

This directory contains tools to trace and visualize the evolution journey of autonomous workflows, showing how they progressed from initial attempts to achieving target accuracy through evolutionary optimization.

## Files Created

### Core Components

- **`workflow-evolution-tracer.ts`** - Main tracer that follows workflow genealogy and extracts evolution data
- **`WorkflowEvolutionVisualization.tsx`** - React component for rendering beautiful evolution graphs
- **`generate-evolution-graph.ts`** - CLI tool to generate evolution graphs from workflow invocation IDs

### Generated Data

- **`evolution-graph-b463376e.json`** - Complete evolution data for the target workflow (70% accuracy)
- **`workflow-evolution-explorer.ts`** - Research/exploration script used during development
- **`test-evolution-tracer.ts`** - Test harness for the evolution tracer

## Your Workflow Journey Summary

For workflow invocation `b463376e` which achieved **70% accuracy**:

- **🎯 Goal**: Find physical stores of B-corporations in Netherlands
- **📈 Peak Performance**: 90% accuracy (workflow 7fda5512)
- **🔄 Total Attempts**: 92 iterations over 6 hours
- **✅ Success Rate**: 48.9% (45/92 successful runs)
- **💰 Total Cost**: $1.46
- **🏆 Evolution Method**: Cultural (iterative improvement)

### Key Evolution Milestones

1. **Early Progress**: Started at 10% → 20% → **85%** → **90%** (peak)
2. **Optimization**: Settled around 60-70% accuracy range
3. **Target Achievement**: Your specific workflow achieved **70%** accuracy
4. **Final Performance**: System showed consistent 20-30% baseline with occasional peaks

## Usage

### Generate Evolution Graph

```bash
# Generate for your workflow
bun run src/results/generate-evolution-graph.ts b463376e

# Generate for any workflow invocation ID
bun run src/results/generate-evolution-graph.ts <invocation-id>
```

### View Visualization

The React component can be imported and used in any Next.js page:

```tsx
import { WorkflowEvolutionVisualization } from "@/results/WorkflowEvolutionVisualization"
import evolutionData from "@/results/evolution-graph-b463376e.json"

export default function Page() {
  return (
    <WorkflowEvolutionVisualization
      graph={evolutionData.graph}
      visualization={evolutionData.visualization}
    />
  )
}
```

### Programmatic Access

```typescript
import {
  traceWorkflowEvolution,
  createEvolutionVisualizationData,
} from "@/results/workflow-evolution-tracer"

const graph = await traceWorkflowEvolution("b463376e")
const visualization = createEvolutionVisualizationData(graph)
```

## What the Visualization Shows

1. **Accuracy Timeline**: Line chart showing progression over iterations
2. **Key Milestones**: Significant accuracy jumps and the target achievement
3. **Success Metrics**: Success rate, cost efficiency, evolution duration
4. **Performance Distribution**: Success vs failure rates across attempts
5. **Evolution Details**: Run IDs, generation info, and technical metadata

## Database Structure Used

The tracer queries these Supabase tables:

- `WorkflowInvocation` - Execution records with accuracy/fitness scores
- `WorkflowVersion` - Workflow definitions with genealogy (parent relationships)
- `EvolutionRun` - High-level evolution run configuration and goals
- `Generation` - Generation groupings within evolution runs

## Key Insights from Your Workflow

Your workflow demonstrates successful **cultural evolution**:

- Started from scratch (no parents in generation 0)
- Achieved early breakthrough (90% peak by iteration 6)
- Showed consistent performance in 60-70% range
- Your specific run (70%) represents solid, reliable performance
- Evolution ran for 6 hours with 92 total attempts

This shows the system successfully learned to solve the B-corp store finding task through iterative improvement rather than random search.
