export interface CsvColumn {
  index: number
  name: string
}

export interface CsvRow {
  [key: string]: string
}

export interface CsvData {
  columns: CsvColumn[]
  rows: CsvRow[]
  totalRows: number
}

export interface CsvExtractionOptions {
  columns?: string[] // specific columns to extract
  limit?: number // limit number of rows returned
  skipEmptyRows?: boolean
  delimiter?: string
}

export interface CsvCreationOptions {
  delimiter?: string // default is comma
  includeHeaders?: boolean // default is true
  overwrite?: boolean // default is false
}

export interface FilterCondition {
  column: string
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
    | "greaterThanOrEqual"
    | "lessThanOrEqual"
    | "notEquals"
    | "isEmpty"
    | "isNotEmpty"
  value?: string | number
  caseSensitive?: boolean
}

export interface FilterOptions {
  conditions: FilterCondition[]
  logic?: "AND" | "OR" // how to combine multiple conditions
  limit?: number
  skipEmptyRows?: boolean
}
