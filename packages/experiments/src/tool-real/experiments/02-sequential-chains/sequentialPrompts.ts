/**
 * sequentialPrompts.ts - Prompts for testing sequential tool execution
 * Prompts are designed to require implicit sequential dependencies
 */

export interface SequentialPrompt {
  id: string
  description: string
  prompt: string
  expectedChain: string[]
  testInput: string
  expectedFinalOutput: string
}

// 2-step math chain prompts
export const mathChainPrompts: SequentialPrompt[] = [
  {
    id: "basic-processing",
    description: "Basic data processing through pipeline",
    prompt:
      "Input: '7'\nGoal: Return the correct final result using only the available tools. Do not describe steps or guess intermediate values.",
    expectedChain: ["data_collector", "result_processor"],
    testInput: "7",
    expectedFinalOutput: "14",
  },
  {
    id: "number-transformation",
    description: "Transform number through processing steps",
    prompt: "Input: '5'\nGoal: Produce the correct final value using the tools. Do not narrate.",
    expectedChain: ["data_collector", "result_processor"],
    testInput: "5",
    expectedFinalOutput: "10",
  },
  {
    id: "pipeline-execution",
    description: "Execute full pipeline on input",
    prompt: "Input: '3'\nGoal: Use tools as needed to generate the correct final answer only.",
    expectedChain: ["data_collector", "result_processor"],
    testInput: "3",
    expectedFinalOutput: "6",
  },
]

// 5-step document chain prompts
export const documentChainPrompts: SequentialPrompt[] = [
  {
    id: "document-processing",
    description: "Process document through validation pipeline",
    prompt:
      "Document: 'Hello'\nTask: Return the final processed result using only tools. Do not explain the procedure.",
    expectedChain: [
      "input_validator",
      "metadata_extractor",
      "content_classifier",
      "workflow_router",
      "output_formatter",
    ],
    testInput: "Hello",
    expectedFinalOutput: "Document processed: standard queue",
  },
  {
    id: "content-analysis",
    description: "Analyze content through full pipeline",
    prompt:
      "Content: 'This is a test document'\nTask: Produce the final formatted result using the tools. No narration.",
    expectedChain: [
      "input_validator",
      "metadata_extractor",
      "content_classifier",
      "workflow_router",
      "output_formatter",
    ],
    testInput: "This is a test document",
    expectedFinalOutput: "Document processed: standard queue",
  },
  {
    id: "workflow-execution",
    description: "Execute document workflow end-to-end",
    prompt: "Content: 'Short'\nTask: Use tools to produce the final formatted output. Output only the result.",
    expectedChain: [
      "input_validator",
      "metadata_extractor",
      "content_classifier",
      "workflow_router",
      "output_formatter",
    ],
    testInput: "Short",
    expectedFinalOutput: "Document processed: standard queue",
  },
]

// 10-step business chain prompts
export const businessChainPrompts: SequentialPrompt[] = [
  {
    id: "business-process",
    description: "Execute complex business process workflow",
    prompt:
      "Request: 'Project Alpha'\nObjective: Produce the correct final status using only the tools. Do not describe steps.",
    expectedChain: [
      "request_handler",
      "compliance_checker",
      "risk_assessor",
      "resource_allocator",
      "timeline_planner",
      "quality_controller",
      "budget_analyzer",
      "approval_gateway",
      "notification_service",
      "status_reporter",
    ],
    testInput: "Project Alpha",
    expectedFinalOutput: "Business process completed: 3 stakeholders notified",
  },
  {
    id: "enterprise-workflow",
    description: "Enterprise-level request processing",
    prompt: "Request: 'Beta Initiative'\nObjective: Return the final status based on tool outcomes only.",
    expectedChain: [
      "request_handler",
      "compliance_checker",
      "risk_assessor",
      "resource_allocator",
      "timeline_planner",
      "quality_controller",
      "budget_analyzer",
      "approval_gateway",
      "notification_service",
      "status_reporter",
    ],
    testInput: "Beta Initiative",
    expectedFinalOutput: "Business process completed: 5 stakeholders notified",
  },
  {
    id: "complex-approval",
    description: "Complex approval process execution",
    prompt: "Request: 'Gamma Launch'\nObjective: Use the tools to derive and return the final status only.",
    expectedChain: [
      "request_handler",
      "compliance_checker",
      "risk_assessor",
      "resource_allocator",
      "timeline_planner",
      "quality_controller",
      "budget_analyzer",
      "approval_gateway",
      "notification_service",
      "status_reporter",
    ],
    testInput: "Gamma Launch",
    expectedFinalOutput: "Business process completed: 1 stakeholder notified",
  },
]

// 4-step location chain prompts (large JSON payload simulation)
export const locationChainPrompts: SequentialPrompt[] = [
  {
    id: "locations-basic",
    description: "Find, save, verify, and summarize store locations",
    prompt:
      "You are a location data specialist. Return the final summary only using the available tools.\nQuery: 'grocery stores'\nArea: north=52.5, south=52.0, east=5.5, west=4.5",
    expectedChain: ["search_google_maps", "location_data_manager", "verify_location", "location_data_info"],
    testInput: "grocery stores",
    expectedFinalOutput: "", // dynamic counts
  },
]
