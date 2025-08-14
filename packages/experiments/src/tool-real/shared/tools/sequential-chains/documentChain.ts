/**
 * documentChain.ts - 5-step document processing chain with obfuscated function names
 * Tests sequential tool execution through document workflow
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

// step 1: input_validator - extracts text length
const InputValidatorParams = z.object({
  text: z.string().describe("Document text to validate"),
})

export const inputValidatorSpec = tool({
  description: "Validates and analyzes input document for processing",
  parameters: zodSchema(InputValidatorParams),
  execute: async ({ text }: { text: string }) => {
    return text.length
  },
})

export function inputValidatorFn({ text }: { text: string }): number {
  // actually returns text length
  return text.length
}

// step 2: metadata_extractor - converts size to category
const MetadataExtractorParams = z.object({
  size: z.number().describe("Validated size metric"),
})

export const metadataExtractorSpec = tool({
  description: "Extracts metadata properties from validated input",
  parameters: zodSchema(MetadataExtractorParams),
  execute: async ({ size }: { size: number }) => {
    if (size < 5) return "small"
    if (size < 15) return "medium"
    return "large"
  },
})

export function metadataExtractorFn({ size }: { size: number }): string {
  // actually converts length to category
  if (size < 5) return "small"
  if (size < 15) return "medium"
  return "large"
}

// step 3: content_classifier - assigns priority based on category
const ContentClassifierParams = z.object({
  category: z.string().describe("Content category from metadata"),
})

export const contentClassifierSpec = tool({
  description: "Classifies content based on extracted metadata",
  parameters: zodSchema(ContentClassifierParams),
  execute: async ({ category }: { category: string }) => {
    if (category === "small") return 3
    if (category === "medium") return 2
    return 1
  },
})

export function contentClassifierFn({
  category,
}: {
  category: string
}): number {
  // actually assigns priority: small=3, medium=2, large=1
  if (category === "small") return 3
  if (category === "medium") return 2
  return 1
}

// step 4: workflow_router - routes to department based on priority
const WorkflowRouterParams = z.object({
  priority: z.number().describe("Priority level from classifier"),
})

export const workflowRouterSpec = tool({
  description: "Routes workflow based on classification results",
  parameters: zodSchema(WorkflowRouterParams),
  execute: async ({ priority }: { priority: number }) => {
    if (priority === 3) return "urgent"
    if (priority === 2) return "standard"
    return "batch"
  },
})

export function workflowRouterFn({ priority }: { priority: number }): string {
  // actually routes: 3=urgent, 2=standard, 1=batch
  if (priority === 3) return "urgent"
  if (priority === 2) return "standard"
  return "batch"
}

// step 5: output_formatter - formats final result
const OutputFormatterParams = z.object({
  department: z.string().describe("Department assignment from router"),
})

export const outputFormatterSpec = tool({
  description: "Formats final output from workflow routing",
  parameters: zodSchema(OutputFormatterParams),
  execute: async ({ department }: { department: string }) => {
    return `Document processed: ${department} queue`
  },
})

export function outputFormatterFn({
  department,
}: {
  department: string
}): string {
  // actually formats as status message
  return `Document processed: ${department} queue`
}

// combined tools for easy import
export const documentChainTools = {
  input_validator: inputValidatorSpec,
  metadata_extractor: metadataExtractorSpec,
  content_classifier: contentClassifierSpec,
  workflow_router: workflowRouterSpec,
  output_formatter: outputFormatterSpec,
}

// expected execution order
export const documentChainOrder = [
  "input_validator",
  "metadata_extractor",
  "content_classifier",
  "workflow_router",
  "output_formatter",
]
