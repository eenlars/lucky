import { useEffect, useRef, useState } from "react"
import type { RubricCriteria } from "../types/evaluation"
import { DEFAULT_CRITERIA } from "../types/evaluation"
import {
  calculateTotalAchievedPoints,
  calculateTotalMaxPoints,
  createRubricString,
  generateFakeScores,
  hasResults,
  parseRubricString,
} from "../utils/rubric-utils"

export function useRubricManagement(
  ioId: string,
  initialExpected: string,
  updateExpected: (id: string, expected: string) => void
) {
  const [criteria, setCriteria] = useState<RubricCriteria[]>(() => {
    // Try to parse existing rubric, fall back to default if parsing fails
    const parsed = parseRubricString(initialExpected)
    return parsed.length > 0 ? parsed : DEFAULT_CRITERIA
  })
  const updateExpectedRef = useRef(updateExpected)
  useEffect(() => {
    updateExpectedRef.current = updateExpected
  }, [updateExpected])

  const totalMaxPoints = calculateTotalMaxPoints(criteria)
  const totalAchievedPoints = calculateTotalAchievedPoints(criteria)
  const hasRubricResults = hasResults(criteria)

  // Auto-save rubric when criteria change (with debounce)
  useEffect(() => {
    if (criteria.length === 0) return

    const timeoutId = setTimeout(() => {
      const rubricString = createRubricString(criteria)
      updateExpectedRef.current(ioId, rubricString)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [criteria, ioId])

  const addCriteria = () => {
    const newId = String(criteria.length + 1)
    setCriteria((prev) => [
      ...prev,
      {
        id: newId,
        name: "",
        maxPoints: 5,
        achievedPoints: null,
      },
    ])
  }

  const updateCriteria = (id: string, updates: Partial<RubricCriteria>) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  const removeCriteria = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id))
  }

  const simulateRubricResults = () => {
    setCriteria((prev) => generateFakeScores(prev))
  }

  return {
    criteria,
    setCriteria,
    totalMaxPoints,
    totalAchievedPoints,
    hasRubricResults,
    addCriteria,
    updateCriteria,
    removeCriteria,
    simulateRubricResults,
    createRubricString: () => createRubricString(criteria),
  }
}
