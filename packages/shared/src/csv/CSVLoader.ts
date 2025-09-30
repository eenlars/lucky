import { readFileSync } from "fs"
import Papa from "papaparse"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

export interface CSVLoaderOptions {
  hasHeaders?: boolean
  skipEmptyLines?: boolean
  columnMappings?: Record<string, string[]>
  onlyIncludeInputColumns?: string[]
}

export class CSVLoader {
  private filePath: string
  private options: CSVLoaderOptions

  constructor(filePath: string, options: CSVLoaderOptions = {}) {
    this.filePath = filePath
    this.options = {
      hasHeaders: true,
      skipEmptyLines: true,
      ...options,
    }
  }

  async loadAsString(): Promise<string> {
    try {
      const csvContent = await this.loadContent()

      if (!this.options.hasHeaders) {
        return csvContent
      }

      const parsed = Papa.parse(csvContent, { header: false })
      return parsed.data.map(row => (row as string[]).join(",")).join("\n")
    } catch (error) {
      throw new Error(`failed to load csv as string from ${this.filePath}: ${error}`)
    }
  }

  async loadAsJSON<T = Record<string, any>>(): Promise<T[]> {
    try {
      const csvContent = await this.loadContent()

      const parsed = Papa.parse(csvContent, {
        header: this.options.hasHeaders,
        skipEmptyLines: this.options.skipEmptyLines,
      })

      if (!this.options.hasHeaders) {
        let data = parsed.data as T[]

        if (this.options.onlyIncludeInputColumns && Array.isArray(data[0])) {
          const columnIndices = this.options.onlyIncludeInputColumns
            .map(col => parseInt(col))
            .filter(index => !isNaN(index))

          if (columnIndices.length > 0) {
            data = data.map(row => columnIndices.map(index => (row as any[])[index])) as T[]
          }
        }

        return data
      }

      return (parsed.data as T[])
        .map(row => this.mapColumns(row as Record<string, any>))
        .map(row => this.filterColumns(row))
        .filter(item => this.isValidRow(item)) as T[]
    } catch (error) {
      throw new Error(`failed to load csv as json from ${this.filePath}: ${error}`)
    }
  }

  private mapColumns(row: Record<string, any>): Record<string, any> {
    if (!this.options.columnMappings) {
      return row
    }

    const mapped: Record<string, any> = {}

    for (const [targetField, possibleNames] of Object.entries(this.options.columnMappings)) {
      let value = ""

      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
          value = row[name]
          break
        }
      }

      mapped[targetField] = value
    }

    return mapped
  }

  private filterColumns(row: Record<string, any>): Record<string, any> {
    if (!this.options.onlyIncludeInputColumns) {
      return row
    }

    const filtered: Record<string, any> = {}

    for (const column of this.options.onlyIncludeInputColumns) {
      if (row[column] !== undefined) {
        filtered[column] = row[column]
      }
    }

    return filtered
  }

  private isValidRow(item: Record<string, any>): boolean {
    if (!this.options.columnMappings) {
      return true
    }

    return Object.keys(this.options.columnMappings).some(field => item[field] && item[field] !== "")
  }

  private async loadContent(): Promise<string> {
    if (this.filePath.startsWith("http://") || this.filePath.startsWith("https://")) {
      const response = await fetch(this.filePath)
      if (!response.ok) {
        throw new Error(`failed to fetch csv from ${this.filePath}: ${response.status} ${response.statusText}`)
      }
      return await response.text()
    } else {
      return readFileSync(this.filePath, "utf-8")
    }
  }

  static fromRelativePath(relativePath: string, options?: CSVLoaderOptions): CSVLoader {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const fullPath = join(__dirname, relativePath)
    return new CSVLoader(fullPath, options)
  }
}
