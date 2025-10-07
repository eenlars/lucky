import type { ContextStore } from "@core/utils/persistence/memory/ContextStore"
import { Tools, type WorkflowFile } from "@lucky/shared"
import type { CodeToolResult } from "@lucky/tools"
import { CsvHandler } from "./CsvHandler"
import type {
  CsvColumn,
  CsvCreationOptions,
  CsvExtractionOptions,
  CsvRow,
  FilterCondition,
  FilterOptions,
} from "./types"

/**
 * get columns from a csv file
 */
export async function getCsvColumns(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
): Promise<CodeToolResult<CsvColumn[]>> {
  try {
    const handler = new CsvHandler(workflowFile, contextStore)
    const columns = await handler.getColumns()

    return Tools.createSuccess("saveFileLegacy", columns)
  } catch (error) {
    return Tools.createFailure("saveFileLegacy", {
      location: "getCsvColumns",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * extract data from a csv file with options
 */
export async function extractCsvData(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
  options: CsvExtractionOptions = {},
): Promise<CodeToolResult<CsvRow[]>> {
  try {
    const handler = new CsvHandler(workflowFile, contextStore)
    const data = await handler.extractData(options)

    return Tools.createSuccess("saveFileLegacy", data)
  } catch (error) {
    return Tools.createFailure("saveFileLegacy", {
      location: "extractCsvData",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * get csv file statistics
 */
export async function getCsvStats(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
): Promise<
  CodeToolResult<{
    totalRows: number
    totalColumns: number
    columns: CsvColumn[]
    fileName: string
  }>
> {
  try {
    const handler = new CsvHandler(workflowFile, contextStore)
    const stats = await handler.getStats()

    return Tools.createSuccess("saveFileLegacy", stats)
  } catch (error) {
    return Tools.createFailure("saveFileLegacy", {
      location: "getCsvStats",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * create a new csv file with data
 */
export async function createCsvFile(
  key: string,
  data: CsvRow[],
  contextStore: ContextStore,
  options: CsvCreationOptions = {},
): Promise<CodeToolResult<string>> {
  try {
    const handler = new CsvHandler({} as WorkflowFile, contextStore)
    await handler.writeData(key, data, options)

    return Tools.createSuccess("csvWriter", `csv data created successfully with key: ${key}`)
  } catch (error) {
    return Tools.createFailure("csvWriter", {
      location: "createCsvFile",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * create csv from column arrays
 */
export async function createCsvFromColumns(
  key: string | undefined,
  columns: { [columnName: string]: string[] },
  contextStore: ContextStore,
  options: CsvCreationOptions = {},
): Promise<CodeToolResult<string>> {
  if (!key) {
    return Tools.createFailure("csvWriter", {
      location: "createCsvFromColumns",
      error: "key is required for createFromColumns action",
    })
  }

  try {
    const columnNames = Object.keys(columns)
    if (columnNames.length === 0) {
      throw new Error("no columns provided")
    }

    // validate all columns have same length
    const lengths = columnNames.map(name => columns[name].length)
    const firstLength = lengths[0]
    if (!lengths.every(len => len === firstLength)) {
      throw new Error("all columns must have the same number of rows")
    }

    // convert columns to rows
    const rows: CsvRow[] = []
    for (let i = 0; i < firstLength; i++) {
      const row: CsvRow = {}
      columnNames.forEach(colName => {
        row[colName] = columns[colName][i]
      })
      rows.push(row)
    }

    return await createCsvFile(key, rows, contextStore, options)
  } catch (error) {
    return Tools.createFailure("csvWriter", {
      location: "appendToCsv",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * append data to existing csv file
 */
export async function appendToCsv(
  key: string,
  data: CsvRow[],
  contextStore: ContextStore,
  options: { delimiter?: string } = {},
): Promise<CodeToolResult<string>> {
  try {
    const handler = new CsvHandler({} as WorkflowFile, contextStore)
    await handler.appendData(key, data, options)

    return Tools.createSuccess("csvWriter", `data appended successfully to key: ${key}`)
  } catch (error) {
    return Tools.createFailure("csvWriter", {
      location: "appendToCsv",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * filter csv data with advanced filtering options
 */
export async function filterCsvData(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
  filterOptions: FilterOptions,
): Promise<CodeToolResult<CsvRow[]>> {
  try {
    const handler = new CsvHandler(workflowFile, contextStore)
    const data = await handler.filterData(filterOptions)

    return Tools.createSuccess("csvFilter", data)
  } catch (error) {
    return Tools.createFailure("csvFilter", {
      location: "filterCsvData",
      error: error instanceof Error ? error.message : "unknown error",
    })
  }
}

/**
 * simple filter for common use cases - filter by single column and value
 */
export async function simpleFilterCsv(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
  column: string,
  value: string,
  operator: FilterCondition["operator"] = "contains",
  options: {
    caseSensitive?: boolean
    limit?: number
    skipEmptyRows?: boolean
  } = {},
): Promise<CodeToolResult<CsvRow[]>> {
  return filterCsvData(workflowFile, contextStore, {
    conditions: [
      {
        column,
        operator,
        value,
        caseSensitive: options.caseSensitive,
      },
    ],
    logic: "AND",
    limit: options.limit,
    skipEmptyRows: options.skipEmptyRows,
  })
}

/**
 * filter by multiple values in same column (OR logic within column)
 */
export async function filterByMultipleValues(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
  column: string,
  values: string[],
  operator: FilterCondition["operator"] = "equals",
  options: {
    caseSensitive?: boolean
    limit?: number
    skipEmptyRows?: boolean
  } = {},
): Promise<CodeToolResult<CsvRow[]>> {
  const conditions: FilterCondition[] = values.map(value => ({
    column,
    operator,
    value,
    caseSensitive: options.caseSensitive,
  }))

  return filterCsvData(workflowFile, contextStore, {
    conditions,
    logic: "OR", // any of the values match
    limit: options.limit,
    skipEmptyRows: options.skipEmptyRows,
  })
}

/**
 * filter by numeric range
 */
export async function filterByNumericRange(
  workflowFile: WorkflowFile,
  contextStore: ContextStore,
  column: string,
  min?: number,
  max?: number,
  options: {
    limit?: number
    skipEmptyRows?: boolean
  } = {},
): Promise<CodeToolResult<CsvRow[]>> {
  const conditions: FilterCondition[] = []

  if (min !== undefined) {
    conditions.push({
      column,
      operator: "greaterThanOrEqual",
      value: min,
    })
  }

  if (max !== undefined) {
    conditions.push({
      column,
      operator: "lessThanOrEqual",
      value: max,
    })
  }

  if (conditions.length === 0) {
    return Tools.createFailure("csvFilter", {
      location: "filterByNumericRange",
      error: "at least one of min or max must be specified",
    })
  }

  return filterCsvData(workflowFile, contextStore, {
    conditions,
    logic: "AND",
    limit: options.limit,
    skipEmptyRows: options.skipEmptyRows,
  })
}
