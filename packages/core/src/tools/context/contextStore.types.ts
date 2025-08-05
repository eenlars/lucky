import { llmify } from "@utils/common/llmify"
import { JSONN } from "@utils/file-types/json/jsonParse"

export type WorkflowFile = {
  store: "supabase"
  filePath: string // the supabase file path
  summary: string // what the file is about
}

export type WorkflowFiles = {
  workflowFiles: WorkflowFile[]
}

export interface ContextFileInfo {
  key: string
  summary: string
  created: string
  modified: string
  size: number
  dataType: string
}

export const contextFilePrompt = (
  workflowFiles: WorkflowFile[],
  inputFile?: string,
  evalExplanation?: string,
  outputType?: any
) => {
  let contextContent = `You have access to a persistent context store named 
  "${workflowFiles.map((file) => file.filePath).join(", ")}". 
  Use these specialized context tools for efficient data management:

• contextGet - Retrieve data by key with optional defaults
• contextSet - Store data with metadata and versioning  
• contextList - List and explore stored keys with filtering
• contextManage - Advanced operations (delete, copy, move, backup)

The context store has two scopes: "workflow" (shared across all nodes) and "node" (specific to each node). 
Data persists between workflow executions.`

  if (inputFile) {
    contextContent += `\n\nInput file URL: ${inputFile}`
  }

  if (evalExplanation) {
    contextContent += `\n\nEvaluation explanation: ${evalExplanation}`
  }

  if (outputType) {
    contextContent += `\n\nExpected output type: ${llmify(JSONN.show(outputType))}`
  }

  return contextContent
}
//todo-context this is very bad
