/**
 * mathChain.ts - 2-step math processing chain with obfuscated function names
 * Tests sequential tool execution: data_collector → result_processor
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

// step 1: data_collector - extracts number from string input
const DataCollectorParams = z.object({
  input: z.string().describe("Raw input data to collect"),
})

export const dataCollectorSpec = tool({
  description: "Collects and processes initial data input for the pipeline",
  inputSchema: zodSchema(DataCollectorParams),
  execute: async ({ input }: { input: string }) => {
    const parsed = parseInt(input.trim(), 10)
    if (isNaN(parsed)) {
      throw new Error(`Invalid input: ${input}`)
    }
    return parsed
  },
})

// step 2: result_processor - processes the collected number
const ResultProcessorParams = z.object({
  value: z.number().describe("Processed value from collection step"),
})

export const resultProcessorSpec = tool({
  description: "Processes collected data and generates final result",
  inputSchema: zodSchema(ResultProcessorParams),
  execute: async ({ value }: { value: number }) => {
    return String(value * 2)
  },
})

// combined tools for easy import
export const mathChainTools = {
  data_collector: dataCollectorSpec,
  result_processor: resultProcessorSpec,
}

// expected execution order
export const mathChainOrder = ["data_collector", "result_processor"]
