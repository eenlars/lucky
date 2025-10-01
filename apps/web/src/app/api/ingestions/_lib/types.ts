export type WorkflowIO = {
  id: string
  input: string
  expected: string
}

export type EvaluationConfig = {
  type: "exact" | "llm" | "regex" | "bleu" | "custom"
  inputField?: "input" | "expected"
  params?: Record<string, any>
}

export type DatasetMeta = {
  datasetId: string
  goal: string
  ios: WorkflowIO[]
  evaluation?: EvaluationConfig
  createdAt: string
  // Existing fields persisted by upload route (kept for compatibility)
  type?: string
  file?: {
    path: string
    name: string
    contentType?: string
    size?: number
  }
  onlyIncludeInputColumns?: string[]
}
