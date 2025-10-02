import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import Tools from "@lucky/tools"
import { defineTool } from "@lucky/tools"
import { z } from "zod"
import { filterByMultipleValues, filterByNumericRange, filterCsvData, simpleFilterCsv } from "./main/function"
import type { FilterOptions } from "./main/types"

// Helper function to clean simple filter options by removing null values
const cleanSimpleFilterOptions = (
  options: any,
): { caseSensitive?: boolean; limit?: number; skipEmptyRows?: boolean } | undefined => {
  if (!options || typeof options !== "object") return undefined

  const cleaned: {
    caseSensitive?: boolean
    limit?: number
    skipEmptyRows?: boolean
  } = {}
  if (options.caseSensitive !== null && options.caseSensitive !== undefined) {
    cleaned.caseSensitive = options.caseSensitive
  }
  if (options.limit !== null && options.limit !== undefined) {
    cleaned.limit = options.limit
  }
  if (options.skipEmptyRows !== null && options.skipEmptyRows !== undefined) {
    cleaned.skipEmptyRows = options.skipEmptyRows
  }

  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

const csvFilterParams = z.object({
  action: z
    .enum(["filter", "simpleFilter", "filterMultipleValues", "filterNumericRange"])
    .describe("type of filtering action to perform"),
  // for advanced filter
  filterOptions: z
    .object({
      conditions: z.array(
        z.object({
          column: z.string(),
          operator: z.enum([
            "equals",
            "contains",
            "startsWith",
            "endsWith",
            "greaterThan",
            "lessThan",
            "greaterThanOrEqual",
            "lessThanOrEqual",
            "notEquals",
            "isEmpty",
            "isNotEmpty",
          ]),
          value: z.union([z.string(), z.number()]).nullish(),
          caseSensitive: z.boolean().nullish(),
        }),
      ),
      logic: z.enum(["AND", "OR"]).nullish(),
      limit: z.number().nullish(),
      skipEmptyRows: z.boolean().nullish(),
    })
    .nullish()
    .describe("advanced filter options with multiple conditions"),

  // for simple filter
  column: z.string().nullish().describe("column name for simple filtering"),
  value: z.string().nullish().describe("value to filter by for simple filtering"),
  operator: z
    .enum([
      "equals",
      "contains",
      "startsWith",
      "endsWith",
      "greaterThan",
      "lessThan",
      "greaterThanOrEqual",
      "lessThanOrEqual",
      "notEquals",
      "isEmpty",
      "isNotEmpty",
    ])
    .nullish()
    .describe("operator for filtering (default: contains)"),

  // for multiple values filter
  values: z.array(z.string()).nullish().describe("array of values to filter by"),

  // for numeric range filter
  min: z.number().nullish().describe("minimum value for numeric range filter"),
  max: z.number().nullish().describe("maximum value for numeric range filter"),

  // common options
  options: z
    .object({
      caseSensitive: z.boolean().nullish(),
      limit: z.number().nullish(),
      skipEmptyRows: z.boolean().nullish(),
    })
    .nullish()
    .describe("common filtering options"),
})

/**
 * filter csv data with advanced filtering options
 * supports multiple conditions with AND/OR logic, various operators, and result limiting
 */
const csvFilterTool = defineTool({
  name: "csvFilter",
  params: csvFilterParams,

  async execute(params, context) {
    const { action, filterOptions, column, value, operator = "contains", values, min, max, options = {} } = params

    if (!context?.workflowFiles[0]) {
      return Tools.createFailure("csvFilter", {
        location: "csvFilter",
        error: "no file provided in tool execution context",
      })
    }

    if (!context?.workflowInvocationId) {
      return Tools.createFailure("csvFilter", {
        location: "csvFilter",
        error: "no workflow invocation id provided in tool execution context",
      })
    }

    const contextStore = createContextStore("supabase", context.workflowInvocationId)

    lgg.info("csv filter params", JSON.stringify(params, null, 2))

    switch (action) {
      case "filter": {
        if (!filterOptions) {
          return Tools.createFailure("csvFilter", {
            location: "filter",
            error: "filterOptions is required for advanced filter action",
          })
        }

        const result = await filterCsvData(context.workflowFiles[0], contextStore, filterOptions as FilterOptions)

        if (!result.success) {
          return Tools.createFailure("csvFilter", {
            location: "filter",
            error: result.error,
          })
        }

        return result.output
      }

      case "simpleFilter": {
        if (!column || !value) {
          return Tools.createFailure("csvFilter", {
            location: "simpleFilter",
            error: "column and value are required for simpleFilter action",
          })
        }

        const result = await simpleFilterCsv(
          context.workflowFiles[0],
          contextStore,
          column,
          value,
          operator ?? undefined,
          cleanSimpleFilterOptions(options),
        )

        if (!result.success) {
          return Tools.createFailure("csvFilter", {
            location: "simpleFilter",
            error: result.error,
          })
        }

        return result.output
      }

      case "filterMultipleValues": {
        if (!column || !values) {
          return Tools.createFailure("csvFilter", {
            location: "filterMultipleValues",
            error: "column and values are required for filterMultipleValues action",
          })
        }

        const result = await filterByMultipleValues(
          context.workflowFiles[0],
          contextStore,
          column,
          values,
          operator ?? undefined,
          cleanSimpleFilterOptions(options),
        )

        if (!result.success) {
          return Tools.createFailure("csvFilter", {
            location: "filterMultipleValues",
            error: result.error,
          })
        }

        return Tools.createSuccess("csvFilter", result.output)
      }

      case "filterNumericRange": {
        if (!column) {
          return Tools.createFailure("csvFilter", {
            location: "filterNumericRange",
            error: "column is required for filterNumericRange action",
          })
        }

        const result = await filterByNumericRange(
          context.workflowFiles[0],
          contextStore,
          column,
          min ?? undefined,
          max ?? undefined,
          cleanSimpleFilterOptions(options),
        )

        if (!result.success) {
          return Tools.createFailure("csvFilter", {
            location: "filterNumericRange",
            error: result.error,
          })
        }

        return Tools.createSuccess("csvFilter", result.output)
      }

      default: {
        const _exhaustiveCheck: never = action
        void _exhaustiveCheck
        return Tools.createFailure("csvFilter", {
          location: "csvFilter",
          error: `unsupported action: ${action}`,
        })
      }
    }
  },
})

export const tool = csvFilterTool
