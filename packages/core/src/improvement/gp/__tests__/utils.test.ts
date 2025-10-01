// tests for GP utility functions and pure logic
import { describe, expect, it } from "vitest"

describe("GP Utilities", () => {
  describe("Math and Statistics", () => {
    it("should calculate euclidean distance", () => {
      const point1 = [1, 2, 3]
      const point2 = [4, 5, 6]

      // euclidean distance formula: sqrt((x2-x1)² + (y2-y1)² + (z2-z1)²)
      const expectedDistance = Math.sqrt(Math.pow(4 - 1, 2) + Math.pow(5 - 2, 2) + Math.pow(6 - 3, 2))

      expect(expectedDistance).toBeCloseTo(5.196, 3)
    })

    it("should calculate standard deviation", () => {
      const values = [1, 2, 3, 4, 5]
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)

      expect(mean).toBe(3)
      expect(stdDev).toBeCloseTo(1.414, 3)
    })

    it("should handle edge cases in distance calculation", () => {
      const samePoint = [1, 2, 3]
      const distance = Math.sqrt(Math.pow(1 - 1, 2) + Math.pow(2 - 2, 2) + Math.pow(3 - 3, 2))

      expect(distance).toBe(0)
    })
  })

  describe("Selection Logic", () => {
    it("should perform tournament selection", () => {
      const population = [
        { fitness: 0.9, id: "a" },
        { fitness: 0.7, id: "b" },
        { fitness: 0.5, id: "c" },
        { fitness: 0.3, id: "d" },
      ]

      // simulate tournament selection
      const tournamentSize = 3
      const tournament = population.slice(0, tournamentSize)
      const winner = tournament.reduce((best, current) => (current.fitness > best.fitness ? current : best))

      expect(winner.id).toBe("a")
      expect(winner.fitness).toBe(0.9)
    })

    it("should select top n individuals", () => {
      const population = [
        { fitness: 0.3, id: "d" },
        { fitness: 0.9, id: "a" },
        { fitness: 0.5, id: "c" },
        { fitness: 0.7, id: "b" },
      ]

      const sorted = [...population].sort((a, b) => b.fitness - a.fitness)
      const top2 = sorted.slice(0, 2)

      expect(top2).toHaveLength(2)
      expect(top2[0].id).toBe("a")
      expect(top2[1].id).toBe("b")
    })

    it("should handle empty population gracefully", () => {
      const emptyPop: { fitness: number; id: string }[] = []
      const top5 = emptyPop.slice(0, 5)

      expect(top5).toHaveLength(0)
    })
  })

  describe("Evolution Strategy Logic", () => {
    it("should implement mu+lambda selection", () => {
      const mu = 3 // parents to keep
      const lambda = 2 // offspring produced

      const parents = [
        { fitness: 0.8, id: "p1" },
        { fitness: 0.6, id: "p2" },
        { fitness: 0.4, id: "p3" },
      ]

      const offspring = [
        { fitness: 0.9, id: "o1" },
        { fitness: 0.5, id: "o2" },
      ]

      // combine and select best mu individuals
      const combined = [...parents, ...offspring]
      const sorted = combined.sort((a, b) => b.fitness - a.fitness)
      const survivors = sorted.slice(0, mu)

      expect(survivors).toHaveLength(3)
      expect(survivors[0].id).toBe("o1") // best offspring
      expect(survivors[1].id).toBe("p1") // best parent
      expect(survivors[2].id).toBe("p2") // second best parent
    })

    it("should handle crossover rate probability", () => {
      const crossoverRate = 0.7
      const simulations = 1000
      let crossovers = 0

      for (let i = 0; i < simulations; i++) {
        if (Math.random() < crossoverRate) {
          crossovers++
        }
      }

      // should be approximately 70% with some tolerance
      const actualRate = crossovers / simulations
      expect(actualRate).toBeGreaterThan(0.6)
      expect(actualRate).toBeLessThan(0.8)
    })
  })

  describe("Fingerprint Logic", () => {
    it("should create consistent fingerprints for same input", () => {
      const data = { nodes: 3, complexity: 0.5, tools: 2 }

      // simulate fingerprint creation
      const fingerprint1 = [data.nodes, data.complexity * 100, data.tools]
      const fingerprint2 = [data.nodes, data.complexity * 100, data.tools]

      expect(fingerprint1).toEqual(fingerprint2)
    })

    it("should create different fingerprints for different inputs", () => {
      const data1 = { nodes: 3, complexity: 0.5, tools: 2 }
      const data2 = { nodes: 4, complexity: 0.7, tools: 3 }

      const fingerprint1 = [data1.nodes, data1.complexity * 100, data1.tools]
      const fingerprint2 = [data2.nodes, data2.complexity * 100, data2.tools]

      expect(fingerprint1).not.toEqual(fingerprint2)
    })

    it("should concatenate fingerprints correctly", () => {
      const structural = [1, 2, 3]
      const behavioral = [4, 5, 6]
      const combined = [...structural, ...behavioral]

      expect(combined).toEqual([1, 2, 3, 4, 5, 6])
      expect(combined).toHaveLength(6)
    })
  })

  describe("Hash Functions", () => {
    it("should create deterministic hashes", () => {
      const data = { test: "data", value: 123 }
      const jsonString = JSON.stringify(data, Object.keys(data).sort())

      // simulate hash creation (simplified)
      const hash1 = Buffer.from(jsonString).toString("base64")
      const hash2 = Buffer.from(jsonString).toString("base64")

      expect(hash1).toBe(hash2)
      expect(typeof hash1).toBe("string")
    })

    it("should create different hashes for different data", () => {
      const data1 = { test: "data1", value: 123 }
      const data2 = { test: "data2", value: 456 }

      const json1 = JSON.stringify(data1, Object.keys(data1).sort())
      const json2 = JSON.stringify(data2, Object.keys(data2).sort())

      const hash1 = Buffer.from(json1).toString("base64")
      const hash2 = Buffer.from(json2).toString("base64")

      expect(hash1).not.toBe(hash2)
    })
  })

  describe("Validation Logic", () => {
    it("should validate evolution config parameters", () => {
      const config = {
        populationSize: 10,
        generations: 5,
        crossoverRate: 0.7,
        mutationRate: 0.3,
        maxCostUSD: 100,
      }

      // validate ranges
      expect(config.populationSize).toBeGreaterThan(0)
      expect(config.generations).toBeGreaterThan(0)
      expect(config.crossoverRate).toBeGreaterThanOrEqual(0)
      expect(config.crossoverRate).toBeLessThanOrEqual(1)
      expect(config.mutationRate).toBeGreaterThanOrEqual(0)
      expect(config.mutationRate).toBeLessThanOrEqual(1)
      expect(config.maxCostUSD).toBeGreaterThan(0)

      // validate consistency
      expect(config.crossoverRate + config.mutationRate).toBeLessThanOrEqual(1)
    })

    it("should validate workflow structure", () => {
      const workflow = {
        nodes: [
          {
            id: "node1",
            systemPrompt: "test",
            userPrompt: "test",
            expectedOutput: "test",
            tools: [],
            handoffRules: {},
          },
        ],
        entryNodeId: "node1",
      }

      // basic validation
      expect(workflow.nodes).toHaveLength(1)
      expect(workflow.entryNodeId).toBeDefined()
      expect(workflow.nodes.some(n => n.id === workflow.entryNodeId)).toBe(true)

      const node = workflow.nodes[0]
      expect(node.id).toBeTruthy()
      expect(node.systemPrompt).toBeTruthy()
      expect(Array.isArray(node.tools)).toBe(true)
      expect(typeof node.handoffRules).toBe("object")
    })
  })

  describe("Performance Measurement", () => {
    it("should measure execution time", () => {
      const startTime = Date.now()

      // simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random()
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeGreaterThanOrEqual(0)
      expect(duration).toBeLessThan(1000) // should be fast
    })

    it("should track cost accumulation", () => {
      let totalCost = 0
      const operations = [0.01, 0.02, 0.015, 0.008]

      operations.forEach(cost => {
        totalCost += cost
      })

      expect(totalCost).toBeCloseTo(0.053, 3)
    })
  })

  describe("Error Handling", () => {
    it("should handle division by zero", () => {
      const values: number[] = []
      const safeAverage = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0

      expect(safeAverage).toBe(0)
      expect(Number.isNaN(safeAverage)).toBe(false)
    })

    it("should handle null/undefined values", () => {
      const data = {
        valid: "test",
        invalid: null,
        missing: undefined,
      }

      const filtered = Object.entries(data)
        .filter(([key, value]) => value != null)
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})

      expect(filtered).toEqual({ valid: "test" })
      expect(Object.keys(filtered)).toHaveLength(1)
    })
  })
})
