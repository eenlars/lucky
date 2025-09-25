import type { CodeToolName } from "@core/tools/tool.types"
import { JSONN } from "@lucky/shared"

interface ToolError {
  location: string
  error?: any
}

// Represents a failed code tool execution
export type CodeToolFailure = {
  readonly tool: CodeToolName
  readonly error: string
  readonly output: null
  readonly success: false
}

// Represents a successful code tool execution
export type CodeToolSuccess<T> = {
  readonly tool: CodeToolName
  readonly error: null
  readonly output: T
  readonly success: true
}

// Union type representing the result of a code tool execution
export type CodeToolResult<T> = CodeToolFailure | CodeToolSuccess<T>

// Creates a failure result for a code tool execution
const createFailure = (toolName: CodeToolName, error: ToolError): CodeToolFailure => {
  const errorMessage = error.error instanceof Error ? error.error.message : error.error
  return {
    tool: toolName,
    error: JSONN.show({
      location: error.location,
      error: errorMessage,
    }),
    success: false,
    output: null,
  }
}

// Creates a success result for a code tool execution
const createSuccess = <T>(toolName: CodeToolName, output: T): CodeToolSuccess<T> => {
  return {
    tool: toolName,
    error: null,
    output,
    success: true,
  }
}

// Type guard to check if a value is a valid CodeToolResult
const isCodeToolResult = <T = unknown>(value: unknown): value is CodeToolResult<T> => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const result = value as Record<string, unknown>

  // Validate required properties
  if (
    typeof result.success !== "boolean" ||
    typeof result.tool !== "string" ||
    !("error" in result) ||
    !("output" in result)
  ) {
    return false
  }

  // Validate based on success flag
  return result.success
    ? result.error === null && result.output !== null
    : typeof result.error === "string" && result.output === null
}

// Type guard to check if a result represents success
const isSuccess = <T = unknown>(result: unknown): result is CodeToolSuccess<T> =>
  isCodeToolResult<T>(result) && result.success

const Tools = {
  createFailure,
  createSuccess,
  isCodeToolResult,
  isSuccess,
}

export default Tools
