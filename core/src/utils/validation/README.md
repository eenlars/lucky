# Core Validation Module

Multi-layered validation system ensuring workflow reliability, cost efficiency, and system integrity through AI-powered validation and automated repair.

## Quick Start

```typescript
import { validateAndDecide } from "@core/validation/message"
import { verifyWorkflowConfig, repairWorkflow } from "@core/validation/workflow"

// Validate node output with AI analysis
const { shouldProceed, validationError } = await validateAndDecide({
  nodeOutput: "Analysis complete: Found 3 key insights...",
  workflowMessage: originalMessage,
  systemPrompt: "You are a data analyst...",
  nodeId: "analyzer",
})

// Verify workflow configuration
const result = await verifyWorkflowConfig(workflowConfig, true)
if (!result.isValid) {
  const { nodes } = await repairWorkflow(workflowConfig, result)
  workflowConfig = { ...workflowConfig, nodes }
}
```

## Architecture

```
validation/
├── message/                     # AI-powered output validation
│   ├── responseValidator.ts     # Quality assessment system
│   ├── validateAndDecide.ts     # Decision logic for handoffs
│   └── validationConfig.ts      # Configuration and thresholds
├── workflow/                    # Workflow configuration validation
│   ├── verifyOneNode.ts         # Individual node validation
│   ├── toolsVerification.ts     # Tool availability and uniqueness
│   ├── connectionVerification.ts # Graph connectivity validation
│   ├── verifyDirectedGraph.ts   # DAG structure and cycle detection
│   ├── simple.ts                # Basic structure validation
│   ├── repairWorkflow.ts        # AI-powered automatic repair
│   └── index.ts                 # Main validation orchestrator
└── __tests__/                   # Comprehensive test suite
```

## Message Validation System

### AI-Powered Output Validation

Real-time quality assessment using cost-effective nano model:

```typescript
interface ValidationResult {
  taskFulfillment: {
    score: number // 0-10 scale
    reasoning: string // Detailed explanation
    concerns: string[] // Specific issues identified
  }
  systemPromptCompliance: {
    score: number // 0-10 scale
    reasoning: string // Compliance analysis
    violations: string[] // Specific violations
  }
  overallQuality: {
    score: number // 0-10 scale
    reasoning: string // Quality assessment
    issues: string[] // Quality concerns
  }
}
```

### Validation Decision Framework

Three-tier decision system for workflow continuation:

```typescript
// Decision thresholds
const VALIDATION_THRESHOLDS = {
  PROCEED: 7, // Continue with normal workflow
  RETRY: 4, // Log warnings but allow continuation
  ESCALATE: 0, // Block handoff and return error
}

// Usage in response handler
const { shouldProceed, validationError, validationCost } = await validateAndDecide({
  nodeOutput: nodeInvocationFullOutput,
  workflowMessage: context.workflowMessageIncoming,
  systemPrompt: context.nodeSystemPrompt,
  nodeId: context.nodeId,
})

if (!shouldProceed && validationError) {
  return handleError({
    error: `Validation failed: ${validationError}`,
    nodeId: context.nodeId,
    context: validationResult,
  })
}
```

### Cost-Optimized Validation

Efficient validation with minimal overhead:

```typescript
// Uses nano model for cost efficiency (~$0.001 per validation)
const validationResponse = await sendAIRequest({
  messages: validationMessages,
  model: getDefaultModels().nano, // Gemini 2.5 Flash
  temperature: 0.1, // Consistent scoring
  maxTokens: 1000, // Structured response
  validateResponse: true, // Ensure proper JSON
})
```

## Workflow Configuration Validation

### Comprehensive Validation Pipeline

Multi-stage validation ensuring configuration integrity:

```typescript
const verificationFunctions = [
  verifyNodes, // Node structure validation
  verifyToolsUnique, // Tool uniqueness enforcement
  verifyAllToolsAreActive, // Tool availability checking
  verifyAtLeastOneNode, // Minimum requirements
  everyNodeIsConnectedToStartNode, // Connectivity validation
  startNodeIsConnectedToEndNode, // End-to-end reachability
  verifyToolSetEachNodeIsUnique, // Tool set uniqueness
  verifyModelNameExists, // Model availability
  verifyNoDuplicateHandoffs, // Handoff validation
  verifyMaxToolsPerAgent, // Tool limit enforcement
  verifyNoCycles, // DAG structure validation
]
```

### Node Structure Validation

Ensures all required node properties are present:

```typescript
interface NodeValidationSchema {
  nodeId: string // Unique identifier
  description: string // Node purpose description
  systemPrompt: string // AI behavior instructions
  modelName: string // AI model selection
  mcpTools: MCPToolName[] // External tools
  codeTools: CodeToolName[] // Internal tools
  handOffs: string[] // Possible next nodes
  memory?: Record<string, string> // Optional persistent memory
}

// Validation example
const nodeValidation = await verifyOneNode({
  nodeId: "data-processor",
  description: "Processes CSV data and generates insights",
  systemPrompt: "You are a data analyst...",
  modelName: "claude-3-sonnet",
  mcpTools: ["filesystem"],
  codeTools: ["csvReader", "contextHandler"],
  handOffs: ["report-generator", "quality-checker"],
})
```

### Tool Validation System

Comprehensive tool availability and uniqueness checking:

```typescript
// Tool uniqueness validation
const toolValidation = {
  uniqueToolsPerAgent: false, // Allow tool sharing
  uniqueToolSetsPerAgent: false, // Allow identical tool sets
  maxToolsPerAgent: 3, // Limit tools per node

  // Validate tool availability
  verifyAllToolsAreActive: async (nodes: NodeConfig[]) => {
    const allTools = extractAllTools(nodes)
    const inactiveTools = allTools.filter((tool) => CONFIG.tools.inactive.includes(tool))

    if (inactiveTools.length > 0) {
      return {
        isValid: false,
        errors: [`Inactive tools used: ${inactiveTools.join(", ")}`],
      }
    }
    return { isValid: true, errors: [] }
  },
}
```

### Graph Structure Validation

DAG enforcement and cycle detection:

```typescript
// Cycle detection using three-color DFS
const verifyNoCycles = async (nodes: NodeConfig[]): Promise<VerificationResult> => {
  const colors = new Map<string, "white" | "gray" | "black">()
  const graph = buildAdjacencyList(nodes)

  // Initialize all nodes as white
  for (const node of nodes) {
    colors.set(node.nodeId, "white")
  }

  // DFS cycle detection
  const hasCycle = (nodeId: string): boolean => {
    if (colors.get(nodeId) === "gray") return true // Back edge = cycle
    if (colors.get(nodeId) === "black") return false // Already processed

    colors.set(nodeId, "gray") // Mark as being processed

    for (const neighbor of graph.get(nodeId) || []) {
      if (hasCycle(neighbor)) return true
    }

    colors.set(nodeId, "black") // Mark as completed
    return false
  }

  // Check for cycles from all nodes
  for (const node of nodes) {
    if (colors.get(node.nodeId) === "white") {
      if (hasCycle(node.nodeId)) {
        return {
          isValid: false,
          errors: ["Cycle detected in workflow graph"],
        }
      }
    }
  }

  return { isValid: true, errors: [] }
}
```

### Connectivity Validation

Ensures proper workflow graph connectivity:

```typescript
// Verify all nodes are reachable from start node
const everyNodeIsConnectedToStartNode = async (nodes: NodeConfig[]) => {
  const startNode = nodes.find((n) => n.nodeId === "start")
  if (!startNode) return { isValid: false, errors: ["No start node found"] }

  const visited = new Set<string>()
  const queue = [startNode.nodeId]

  // BFS traversal
  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue

    visited.add(current)
    const node = nodes.find((n) => n.nodeId === current)
    if (node) {
      queue.push(...node.handOffs)
    }
  }

  // Check if all nodes are reachable
  const unreachableNodes = nodes.map((n) => n.nodeId).filter((id) => !visited.has(id))

  if (unreachableNodes.length > 0) {
    return {
      isValid: false,
      errors: [`Unreachable nodes: ${unreachableNodes.join(", ")}`],
    }
  }

  return { isValid: true, errors: [] }
}
```

## Automatic Repair System

### AI-Powered Workflow Repair

Intelligent error correction with iterative improvement:

```typescript
export const repairWorkflow = async (
  config: WorkflowConfig,
  verificationResult: VerificationResult,
  maxAttempts: number = 3
): Promise<{ nodes: NodeConfig[]; usdCost: number }> => {
  let totalCost = 0
  let currentNodes = config.nodes

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const repairPrompt = `
      Fix the following workflow validation errors:
      ${verificationResult.errors.join("\n")}
      
      Current workflow configuration:
      ${JSON.stringify(currentNodes, null, 2)}
      
      Please provide a corrected workflow configuration that:
      1. Fixes all validation errors
      2. Maintains the original workflow intent
      3. Ensures all nodes are properly connected
      4. Uses only active tools
    `

    const response = await sendAIRequest({
      messages: [{ role: "user", content: repairPrompt }],
      model: getDefaultModels().medium, // Use more capable model for repair
      temperature: 0.1, // Consistent repairs
      maxTokens: 4000, // Allow comprehensive response
    })

    totalCost += response.cost

    // Validate the repaired configuration
    const repairedConfig = JSON.parse(response.content)
    const newVerification = await verifyWorkflowConfig(repairedConfig)

    if (newVerification.isValid) {
      return { nodes: repairedConfig.nodes, usdCost: totalCost }
    }

    // Update for next iteration
    currentNodes = repairedConfig.nodes
    verificationResult = newVerification
  }

  throw new Error(`Failed to repair workflow after ${maxAttempts} attempts`)
}
```

### Repair Integration

```typescript
// Automatic repair in workflow setup
const setupValidatedWorkflow = async (config: WorkflowConfig) => {
  let finalConfig = config

  // Initial validation
  const verificationResult = await verifyWorkflowConfig(finalConfig, true)

  if (!verificationResult.isValid) {
    lgg.warn("Workflow validation failed, attempting repair...", verificationResult.errors)

    try {
      const { nodes, usdCost } = await repairWorkflow(finalConfig, verificationResult)
      finalConfig = { ...finalConfig, nodes }

      lgg.info(`Workflow repaired successfully (cost: $${usdCost})`, {
        originalErrors: verificationResult.errors.length,
        repairedNodes: nodes.length,
      })
    } catch (error) {
      lgg.error("Workflow repair failed:", error)
      throw new Error("Unable to create valid workflow configuration")
    }
  }

  return finalConfig
}
```

## Configuration and Customization

### Runtime Configuration

Flexible validation settings for different environments:

```typescript
// Validation configuration
const CONFIG = {
  verification: {
    allowCycles: true, // Allow cyclic workflows
    enableOutputValidation: false, // Disable for cost savings
    strictMode: true, // Fail fast on validation errors
    maxRepairAttempts: 3, // Repair iteration limit
    validationTimeout: 30000, // Validation timeout (ms)
  },
  tools: {
    uniqueToolsPerAgent: false, // Allow tool sharing
    uniqueToolSetsPerAgent: false, // Allow identical tool sets
    maxToolsPerAgent: 3, // Tool limit per node
    inactive: ["deprecated-tool"], // Disabled tools
  },
  validation: {
    thresholds: {
      taskFulfillment: 7,
      systemPromptCompliance: 6,
      overallQuality: 7,
    },
    actions: {
      lowScore: "warn", // 'block' | 'warn' | 'log'
      validationError: "block", // 'block' | 'warn' | 'log'
      repairFailure: "block", // 'block' | 'warn' | 'log'
    },
  },
}
```

### Custom Validation Functions

```typescript
// Add custom validation
const customValidation = async (config: WorkflowConfig): Promise<VerificationResult> => {
  const errors: string[] = []

  // Custom business logic validation
  if (config.nodes.length > 10) {
    errors.push("Too many nodes (max 10 allowed)")
  }

  // Domain-specific validation
  const requiredTools = ["csvReader", "contextHandler"]
  const hasRequiredTools = config.nodes.some((node) => requiredTools.every((tool) => node.codeTools.includes(tool)))

  if (!hasRequiredTools) {
    errors.push("Workflow must include data processing tools")
  }

  return { isValid: errors.length === 0, errors }
}

// Register custom validation
const extendedValidation = [...defaultValidationFunctions, customValidation]
```

## Performance Optimization

### Batch Validation

```typescript
// Validate multiple workflows efficiently
const validateWorkflowBatch = async (configs: WorkflowConfig[]) => {
  const validationPromises = configs.map((config) => verifyWorkflowConfig(config, false))

  const results = await Promise.all(validationPromises)

  return results.map((result, index) => ({
    config: configs[index],
    validation: result,
    needsRepair: !result.isValid,
  }))
}
```

### Caching Strategy

```typescript
// Cache validation results
const validationCache = new Map<string, VerificationResult>()

const cachedValidation = async (config: WorkflowConfig): Promise<VerificationResult> => {
  const configHash = generateConfigHash(config)

  if (validationCache.has(configHash)) {
    return validationCache.get(configHash)!
  }

  const result = await verifyWorkflowConfig(config)
  validationCache.set(configHash, result)

  return result
}
```

## Integration Examples

### Workflow Initialization

```typescript
// In Workflow.ts
class Workflow {
  async setup(): Promise<void> {
    // Validate configuration before setup
    const validationResult = await verifyWorkflowConfig(this.config, true)

    if (!validationResult.isValid) {
      if (CONFIG.verification.strictMode) {
        throw new Error(`Invalid workflow: ${validationResult.errors.join(", ")}`)
      }

      // Attempt automatic repair
      const { nodes } = await repairWorkflow(this.config, validationResult)
      this.config = { ...this.config, nodes }
    }

    // Continue with setup...
  }
}
```

### Node Response Validation

```typescript
// In responseHandler.ts
const handleNodeResponse = async (context: ResponseContext) => {
  const response = await processNodeResponse(context)

  // Validate response before handoff
  if (CONFIG.verification.enableOutputValidation) {
    const validation = await validateAndDecide({
      nodeOutput: response.content,
      workflowMessage: context.workflowMessageIncoming,
      systemPrompt: context.nodeSystemPrompt,
      nodeId: context.nodeId,
    })

    if (!validation.shouldProceed) {
      return handleValidationFailure(validation.validationError)
    }

    // Track validation costs
    response.costs.validation = validation.validationCost
  }

  return response
}
```

### Evolution System Integration

```typescript
// In genetic programming
const evaluateWorkflowFitness = async (genome: WorkflowGenome): Promise<number> => {
  const config = genome.toWorkflowConfig()

  // Validation affects fitness
  const validation = await verifyWorkflowConfig(config)
  if (!validation.isValid) {
    return 0 // Invalid workflows have zero fitness
  }

  // Continue with execution-based fitness evaluation
  return await executeAndEvaluate(config)
}
```

## Testing and Examples

### Validation Testing

```typescript
// Test valid workflow
const validWorkflow = {
  nodes: [
    {
      nodeId: "start",
      description: "Entry point",
      systemPrompt: "You are a workflow coordinator",
      modelName: "claude-3-sonnet",
      mcpTools: [],
      codeTools: ["contextHandler"],
      handOffs: ["processor"],
    },
    {
      nodeId: "processor",
      description: "Data processor",
      systemPrompt: "Process data and generate insights",
      modelName: "claude-3-sonnet",
      mcpTools: ["filesystem"],
      codeTools: ["csvReader"],
      handOffs: ["end"],
    },
  ],
}

// Test validation
const result = await verifyWorkflowConfig(validWorkflow)
expect(result.isValid).toBe(true)
```

### Error Scenarios

```typescript
// Test invalid workflow
const invalidWorkflow = {
  nodes: [
    {
      nodeId: "start",
      // Missing required fields
      handOffs: ["nonexistent-node"],
    },
  ],
}

const result = await verifyWorkflowConfig(invalidWorkflow)
expect(result.isValid).toBe(false)
expect(result.errors).toContain("Missing required node fields")
```

## Best Practices

1. **Enable Validation in Development**: Use verbose validation during development
2. **Configure Thresholds**: Adjust validation thresholds based on use case
3. **Monitor Validation Costs**: Track validation expenses in production
4. **Implement Custom Validation**: Add domain-specific validation rules
5. **Use Repair Judiciously**: Balance repair costs with development time
6. **Test Validation Logic**: Comprehensive testing of validation functions
7. **Handle Validation Failures**: Graceful error handling and user feedback
8. **Cache Results**: Cache validation results for repeated configurations
9. **Batch Operations**: Validate multiple workflows efficiently
10. **Monitor Performance**: Track validation performance and optimize as needed
