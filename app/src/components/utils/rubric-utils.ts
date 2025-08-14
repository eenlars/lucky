import type { RubricCriteria } from "../types/evaluation"

export function createRubricString(criteria: RubricCriteria[]): string {
  if (criteria.length === 0) return ""
  
  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0)
  
  const rubricLines = criteria.map((criterion, index) => {
    const name = criterion.name.trim() || `Criterion ${index + 1}`
    return `${index + 1}. ${name} (${criterion.maxPoints} points)`
  })
  
  return `Evaluation Rubric (Total: ${totalMaxPoints} points):\n${rubricLines.join('\n')}\n\nPlease evaluate the response according to these criteria and provide specific feedback for each criterion.`
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
  return criteria.map(c => ({
    ...c,
    achievedPoints: Math.round(Math.random() * c.maxPoints)
  }))
}