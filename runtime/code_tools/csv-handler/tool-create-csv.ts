import Tools, { type CodeToolResult } from "@core/tools/code/output.types"
import { defineTool } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { z } from "zod"
import {
  appendToCsv,
  createCsvFile,
  createCsvFromColumns,
} from "./main/function"
import type { CsvCreationOptions } from "./main/types"

// Helper function to clean options by removing null values
const cleanOptions = (options: any): CsvCreationOptions | undefined => {
  if (!options || typeof options !== "object") return undefined

  const cleaned: CsvCreationOptions = {}
  if (options.delimiter !== null && options.delimiter !== undefined) {
    cleaned.delimiter = options.delimiter
  }
  if (options.includeHeaders !== null && options.includeHeaders !== undefined) {
    cleaned.includeHeaders = options.includeHeaders
  }
  if (options.overwrite !== null && options.overwrite !== undefined) {
    cleaned.overwrite = options.overwrite
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

const csvWriterParams = z.object({
  action: z
    .enum(["createFromRows", "createFromColumns", "appendToFile"])
    .describe("action to perform for csv creation"),
  key: z
    .string()
    .nullish()
    .describe("key name for storing the csv data in context store"),
  data: z
    .union([
      z.array(z.record(z.string(), z.string())), // for rows
      z.record(z.string(), z.array(z.string())), // for columns
    ])
    .nullish()
    .describe(
      "data to write - array of objects for rows, or object with column arrays"
    ),
  options: z
    .object({
      delimiter: z
        .string()
        .nullish()
        .describe("csv delimiter (default: comma)"),
      includeHeaders: z
        .boolean()
        .nullish()
        .describe("include headers in csv file (default: true)"),
      overwrite: z
        .boolean()
        .nullish()
        .describe("overwrite existing file (default: false)"),
    })
    .nullish()
    .describe("options for csv creation"),
})

/**
 * csv creator tool for creating and writing csv files
 */
const csvWriterTool = defineTool({
  name: "csvWriter",
  params: csvWriterParams,
  async execute(params, context): Promise<CodeToolResult<string>> {
    const { action, key, data, options = {} } = params

    lgg.info("csv creator params", params)

    if (!data) {
      throw new Error("data is required for csv creation")
    }

    if (!context?.workflowInvocationId) {
      return Tools.createFailure("csvWriter", {
        location: "csvWriter",
        error: "no workflow invocation id provided in tool execution context",
      })
    }

    const contextStore = createContextStore(
      "supabase",
      context.workflowInvocationId
    )

    switch (action) {
      case "createFromRows": {
        if (!Array.isArray(data)) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:noData",
            error: "data must be an array of objects for createFromRows action",
          })
        }

        const result = await createCsvFile(
          key!,
          data,
          contextStore,
          cleanOptions(options)
        )

        if (!result.success) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:createFromRows:error",
            error: result.error,
          })
        }

        return Tools.createSuccess("csvWriter", result.output)
      }

      case "createFromColumns": {
        if (Array.isArray(data)) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:createFromColumns:noData",
            error:
              "data must be an object with column arrays for createFromColumns action",
          })
        }

        const result = await createCsvFromColumns(
          key!,
          data,
          contextStore,
          cleanOptions(options)
        )

        if (!result.success) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:createFromColumns:error",
            error: result.error,
          })
        }

        return Tools.createSuccess("csvWriter", result.output)
      }

      case "appendToFile": {
        if (!Array.isArray(data)) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:appendToFile:noData",
            error: "data must be an array of objects for appendToFile action",
          })
        }

        const result = await appendToCsv(
          key!,
          data,
          contextStore,
          cleanOptions(options)
        )

        if (!result.success) {
          return Tools.createFailure("csvWriter", {
            location: "csvWriter:appendToFile:error",
            error: result.error,
          })
        }

        return Tools.createSuccess("csvWriter", result.output)
      }

      default:
        return Tools.createFailure("csvWriter", {
          location: "csvWriter:unsupportedAction",
          error: `unsupported action: ${action}`,
        })
    }
  },
})

export const tool = csvWriterTool
