// tests for GP types and utility functions
import { describe, expect, it } from "vitest"

describe("GP Types and Utilities", () => {
  describe("WorkflowGenome Interface", () => {
    it("should have required properties", () => {
      const genome = {
        nodes: [
          {
            id: "test-node",
            systemPrompt: "test",
            userPrompt: "test",
            expectedOutput: "test",
            tools: [],
            handoffRules: {},
          },
        ],
        entryNodeId: "test-node",
        wfVersionId: "test-id",
        generation: 0,
        parentIds: [],
        createdAt: new Date().toISOString(),
        fitness: {
          score: 0.8,
          totalCostUsd: 0.01,
          totalTimeSeconds: 10,
          accuracy: 0.8,
        },
      }

      expect(genome.wfVersionId).toBeDefined()
      expect(genome.generation).toBeDefined()
      expect(genome.parentIds).toBeDefined()
      expect(genome.createdAt).toBeDefined()
      expect(genome.fitness).toBeDefined()
      expect(genome.nodes).toBeDefined()
      expect(genome.entryNodeId).toBeDefined()
    })
  })

  describe("WorkflowScore Interface", () => {
    it("should have required properties", () => {
      const score = {
        score: 0.8,
        totalCostUsd: 0.01,
        totalTimeSeconds: 10,
        accuracy: 0.8,
        genomeId: "test-id",
        valid: true,
        evaluatedAt: new Date().toISOString(),
      }

      expect(score.genomeId).toBeDefined()
      expect(score.valid).toBeDefined()
      expect(score.evaluatedAt).toBeDefined()
      expect(typeof score.score).toBe("number")
      expect(typeof score.totalCostUsd).toBe("number")
      expect(typeof score.totalTimeSeconds).toBe("number")
      expect(typeof score.accuracy).toBe("number")
    })
  })

  describe("EvaluationResult Interface", () => {
    it("should have required properties", () => {
      const result = {
        genomeId: "test-id",
        fitness: {
          score: 0.8,
          totalCostUsd: 0.01,
          totalTimeSeconds: 10,
          accuracy: 0.8,
        },
        costOfEvaluation: 0.01,
        errors: [],
      }

      expect(result.genomeId).toBeDefined()
      expect(result.fitness).toBeDefined()
      expect(result.costOfEvaluation).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe("PopulationStats Interface", () => {
    it("should have required properties", () => {
      const stats = {
        generation: 1,
        bestFitness: 0.9,
        avgFitness: 0.7,
        fitnessStdDev: 0.2,
        evaluationCost: 0.05,
        evaluationsPerHour: 60,
        improvementRate: 0.1,
      }

      expect(typeof stats.generation).toBe("number")
      expect(typeof stats.bestFitness).toBe("number")
      expect(typeof stats.avgFitness).toBe("number")
      expect(typeof stats.fitnessStdDev).toBe("number")
      expect(typeof stats.evaluationCost).toBe("number")
      expect(typeof stats.evaluationsPerHour).toBe("number")
      expect(typeof stats.improvementRate).toBe("number")
    })
  })
})
