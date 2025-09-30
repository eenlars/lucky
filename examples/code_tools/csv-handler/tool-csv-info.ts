import Tools from "@core/tools/code/output.types"
import { defineTool } from "@core/tools/toolFactory"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { CsvHandler } from "@examples/code_tools/csv-handler/main/CsvHandler"
import { z } from "zod"

interface ColumnInfo {
  name: string
  index: number
  sampleValues: string[]
}

const TOOLNAME = "csvInfo"

// descriptions of the tools
const toolsDescriptions = {
  getStats: "getStats returns the total number of rows and columns in the csv file, names indeces and the headers.",
  getAllHeaders:
    "getAllHeaders returns the headers of the csv file. the headers are the names of the columns in the csv file.",
  readColumns:
    "readColumns returns the columns of the csv file. the columns are the names of the columns in the csv file.",
}

// csv info tool for getting csv metadata and structure information
const csvInfoTool = defineTool({
  name: TOOLNAME,
  params: z.object({
    action: z
      .enum(["readColumns", "getAllHeaders", "getStats"])
      .describe(llmify(`action to perform on csv file. ${Object.values(toolsDescriptions).join(";")}`)),
  }),
  async execute(params, context) {
    const { action } = params

    if (!context?.workflowFiles[0]) {
      return Tools.createFailure(TOOLNAME, {
        location: TOOLNAME,
        error: "no file provided in tool execution context",
      })
    }

    if (!context?.workflowInvocationId) {
      return Tools.createFailure(TOOLNAME, {
        location: TOOLNAME,
        error: "no workflow invocation id provided in tool execution context",
      })
    }

    try {
      const contextStore = createContextStore("supabase", context.workflowInvocationId)
      const csvHandler = new CsvHandler(context.workflowFiles[0], contextStore)

      if (action === "readColumns") {
        // get columns and sample data
        const columns = await csvHandler.getColumns()
        const sampleData = await csvHandler.extractData({ limit: 5 })

        const columnsInfo: ColumnInfo[] = columns.map(col => {
          const sampleValues = sampleData
            .map(row => row[col.name])
            .filter(val => val !== undefined && val !== null && val !== "")
            .map(val => String(val))

          return {
            name: col.name,
            index: col.index,
            sampleValues,
          }
        })

        return Tools.createSuccess(TOOLNAME, columnsInfo)
      }

      if (action === "getAllHeaders") {
        const columns = await csvHandler.getColumns()
        return Tools.createSuccess(TOOLNAME, {
          headers: columns.map(col => col.name),
        })
      }

      if (action === "getStats") {
        const stats = await csvHandler.getStats()
        return Tools.createSuccess(TOOLNAME, stats)
      }

      return Tools.createFailure(TOOLNAME, {
        location: "csvInfo",
        error: `unsupported action: ${action}`,
      })
    } catch (error) {
      lgg.error("error in csvInfo tool:", error)
      return Tools.createFailure(TOOLNAME, {
        location: "csvInfo",
        error: error,
      })
    }
  },
})

export const tool = csvInfoTool
