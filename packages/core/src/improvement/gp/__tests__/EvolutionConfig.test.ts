import { createEvolutionSettingsWithConfig } from "@core/core-config/coreConfig"
// tests for evolution config
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import { describe, expect, it } from "vitest"

describe("EvolutionSettings", () => {
  // TODO: missing test coverage for:
  // - mutation rate validation (mentioned in line 149 but no actual test)
  // - invalid configuration combinations (e.g., elite size > population)
  // - error handling for bad configs
  // - relationship validation between config parameters
  describe("createEvolutionSettingsWithConfig", () => {
    it("should create default config with valid values", () => {
      const config = createEvolutionSettingsWithConfig()

      expect(config.populationSize).toBeGreaterThan(0)
      expect(config.generations).toBeGreaterThan(0)
      expect(config.maxCostUSD).toBeGreaterThan(0)
      expect(config.eliteSize).toBeGreaterThanOrEqual(0)
      expect(config.tournamentSize).toBeGreaterThan(0)
      expect(config.crossoverRate).toBeGreaterThanOrEqual(0)
      expect(config.crossoverRate).toBeLessThanOrEqual(1)
      expect(config.maxEvaluationsPerHour).toBeGreaterThan(0)
      expect(config.offspringCount).toBeGreaterThanOrEqual(0)
      expect(config.numberOfParentsCreatingOffspring).toBeGreaterThan(0)
      expect(config.mutationParams).toBeDefined()
      expect(typeof config.mutationParams.mutationInstructions).toBe("string")
    })

    it("should apply overrides correctly", () => {
      const overrides: Partial<EvolutionSettings> = {
        populationSize: 20,
        generations: 10,
        maxCostUSD: 5.0,
        crossoverRate: 0.6,
        eliteSize: 1,
      }

      const config = createEvolutionSettingsWithConfig(overrides)

      expect(config.populationSize).toBe(20)
      expect(config.generations).toBe(10)
      expect(config.maxCostUSD).toBe(5.0)
      expect(config.crossoverRate).toBe(0.6)
      expect(config.eliteSize).toBe(1)

      // other values should still be defaults
      expect(config.tournamentSize).toBeGreaterThan(0)
    })

    it("should handle partial overrides", () => {
      const overrides: Partial<EvolutionSettings> = {
        populationSize: 15,
      }

      const config = createEvolutionSettingsWithConfig(overrides)

      expect(config.populationSize).toBe(15)
      expect(config.generations).toBeGreaterThan(0) // should have default
      expect(config.maxCostUSD).toBeGreaterThan(0) // should have default
    })

    it("should maintain consistency between related parameters", () => {
      const config = createEvolutionSettingsWithConfig()

      // TODO: test only checks elite size >= 0 but comment suggests it could be > population
      // should validate relationship between elite size and population size
      // elite size should be reasonable (could be higher than population in edge cases)
      expect(config.eliteSize).toBeGreaterThanOrEqual(0)

      // tournament size should be reasonable
      expect(config.tournamentSize).toBeGreaterThan(0)

      // crossover rate should be valid
      // TODO: contradictory test - checking > 0 here but line 81 tests = 0
      // clarify validation logic for crossover rate
      expect(config.crossoverRate).toBeGreaterThan(0)

      // mu and lambda should be reasonable for evolution strategy
      // TODO: testing >= 0 is too permissive for population/offspring
      // these should likely be > 0 for meaningful evolution
      expect(config.populationSize).toBeGreaterThanOrEqual(0)
      expect(config.offspringCount).toBeGreaterThanOrEqual(0)
      expect(config.numberOfParentsCreatingOffspring).toBeGreaterThan(0)
    })

    it("should handle edge case overrides", () => {
      // TODO: test doesn't validate edge cases are actually valid
      // - crossoverRate=0 means no crossover, is this intended?
      // - populationSize=4 with eliteSize=1 leaves little room for diversity
      // - no validation that config creates viable evolution strategy
      const edgeOverrides: Partial<EvolutionSettings> = {
        populationSize: 4,
        generations: 1,
        maxCostUSD: 0.01,
        crossoverRate: 0,
        tournamentSize: 2,
        eliteSize: 1,
        numberOfParentsCreatingOffspring: 2,
      }

      const config = createEvolutionSettingsWithConfig(edgeOverrides)

      expect(config.populationSize).toBe(4)
      expect(config.generations).toBe(1)
      expect(config.maxCostUSD).toBe(0.01)
      expect(config.crossoverRate).toBe(0)
    })
  })

  describe("EvolutionSettings validation", () => {
    it("should have all required properties", () => {
      const config = createEvolutionSettingsWithConfig()

      const requiredProps = [
        "mode",
        "populationSize",
        "generations",
        "maxCostUSD",
        "eliteSize",
        "tournamentSize",
        "crossoverRate",
        "mutationRate",
        "maxEvaluationsPerHour",
        "evaluationDataset",
        "baselineComparison",
        "offspringCount",
        "numberOfParentsCreatingOffspring",
        "mutationParams",
      ]

      requiredProps.forEach(prop => {
        expect(config).toHaveProperty(prop)
        expect(config[prop as keyof EvolutionSettings]).toBeDefined()
      })
    })

    it("should have numeric properties as numbers", () => {
      const config = createEvolutionSettingsWithConfig()

      const numericProps = [
        "populationSize",
        "generations",
        "maxCostUSD",
        "eliteSize",
        "tournamentSize",
        "crossoverRate",
        "mutationRate",
        "maxEvaluationsPerHour",
        "offspringCount",
        "numberOfParentsCreatingOffspring",
      ]

      numericProps.forEach(prop => {
        expect(typeof config[prop as keyof EvolutionSettings]).toBe("number")
      })
    })

    it("should have probability values in valid range", () => {
      const config = createEvolutionSettingsWithConfig()

      expect(config.crossoverRate).toBeGreaterThanOrEqual(0)
      expect(config.crossoverRate).toBeLessThanOrEqual(1)
      // TODO: missing test for mutationRate validation despite being mentioned in test name
      // add: expect(config.mutationRate).toBeGreaterThanOrEqual(0)
      // add: expect(config.mutationRate).toBeLessThanOrEqual(1)
    })
  })
})
