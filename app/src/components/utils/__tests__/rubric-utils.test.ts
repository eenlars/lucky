import { describe, it, expect } from "vitest"
import { parseRubricString, createRubricString } from "../rubric-utils"
import type { RubricCriteria } from "../../types/evaluation"

describe("rubric-utils", () => {
  describe("createRubricString and parseRubricString", () => {
    it("should create and parse rubric strings correctly", () => {
      const originalCriteria: RubricCriteria[] = [
        { id: "1", name: "Accuracy", maxPoints: 10, achievedPoints: null },
        { id: "2", name: "Completeness", maxPoints: 15, achievedPoints: null },
        { id: "3", name: "Clarity", maxPoints: 5, achievedPoints: null },
      ]

      // Create rubric string
      const rubricString = createRubricString(originalCriteria)
      
      // Verify string format
      expect(rubricString).toContain("Evaluation Rubric (Total: 30 points):")
      expect(rubricString).toContain("1. Accuracy (10 points)")
      expect(rubricString).toContain("2. Completeness (15 points)")
      expect(rubricString).toContain("3. Clarity (5 points)")

      // Parse it back
      const parsed = parseRubricString(rubricString)
      
      // Verify parsed data
      expect(parsed).toHaveLength(3)
      expect(parsed[0]).toMatchObject({ name: "Accuracy", maxPoints: 10 })
      expect(parsed[1]).toMatchObject({ name: "Completeness", maxPoints: 15 })
      expect(parsed[2]).toMatchObject({ name: "Clarity", maxPoints: 5 })
    })

    it("should handle empty rubric", () => {
      const emptyString = createRubricString([])
      expect(emptyString).toBe("")
      
      const parsed = parseRubricString("")
      expect(parsed).toEqual([])
    })

    it("should handle invalid rubric strings", () => {
      expect(parseRubricString("random text")).toEqual([])
      expect(parseRubricString("1. Missing points format")).toEqual([])
    })

    it("should handle criteria with empty names", () => {
      const criteria: RubricCriteria[] = [
        { id: "1", name: "", maxPoints: 10, achievedPoints: null },
      ]
      
      const rubricString = createRubricString(criteria)
      expect(rubricString).toContain("1. Criterion 1 (10 points)")
    })
  })
})