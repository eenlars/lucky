import type { FlowEvolutionMode } from "@core/types"

export interface ParsedArgs {
  mode?: FlowEvolutionMode
  generations?: number
  populationSize?: number
  selfImproveNodes?: boolean
  improvementType?: "judge" | "unified"
  setupFile?: string
}

import { EnhancedError } from "@core/utils/errors/enhanced-error"

export class ArgumentParsingError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      args?: string[]
      expectedFormat?: string
      validOptions?: string[]
    },
  ) {
    super({
      title: "Invalid Arguments",
      message,
      action: context?.expectedFormat
        ? `Expected format: ${context.expectedFormat}`
        : "Check argument syntax and try again. Use --help for usage information.",
      debug: {
        code: "ARGUMENT_PARSING_FAILED",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/cli/usage",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "ArgumentParsingError"
  }
}

function parseArgument(arg: string): [string, string] {
  const [key, ...valueParts] = arg.split("=")
  const value = valueParts.join("=")

  if (!value) {
    throw new ArgumentParsingError(`Empty value for ${key}`, {
      expectedFormat: `${key}=<value>`,
    })
  }

  return [key, value]
}

function parseInteger(value: string, name: string): number {
  const num = Number.parseInt(value, 10)
  if (Number.isNaN(num) || num <= 0) {
    throw new ArgumentParsingError(`${name} must be a positive integer, got: ${value}`, {
      expectedFormat: `--${name}=<positive integer>`,
    })
  }
  return num
}

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase()
  if (["true", "1", "yes"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  throw new ArgumentParsingError(`Boolean value must be true/false/1/0/yes/no, got: ${value}`, {
    validOptions: ["true", "false", "1", "0", "yes", "no"],
  })
}

const VALID_MODES = ["iterative", "GP", "genetic"] as const
const VALID_IMPROVEMENT_TYPES = ["judge", "unified"] as const

export function parseCliArguments(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {}
  const seen = new Set<string>()

  for (const arg of args) {
    if (!arg.startsWith("--") || !arg.includes("=")) {
      throw new ArgumentParsingError(`Invalid format: ${arg}. Use --key=value`)
    }

    const [key, value] = parseArgument(arg)

    if (seen.has(key)) {
      throw new ArgumentParsingError(`Duplicate argument: ${key}`)
    }
    seen.add(key)

    switch (key) {
      case "--mode":
        if (!VALID_MODES.includes(value as FlowEvolutionMode)) {
          throw new ArgumentParsingError(`Invalid mode: ${value}. Valid: ${VALID_MODES.join(", ")}`)
        }
        parsed.mode = value as FlowEvolutionMode
        break
      case "--generations":
        parsed.generations = parseInteger(value, "generations")
        break
      case "--population":
        parsed.populationSize = parseInteger(value, "population")
        break
      case "--self-improve-nodes":
        parsed.selfImproveNodes = parseBoolean(value)
        break
      case "--improvement-type":
        if (!VALID_IMPROVEMENT_TYPES.includes(value as "judge" | "unified")) {
          throw new ArgumentParsingError(
            `Invalid improvement type: ${value}. Valid: ${VALID_IMPROVEMENT_TYPES.join(", ")}`,
          )
        }
        parsed.improvementType = value as "judge" | "unified"
        break
      case "--setup-file":
        parsed.setupFile = value.trim()
        break
      default:
        throw new ArgumentParsingError(`Unknown argument: ${key}`)
    }
  }

  return parsed
}
