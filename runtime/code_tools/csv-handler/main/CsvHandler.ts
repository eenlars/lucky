import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import type { ContextStore } from "@core/utils/persistence/memory/ContextStore"
import Papa from "papaparse"
import path from "path"
import type {
  CsvColumn,
  CsvCreationOptions,
  CsvData,
  CsvExtractionOptions,
  CsvRow,
  FilterCondition,
  FilterOptions,
} from "./types"

/**
 * csv handler class for managing csv file operations
 */
export class CsvHandler {
  private workflowFile: WorkflowFile
  private contextStore: ContextStore
  private data: CsvData | null = null
  private cacheKey: string

  constructor(workflowFile: WorkflowFile, contextStore: ContextStore) {
    this.workflowFile = workflowFile
    this.contextStore = contextStore
    // use the file path as cache key
    this.cacheKey = `csv_data_${path.basename(workflowFile.filePath)}`
  }

  /**
   * load and parse the csv file from https url (supabase)
   */
  private async loadData(): Promise<void> {
    if (this.data) return

    // first check if we have cached data
    const cachedData = await this.contextStore.get<CsvData>("workflow", this.cacheKey)
    if (cachedData) {
      this.data = cachedData
      return
    }

    // since we only accept supabase files, everything should be https://
    if (!this.workflowFile.filePath.startsWith("https://")) {
      throw new Error(`only https urls are supported. got: ${this.workflowFile.filePath}`)
    }

    let fileContent: string
    try {
      const response = await fetch(this.workflowFile.filePath)
      if (!response.ok) {
        throw new Error(`failed to fetch file: ${response.status} ${response.statusText}`)
      }
      fileContent = await response.text()
    } catch (error) {
      throw new Error(
        `failed to load csv from url: ${this.workflowFile.filePath}. error: ${error instanceof Error ? error.message : "unknown error"}`
      )
    }

    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      delimiter: "auto",
      transformHeader: (header: string) => header.trim(),
    })

    if (parseResult.errors.length > 0) {
      throw new Error(`csv parsing errors: ${parseResult.errors.map((e) => e.message).join(", ")}`)
    }

    const columns: CsvColumn[] =
      parseResult.meta.fields?.map((field, index) => ({
        index,
        name: field,
      })) || []

    this.data = {
      columns,
      rows: parseResult.data as CsvRow[],
      totalRows: parseResult.data.length,
    }

    // cache the parsed data for future use
    await this.contextStore.set("workflow", this.cacheKey, this.data)
  }

  /**
   * get all columns with their indices
   */
  async getColumns(): Promise<CsvColumn[]> {
    await this.loadData()
    return this.data!.columns
  }

  /**
   * get column by name
   */
  async getColumn(name: string): Promise<CsvColumn | null> {
    const columns = await this.getColumns()
    return columns.find((col) => col.name === name) || null
  }

  /**
   * get column by index
   */
  async getColumnByIndex(index: number): Promise<CsvColumn | null> {
    const columns = await this.getColumns()
    return columns.find((col) => col.index === index) || null
  }

  /**
   * extract information from csv with filtering options
   */
  async extractData(options: CsvExtractionOptions = {}): Promise<CsvRow[]> {
    await this.loadData()

    let rows = this.data!.rows

    // filter by specific columns if provided
    if (options.columns && options.columns.length > 0) {
      rows = rows.map((row) => {
        const filteredRow: CsvRow = {}
        options.columns!.forEach((column) => {
          if (row[column] !== undefined) {
            filteredRow[column] = row[column]
          }
        })
        return filteredRow
      })
    }

    // skip empty rows if requested
    if (options.skipEmptyRows) {
      rows = rows.filter((row) => Object.values(row).some((value) => value && value.trim() !== ""))
    }

    // limit results if specified
    if (options.limit && options.limit > 0) {
      rows = rows.slice(0, options.limit)
    }

    return rows
  }

  /**
   * get basic stats about the csv
   */
  async getStats(): Promise<{
    totalRows: number
    totalColumns: number
    columns: CsvColumn[]
    fileName: string
  }> {
    await this.loadData()
    return {
      totalRows: this.data!.totalRows,
      totalColumns: this.data!.columns.length,
      columns: this.data!.columns,
      fileName: path.basename(this.workflowFile.filePath),
    }
  }

  /**
   * search for rows containing specific values
   */
  async searchRows(searchTerm: string, columns?: string[]): Promise<CsvRow[]> {
    await this.loadData()

    const searchColumns = columns || this.data!.columns.map((col) => col.name)
    const searchTermLower = searchTerm.toLowerCase()

    return this.data!.rows.filter((row) => {
      return searchColumns.some((column) => {
        const value = row[column]
        return value && value.toLowerCase().includes(searchTermLower)
      })
    })
  }

  /**
   * write data to context store as csv
   */
  async writeData(key: string, data: CsvRow[], options: CsvCreationOptions = {}): Promise<void> {
    const { delimiter = ",", includeHeaders = true, overwrite = false } = options

    if (data.length === 0) {
      throw new Error("no data provided to write")
    }

    // check if key exists and overwrite is false
    const existing = await this.contextStore.get("workflow", key)
    if (existing && !overwrite) {
      throw new Error(`data already exists with key: ${key}. set overwrite: true to replace it`)
    }

    // get headers from first row
    const headers = Object.keys(data[0])

    // create csv content
    const csvContent = Papa.unparse(data, {
      delimiter,
      header: includeHeaders,
      columns: headers,
    })

    // store csv content in context store
    await this.contextStore.set("workflow", key, csvContent)

    // also store parsed data for quick access
    const csvData: CsvData = {
      columns: headers.map((name, index) => ({ name, index })),
      rows: data,
      totalRows: data.length,
    }
    await this.contextStore.set("workflow", `${key}_parsed`, csvData)
  }

  /**
   * append data to existing csv in context store
   */
  async appendData(key: string, data: CsvRow[], options: { delimiter?: string } = {}): Promise<void> {
    const { delimiter = "," } = options

    if (data.length === 0) {
      throw new Error("no data provided to append")
    }

    // get existing csv content
    const existingCsv = await this.contextStore.get<string>("workflow", key)
    if (!existingCsv) {
      throw new Error(`csv data not found with key: ${key}`)
    }

    // create csv content without headers
    const newContent = Papa.unparse(data, {
      delimiter,
      header: false,
    })

    // append to existing content
    const updatedCsv = existingCsv + "\n" + newContent
    await this.contextStore.set("workflow", key, updatedCsv)

    // update parsed data if it exists
    const parsedKey = `${key}_parsed`
    const existingParsed = await this.contextStore.get<CsvData>("workflow", parsedKey)
    if (existingParsed) {
      existingParsed.rows.push(...data)
      existingParsed.totalRows = existingParsed.rows.length
      await this.contextStore.set("workflow", parsedKey, existingParsed)
    }
  }

  /**
   * filter data with advanced filtering options
   */
  async filterData(filterOptions: FilterOptions): Promise<CsvRow[]> {
    await this.loadData()

    // get all data first
    let allData = this.data!.rows

    // skip empty rows if requested
    if (filterOptions.skipEmptyRows) {
      allData = allData.filter((row) => Object.values(row).some((value) => value && value.trim() !== ""))
    }

    if (filterOptions.conditions.length === 0) {
      // no conditions, return all data (with limit if specified)
      return filterOptions.limit ? allData.slice(0, filterOptions.limit) : allData
    }

    // apply filtering
    const filteredData = allData.filter((row) => {
      const conditionResults = filterOptions.conditions.map((condition) => this.evaluateCondition(row, condition))

      // combine results based on logic
      if (filterOptions.logic === "OR") {
        return conditionResults.some((result) => result)
      } else {
        // default to AND logic
        return conditionResults.every((result) => result)
      }
    })

    // apply limit if specified
    return filterOptions.limit ? filteredData.slice(0, filterOptions.limit) : filteredData
  }

  /**
   * evaluate a single filter condition against a row
   */
  private evaluateCondition(row: CsvRow, condition: FilterCondition): boolean {
    const cellValue = row[condition.column]

    if (cellValue === undefined || cellValue === null) {
      return condition.operator === "isEmpty"
    }

    const stringValue = String(cellValue)
    const isEmpty = stringValue.trim() === ""

    switch (condition.operator) {
      case "isEmpty":
        return isEmpty

      case "isNotEmpty":
        return !isEmpty

      case "equals":
        if (condition.caseSensitive === false) {
          return stringValue.toLowerCase() === String(condition.value).toLowerCase()
        }
        return stringValue === String(condition.value)

      case "notEquals":
        if (condition.caseSensitive === false) {
          return stringValue.toLowerCase() !== String(condition.value).toLowerCase()
        }
        return stringValue !== String(condition.value)

      case "contains":
        if (condition.caseSensitive === false) {
          return stringValue.toLowerCase().includes(String(condition.value).toLowerCase())
        }
        return stringValue.includes(String(condition.value))

      case "startsWith":
        if (condition.caseSensitive === false) {
          return stringValue.toLowerCase().startsWith(String(condition.value).toLowerCase())
        }
        return stringValue.startsWith(String(condition.value))

      case "endsWith":
        if (condition.caseSensitive === false) {
          return stringValue.toLowerCase().endsWith(String(condition.value).toLowerCase())
        }
        return stringValue.endsWith(String(condition.value))

      case "greaterThan":
        const numValue1 = parseFloat(stringValue)
        const compareValue1 =
          typeof condition.value === "number" ? condition.value : parseFloat(String(condition.value))
        return !isNaN(numValue1) && !isNaN(compareValue1) && numValue1 > compareValue1

      case "lessThan":
        const numValue2 = parseFloat(stringValue)
        const compareValue2 =
          typeof condition.value === "number" ? condition.value : parseFloat(String(condition.value))
        return !isNaN(numValue2) && !isNaN(compareValue2) && numValue2 < compareValue2

      case "greaterThanOrEqual":
        const numValue3 = parseFloat(stringValue)
        const compareValue3 =
          typeof condition.value === "number" ? condition.value : parseFloat(String(condition.value))
        return !isNaN(numValue3) && !isNaN(compareValue3) && numValue3 >= compareValue3

      case "lessThanOrEqual":
        const numValue4 = parseFloat(stringValue)
        const compareValue4 =
          typeof condition.value === "number" ? condition.value : parseFloat(String(condition.value))
        return !isNaN(numValue4) && !isNaN(compareValue4) && numValue4 <= compareValue4

      default: {
        const _exhaustiveCheck: never = condition.operator
        void _exhaustiveCheck
        return false
      }
    }
  }
}
