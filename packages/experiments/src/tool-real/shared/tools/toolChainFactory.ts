/**
 * Tool chain factory - eliminates verbose duplication across chain definitions
 * Replaces 183+ lines of boilerplate in businessChain, mathChain, etc.
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

/**
 * Tool step definition for chain factory
 */
export interface ToolStepDef {
  name: string
  description: string
  inputType: z.ZodType<any>
  execute: (input: any) => Promise<any> | any
}

/**
 * Creates a tool chain from step definitions
 * Eliminates repetitive boilerplate across sequential-chains directory
 */
export const createToolChain = (steps: ToolStepDef[]) => {
  const tools: Record<string, any> = {}
  const order: string[] = []

  steps.forEach(({ name, description, inputType, execute }) => {
    tools[name] = tool({
      description,
      inputSchema: zodSchema(inputType),
      execute,
    })
    order.push(name)
  })

  return {
    tools,
    order,
  }
}

/**
 * Common parameter types for tool chains
 */
export const ToolParams = {
  string: z.object({
    input: z.string().describe("String input for processing"),
  }),

  number: z.object({
    value: z.number().describe("Numeric value for processing"),
  }),

  stringField: (fieldName: string, description: string) =>
    z.object({
      [fieldName]: z.string().describe(description),
    }),

  numberField: (fieldName: string, description: string) =>
    z.object({
      [fieldName]: z.number().describe(description),
    }),
}

/**
 * Math chain factory - replaces mathChain.ts (46 lines -> ~15 lines usage)
 */
export const createMathChain = () => {
  return createToolChain([
    {
      name: "data_collector",
      description: "Collects and processes initial data input for the pipeline",
      inputType: ToolParams.string,
      execute: async ({ input }: { input: string }) => {
        const parsed = Number.parseInt(input.trim(), 10)
        if (Number.isNaN(parsed)) {
          throw new Error(`Invalid input: ${input}`)
        }
        return parsed
      },
    },
    {
      name: "result_processor",
      description: "Processes collected data and generates final result",
      inputType: ToolParams.number,
      execute: async ({ value }: { value: number }) => {
        return String(value * 2)
      },
    },
  ])
}

/**
 * Simple math tool factory - replaces alwaysRight/Wrong/Error pattern
 */
export const createMathTools = () => {
  const baseParams = z.object({
    a: z.number().describe("first number"),
    b: z.number().describe("second number"),
  })

  const correct = tool({
    description: "Correctly adds two numbers",
    inputSchema: zodSchema(baseParams),
    execute: async ({ a, b }: { a: number; b: number }) => String(a + b),
  })

  const incorrect = tool({
    description: "Adds two numbers but gives wrong answer",
    inputSchema: zodSchema(baseParams),
    execute: async ({ a, b }: { a: number; b: number }) => String(a + b + 1),
  })

  const error = tool({
    description: "This tool always throws an error",
    inputSchema: zodSchema(z.object({})),
    execute: async (): Promise<string> => {
      throw new Error("Intentional failure from always_error")
    },
  })

  return { correct, incorrect, error }
}

/**
 * Business chain factory - replaces businessChain.ts (183 lines -> ~20 lines usage)
 */
export const createBusinessChain = () => {
  return createToolChain([
    {
      name: "request_handler",
      description: "Handles incoming business requests for processing",
      inputType: ToolParams.stringField("request", "Business request to handle"),
      execute: async ({ request }: { request: string }) =>
        request.split("").reduce((hash, char) => hash + char.charCodeAt(0), 0),
    },
    {
      name: "compliance_checker",
      description: "Checks compliance requirements for business process",
      inputType: ToolParams.numberField("code", "Request code for compliance check"),
      execute: async ({ code }: { code: number }) => {
        if (code % 3 === 0) return "high"
        if (code % 3 === 1) return "medium"
        return "low"
      },
    },
    {
      name: "risk_assessor",
      description: "Assesses risk factors for business compliance",
      inputType: ToolParams.stringField("level", "Compliance level for assessment"),
      execute: async ({ level }: { level: string }) => {
        if (level === "high") return 1
        if (level === "medium") return 5
        return 9
      },
    },
    {
      name: "resource_allocator",
      description: "Allocates resources based on risk assessment",
      inputType: ToolParams.numberField("score", "Risk score for allocation"),
      execute: async ({ score }: { score: number }) => {
        if (score <= 3) return "premium"
        if (score <= 7) return "standard"
        return "basic"
      },
    },
    {
      name: "timeline_planner",
      description: "Plans project timeline based on resource allocation",
      inputType: ToolParams.stringField("team", "Allocated team for planning"),
      execute: async ({ team }: { team: string }) => {
        if (team === "premium") return 7
        if (team === "standard") return 14
        return 30
      },
    },
    {
      name: "quality_controller",
      description: "Controls quality standards for timeline execution",
      inputType: ToolParams.numberField("days", "Timeline days for quality control"),
      execute: async ({ days }: { days: number }) => {
        if (days <= 10) return "premium"
        if (days <= 20) return "standard"
        return "basic"
      },
    },
    {
      name: "budget_analyzer",
      description: "Analyzes budget requirements for quality standards",
      inputType: ToolParams.stringField("quality", "Quality level for budget analysis"),
      execute: async ({ quality }: { quality: string }) => {
        if (quality === "premium") return 10000
        if (quality === "standard") return 5000
        return 2000
      },
    },
    {
      name: "approval_gateway",
      description: "Gateway for approval processing based on budget analysis",
      inputType: ToolParams.numberField("cost", "Analyzed cost for approval"),
      execute: async ({ cost }: { cost: number }) => {
        if (cost >= 8000) return "executive"
        if (cost >= 4000) return "manager"
        return "supervisor"
      },
    },
    {
      name: "notification_service",
      description: "Service for sending notifications based on approval gateway",
      inputType: ToolParams.stringField("approver", "Approval level for notifications"),
      execute: async ({ approver }: { approver: string }) => {
        if (approver === "executive") return 5
        if (approver === "manager") return 3
        return 1
      },
    },
    {
      name: "status_reporter",
      description: "Reports final status based on notification processing",
      inputType: ToolParams.numberField("notifications", "Number of notifications sent"),
      execute: async ({ notifications }: { notifications: number }) => {
        return `Business process completed: ${notifications} stakeholder${notifications !== 1 ? "s" : ""} notified`
      },
    },
  ])
}
