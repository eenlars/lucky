import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { CsvHandler } from "@examples/definitions/csv-handler/main/CsvHandler"
import Tools, { type CodeToolResult } from "@lucky/tools"
import { type ToolExecutionContext, defineTool } from "@lucky/tools"
import { z } from "zod"

interface ColumnData {
  values: string[]
  totalRows: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

const params = z.object({
  action: z.enum(["extractRows"]).describe("action to perform on csv file"),
  columnName: z.string().describe("column name for extraction"),
  page: z.number().default(1).describe("page number for pagination").nullish(),
  limit: z.number().default(10).describe("number of rows per page").nullish(),
})

type Params = z.infer<typeof params>

const execute = async (
  params: Params,
  toolExecutionContext?: ToolExecutionContext,
): Promise<CodeToolResult<ColumnData>> => {
  const { columnName, page = 1, limit = 10 } = params

  if (!toolExecutionContext?.workflowFiles[0]) {
    //todo-fix-[0]
    return Tools.createFailure("csvReader", {
      location: "csvReader",
      error: "no file provided in tool execution context",
    })
  }

  if (!toolExecutionContext?.workflowInvocationId) {
    return Tools.createFailure("csvReader", {
      location: "csvReader",
      error: "no workflow invocation id provided in tool execution context",
    })
  }

  try {
    // create context store for this workflow
    const contextStore = createContextStore("supabase", toolExecutionContext.workflowInvocationId)
    const csvHandler = new CsvHandler(toolExecutionContext.workflowFiles[0], contextStore)

    // check if column exists
    const column = await csvHandler.getColumn(columnName)
    if (!column) {
      return Tools.createFailure("csvReader", {
        location: "csvReader",
        error: `column '${columnName}' not found in csv`,
      })
    }

    // get stats for pagination info
    const stats = await csvHandler.getStats()
    const totalRows = stats.totalRows
    const totalPages = Math.ceil(totalRows / (limit ?? totalRows))
    const startIndex = ((page ?? 1) - 1) * (limit ?? totalRows)

    // extract data with pagination
    const allData = await csvHandler.extractData({ columns: [columnName] })
    const paginatedData = allData.slice(startIndex, startIndex + (limit ?? totalRows))

    const values = paginatedData
      .map(row => row[columnName])
      .filter(val => val !== undefined && val !== null)
      .map(val => String(val))

    const columnData: ColumnData = {
      values,
      totalRows,
      currentPage: page ?? 1,
      totalPages,
      hasMore: (page ?? 1) < totalPages,
    }

    return Tools.createSuccess("csvReader", columnData)
  } catch (error) {
    lgg.error("error in csvReader tool:", error)
    return Tools.createFailure("csvReader", {
      location: "csvReader",
      error: error,
    })
  }
}

/**
 * csv handler tool for reading and extracting csv data
 */
const csvReaderTool = defineTool({
  name: "csvReader",
  params,
  execute,
})

export const tool = csvReaderTool
