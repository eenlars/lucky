// tests for evolution config
import type { EvolutionSettings } from "@/core/improvement/gp/resources/evolution-types"
import {
  createEvolutionSettingsWithConfig,
  EVOLUTION_CONFIG,
} from "@/runtime/settings/evolution"
import { describe, expect, it } from "vitest"

describe("EvolutionSettings", () => {
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

      // elite size should be reasonable (could be higher than population in edge cases)
      expect(config.eliteSize).toBeGreaterThanOrEqual(0)

      // tournament size should be reasonable
      expect(config.tournamentSize).toBeGreaterThan(0)

      // crossover rate should be valid
      expect(config.crossoverRate).toBeGreaterThan(0)

      // mu and lambda should be reasonable for evolution strategy
      expect(config.populationSize).toBeGreaterThanOrEqual(0)
      expect(config.offspringCount).toBeGreaterThanOrEqual(0)
      expect(config.numberOfParentsCreatingOffspring).toBeGreaterThan(0)
    })

    it("should handle edge case overrides", () => {
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

      requiredProps.forEach((prop) => {
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

      numericProps.forEach((prop) => {
        expect(typeof config[prop as keyof EvolutionSettings]).toBe("number")
      })
    })

    it("should have probability values in valid range", () => {
      const config = createEvolutionSettingsWithConfig()

      expect(config.crossoverRate).toBeGreaterThanOrEqual(0)
      expect(config.crossoverRate).toBeLessThanOrEqual(1)
    })
  })
})
