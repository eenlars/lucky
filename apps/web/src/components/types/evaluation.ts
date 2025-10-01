export type RubricCriteria = {
  id: string
  name: string
  maxPoints: number
  achievedPoints: number | null
}

export type Metrics = {
  score: number | null
  time: string | null
  cost: string | null
  output: string | null
}

export type FeedbackData = {
  taskId: string
  rating: number | null
  feedback: string
  timestamp: string
}

export const DEFAULT_CRITERIA: RubricCriteria[] = [
  { id: "1", name: "Accuracy", maxPoints: 10, achievedPoints: null },
  { id: "2", name: "Completeness", maxPoints: 10, achievedPoints: null },
  { id: "3", name: "Clarity", maxPoints: 5, achievedPoints: null },
]

export const FAKE_OUTPUTS = [
  "Task completed successfully with comprehensive analysis.",
  "Generated detailed report with 95% accuracy score.",
  "Processed request and provided actionable insights.",
  "Analysis complete: Found 3 key patterns in the data.",
  "Solution implemented with proper error handling.",
]
