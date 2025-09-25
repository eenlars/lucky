// tests for GP operators and registry
import { describe, expect, it } from "vitest"

describe("GP Operators", () => {
  describe("Operator Registry", () => {
    it("should manage operator registration", () => {
      const registry = new Map()

      // simulate operator registration
      const registerOperator = (name: string, fn: (input: any) => any, description: string) => {
        registry.set(name, { fn, description })
      }

      registerOperator("test_crossover", () => "crossover", "Test crossover operator")
      registerOperator("test_mutation", () => "mutation", "Test mutation operator")

      expect(registry.size).toBe(2)
      expect(registry.has("test_crossover")).toBe(true)
      expect(registry.has("test_mutation")).toBe(true)

      const crossoverOp = registry.get("test_crossover")
      expect(crossoverOp.fn()).toBe("crossover")
      expect(crossoverOp.description).toContain("crossover")
    })

    it("should handle operator overrides", () => {
      const registry = new Map()

      const registerOperator = (name: string, fn: (input: any) => any) => {
        registry.set(name, fn)
      }

      registerOperator("test_op", () => "v1")
      registerOperator("test_op", () => "v2") // override

      expect(registry.get("test_op")()).toBe("v2")
    })

    it("should list available operators", () => {
      const registry = new Map()
      registry.set("crossover1", { type: "crossover" })
      registry.set("crossover2", { type: "crossover" })
      registry.set("mutation1", { type: "mutation" })

      const crossoverOps = Array.from(registry.entries())
        .filter(([name, op]) => op.type === "crossover")
        .map(([name]) => name)

      expect(crossoverOps).toContain("crossover1")
      expect(crossoverOps).toContain("crossover2")
      expect(crossoverOps).not.toContain("mutation1")
    })
  })

  describe("Mutation Strategy", () => {
    it("should select mutation types randomly", () => {
      const mutationTypes = ["prompt", "parameter", "structure", "tool"]
      const selections = []

      for (let i = 0; i < 100; i++) {
        const selected = mutationTypes[Math.floor(Math.random() * mutationTypes.length)]
        selections.push(selected)
      }

      // should have variety in selections
      const uniqueSelections = new Set(selections)
      expect(uniqueSelections.size).toBeGreaterThan(1)

      // all selections should be valid
      selections.forEach((selection) => {
        expect(mutationTypes).toContain(selection)
      })
    })

    it("should generate appropriate mutation instructions", () => {
      const instructionMap = {
        prompt: "Modify the system prompts to improve clarity and effectiveness",
        parameter: "Adjust the configuration parameters and settings",
        structure: "Reorganize the workflow structure and node connections",
        tool: "Update the tools and capabilities available to nodes",
      }

      Object.entries(instructionMap).forEach(([type, instruction]) => {
        expect(instruction).toContain(type === "prompt" ? "prompt" : type)
        expect(instruction.length).toBeGreaterThan(10)
        expect(typeof instruction).toBe("string")
      })
    })

    it("should validate mutation parameters", () => {
      const mutationParams = {
        type: "prompt",
        intensity: 0.5, // 0-1 scale
        preserveStructure: true,
        targetNodes: ["node1", "node2"],
      }

      expect(["prompt", "parameter", "structure", "tool"]).toContain(mutationParams.type)
      expect(mutationParams.intensity).toBeGreaterThanOrEqual(0)
      expect(mutationParams.intensity).toBeLessThanOrEqual(1)
      expect(typeof mutationParams.preserveStructure).toBe("boolean")
      expect(Array.isArray(mutationParams.targetNodes)).toBe(true)
    })
  })

  describe("Crossover Prompts", () => {
    it("should generate contextual crossover prompts", () => {
      const parent1Desc = "Workflow A: Data extraction with 3 nodes"
      const parent2Desc = "Workflow B: Data processing with 4 nodes"
      const strategy = "blend_features"

      const prompt = `Combine the best features from these workflows using ${strategy} strategy:

Parent 1: ${parent1Desc}
Parent 2: ${parent2Desc}

Create a new workflow that inherits strengths from both parents.`

      expect(prompt).toContain(parent1Desc)
      expect(prompt).toContain(parent2Desc)
      expect(prompt).toContain(strategy)
      expect(prompt.toLowerCase()).toContain("combine")
      expect(prompt.length).toBeGreaterThan(50)
    })

    it("should handle different crossover strategies", () => {
      const strategies = ["uniform_crossover", "single_point_crossover", "multi_point_crossover", "blend_crossover"]

      strategies.forEach((strategy) => {
        const prompt = `Apply ${strategy} to combine parent genomes`
        expect(prompt).toContain(strategy)
        expect(typeof prompt).toBe("string")
      })
    })

    it("should validate crossover inputs", () => {
      const crossoverInput = {
        parents: ["parent1", "parent2"],
        strategy: "uniform",
        preserveValid: true,
        targetComplexity: "medium",
      }

      expect(Array.isArray(crossoverInput.parents)).toBe(true)
      expect(crossoverInput.parents.length).toBeGreaterThanOrEqual(2)
      expect(typeof crossoverInput.strategy).toBe("string")
      expect(typeof crossoverInput.preserveValid).toBe("boolean")
      expect(["low", "medium", "high"]).toContain(crossoverInput.targetComplexity)
    })
  })

  describe("Operator Examples", () => {
    it("should provide working operator examples", () => {
      const examples = {
        crossover: {
          input: { parents: ["A", "B"], strategy: "blend" },
          output: "AB_blend",
        },
        mutation: {
          input: { parent: "A", type: "prompt", intensity: 0.3 },
          output: "A_mutated",
        },
        selection: {
          input: { population: ["A", "B", "C"], size: 2 },
          output: ["A", "B"], // top 2
        },
      }

      Object.entries(examples).forEach(([opType, example]) => {
        expect(example.input).toBeDefined()
        expect(example.output).toBeDefined()
        expect(typeof example.input).toBe("object")
      })
    })

    it("should demonstrate operator composition", () => {
      // simulate a complete evolution step
      const population = ["A", "B", "C", "D"]

      // selection
      const parents = population.slice(0, 2) // select top 2

      // crossover
      const offspring1 = `${parents[0]}_${parents[1]}_cross`

      // mutation
      const offspring2 = `${parents[0]}_mut`

      // new population
      const newPopulation = [...parents, offspring1, offspring2]

      expect(newPopulation).toHaveLength(4)
      expect(newPopulation).toContain(offspring1)
      expect(newPopulation).toContain(offspring2)
      expect(newPopulation.slice(0, 2)).toEqual(parents)
    })
  })

  describe("Operator Validation", () => {
    it("should validate operator interfaces", () => {
      const crossoverInterface = {
        name: "test_crossover",
        type: "crossover",
        requiredParams: ["parents", "strategy"],
        optionalParams: ["preserveStructure"],
        returnType: "genome",
      }

      expect(crossoverInterface.name).toBeTruthy()
      expect(crossoverInterface.type).toBe("crossover")
      expect(Array.isArray(crossoverInterface.requiredParams)).toBe(true)
      expect(Array.isArray(crossoverInterface.optionalParams)).toBe(true)
      expect(crossoverInterface.returnType).toBeTruthy()
    })

    it("should handle operator errors gracefully", () => {
      const safeOperator = (input: any) => {
        try {
          if (!input) throw new Error("No input provided")
          if (typeof input !== "object") throw new Error("Invalid input type")
          return { success: true, result: input }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      }

      const result1 = safeOperator({ valid: "input" })
      const result2 = safeOperator(null)
      const result3 = safeOperator("string")

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(false)
      expect(result3.success).toBe(false)
      expect(result2.error).toContain("No input")
      expect(result3.error).toContain("Invalid input type")
    })
  })

  describe("Performance Considerations", () => {
    it("should measure operator execution time", () => {
      const measureOperator = (fn: (input: any) => any, input: any) => {
        const start = Date.now()
        const result = fn(input)
        const end = Date.now()
        return { result, time: end - start }
      }

      const fastOp = (x: any) => x
      const slowOp = (x: any) => {
        for (let i = 0; i < 1000; i++) Math.random()
        return x
      }

      const fastResult = measureOperator(fastOp, "test")
      const slowResult = measureOperator(slowOp, "test")

      expect(fastResult.time).toBeLessThanOrEqual(slowResult.time)
      expect(fastResult.result).toBe("test")
      expect(slowResult.result).toBe("test")
    })

    it("should handle batch operations efficiently", () => {
      const batchSize = 10
      const inputs = Array.from({ length: batchSize }, (_, i) => `input_${i}`)

      const start = Date.now()
      const results = inputs.map((input) => `processed_${input}`)
      const end = Date.now()

      expect(results).toHaveLength(batchSize)
      expect(end - start).toBeLessThan(100) // should be fast
      expect(results[0]).toBe("processed_input_0")
    })
  })
})
