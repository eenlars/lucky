import type { RubricCriteria } from "../types/evaluation"

export function createRubricString(criteria: RubricCriteria[]): string {
  if (criteria.length === 0) return ""

  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0)

  const rubricLines = criteria.map((criterion, index) => {
    const name = criterion.name.trim() || `Criterion ${index + 1}`
    return `${index + 1}. ${name} (${criterion.maxPoints} points)`
  })

  return `Evaluation Rubric (Total: ${totalMaxPoints} points):\n${rubricLines.join("\n")}\n\nPlease evaluate the response according to these criteria and provide specific feedback for each criterion.`
}

export function calculateTotalMaxPoints(criteria: RubricCriteria[]): number {
  return criteria.reduce((sum, c) => sum + c.maxPoints, 0)
}

export function calculateTotalAchievedPoints(criteria: RubricCriteria[]): number {
  return criteria.reduce((sum, c) => sum + (c.achievedPoints || 0), 0)
}

export function hasResults(criteria: RubricCriteria[]): boolean {
  return criteria.some((c) => c.achievedPoints !== null)
}

export function generateFakeScores(criteria: RubricCriteria[]): RubricCriteria[] {
  return criteria.map((c) => ({
    ...c,
    achievedPoints: Math.round(Math.random() * c.maxPoints),
  }))
}

export function parseRubricString(rubricString: string): RubricCriteria[] {
  if (!rubricString || !rubricString.includes("Evaluation Rubric")) {
    return []
  }

  const lines = rubricString.split("\n")
  const criteria: RubricCriteria[] = []

  // Parse lines that match the pattern: "1. Name (X points)"
  const criterionRegex = /^(\d+)\.\s*(.+?)\s*\((\d+)\s*points?\)/

  for (const line of lines) {
    const match = line.match(criterionRegex)
    if (match) {
      const [, id, name, points] = match
      criteria.push({
        id: id,
        name: name.trim(),
        maxPoints: parseInt(points, 10),
        achievedPoints: null,
      })
    }
  }

  return criteria.length > 0 ? criteria : []
}
