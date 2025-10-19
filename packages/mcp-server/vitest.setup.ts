import { vi } from "vitest"
import LuckyClient from "./src/lucky-client.js"
import type { Workflow, WorkflowInvocationResult } from "./src/lucky-client.js"

// Create mock responses
const mockWorkflow: Workflow = {
  workflow_id: "wf_test",
  name: "Test Workflow",
  description: "A test workflow",
  inputSchema: { type: "object" },
  outputSchema: { type: "object" },
  created_at: new Date().toISOString(),
}

const mockInvocationResult: WorkflowInvocationResult = {
  invocation_id: "inv_test",
  state: "completed",
  createdAt: new Date().toISOString(),
  output: { result: "test" },
}

// Create mock instance methods
const mockListWorkflows = vi.fn().mockImplementation(async () => [mockWorkflow])
const mockInvokeWorkflow = vi.fn().mockImplementation(async () => mockInvocationResult)
const mockCheckStatus = vi.fn().mockImplementation(async () => mockInvocationResult)
const mockCancelWorkflow = vi.fn().mockImplementation(async () => ({ success: true }))

// Create mock instance
const mockInstance = {
  apiKey: "test-api-key",
  apiUrl: "test-api-url",
  listWorkflows: mockListWorkflows,
  invokeWorkflow: mockInvokeWorkflow,
  checkStatus: mockCheckStatus,
  cancelWorkflow: mockCancelWorkflow,
}

// Mock the Lucky client
vi.mock("./src/lucky-client.js", () => ({
  default: vi.fn().mockImplementation(() => mockInstance),
}))
