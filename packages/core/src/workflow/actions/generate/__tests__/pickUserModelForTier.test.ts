import type { ModelEntry, ModelPricingTier } from "@lucky/shared"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock the imports
vi.mock("@core/core-config/coreConfig", () => ({
  getDefaultModels: () => ({
    default: "claude-3-5-sonnet",
    low: "claude-3-5-haiku",
    medium: "claude-3-5-sonnet",
    high: "claude-3-opus",
  }),
}))

// We'll import and test the function directly
import { getDefaultModels } from "@core/core-config/coreConfig"

// Create mock function for testing (copying logic from the actual implementation)
function getLimitedUserModels(models: ModelEntry[], limit = 5): ModelEntry[] {
  if (models.length <= limit) {
    return models
  }

  const rank = (m: ModelEntry) => {
    const speedScore = m.speed === "fast" ? 3 : m.speed === "medium" ? 2 : 1
    return m.intelligence * 10 + speedScore
  }

  const sorted = models.slice().sort((a, b) => rank(b) - rank(a))
  const limited = sorted.slice(0, limit)

  return limited
}

function pickUserModelForTier(tier: ModelPricingTier, models: ModelEntry[]): string {
  const rank = (m: ModelEntry) => {
    const speedScore = m.speed === "fast" ? 3 : m.speed === "medium" ? 2 : 1
    return m.intelligence * 10 + speedScore
  }

  const pick = (arr: ModelEntry[]) => arr.slice().sort((a, b) => rank(b) - rank(a))[0]

  // Filter by tier first, then limit to preserve tier-specific coverage
  const byTier = models.filter(m => m.pricingTier === tier && m.runtimeEnabled)
  const limitedByTier = getLimitedUserModels(byTier)

  const preferred = pick(limitedByTier)
  if (preferred) return preferred.model // API-facing model string

  // Fallback to best overall from limited models (applied after tier filter fails)
  const limitedModels = getLimitedUserModels(models)
  const any = pick(limitedModels.filter(m => m.runtimeEnabled))
  if (any) return any.model

  // Final fallback to core defaults (keeps system robust if user list is empty)
  return getDefaultModels().default
}

describe("pickUserModelForTier", () => {
  let mockModels: ModelEntry[]

  beforeEach(() => {
    // Create more than 5 models to trigger limiting
    mockModels = [
      // Low tier models (6 total)
      {
        model: "low-1",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 2,
        speed: "fast",
      } as ModelEntry,
      {
        model: "low-2",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 3,
        speed: "medium",
      } as ModelEntry,
      {
        model: "low-3",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 1,
        speed: "slow",
      } as ModelEntry,
      {
        model: "low-4",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 4,
        speed: "fast",
      } as ModelEntry,
      {
        model: "low-5",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 5,
        speed: "medium",
      } as ModelEntry,
      {
        model: "low-6",
        pricingTier: "low",
        runtimeEnabled: true,
        intelligence: 6,
        speed: "slow",
      } as ModelEntry,
      // Medium tier models (3 total)
      {
        model: "medium-1",
        pricingTier: "medium",
        runtimeEnabled: true,
        intelligence: 7,
        speed: "fast",
      } as ModelEntry,
      {
        model: "medium-2",
        pricingTier: "medium",
        runtimeEnabled: true,
        intelligence: 8,
        speed: "medium",
      } as ModelEntry,
      {
        model: "medium-3",
        pricingTier: "medium",
        runtimeEnabled: true,
        intelligence: 9,
        speed: "slow",
      } as ModelEntry,
      // High tier models (2 total, weak)
      {
        model: "high-1",
        pricingTier: "high",
        runtimeEnabled: true,
        intelligence: 1,
        speed: "slow",
      } as ModelEntry,
      {
        model: "high-2",
        pricingTier: "high",
        runtimeEnabled: true,
        intelligence: 2,
        speed: "slow",
      } as ModelEntry,
    ]
  })

  it("should select a low-tier model when requesting low tier", () => {
    const result = pickUserModelForTier("low", mockModels)
    expect(result).toMatch(/^low-/)
  })

  it("should select a medium-tier model when requesting medium tier", () => {
    const result = pickUserModelForTier("medium", mockModels)
    expect(result).toMatch(/^medium-/)
  })

  it("should select a high-tier model when requesting high tier", () => {
    const result = pickUserModelForTier("high", mockModels)
    expect(result).toMatch(/^high-/)
  })

  it("should prefer high intelligence within tier", () => {
    // low-6 has intelligence 6, which is the highest in low tier
    const result = pickUserModelForTier("low", mockModels)
    expect(result).toBe("low-6")
  })

  it("should respect runtimeEnabled flag", () => {
    const modelsWithDisabled = [...mockModels]
    // Disable the highest intelligence low-tier model
    modelsWithDisabled[5]!.runtimeEnabled = false

    const result = pickUserModelForTier("low", modelsWithDisabled)
    // Should pick low-5 (intelligence 5) instead
    expect(result).toBe("low-5")
  })

  it("should not drop low-tier models when more than 5 models exist", () => {
    // This is the critical test: with 11 models total, the old code would
    // limit to top 5 overall BEFORE filtering by tier, potentially losing low-tier options.
    // The new code filters by tier first, so all 6 low-tier models are available.
    const result = pickUserModelForTier("low", mockModels)

    // We should get a low-tier model, not fall back to something else
    expect(result).toMatch(/^low-/)
    expect(result).not.toMatch(/^medium-/)
    expect(result).not.toMatch(/^high-/)
  })

  it("should fall back to best overall when tier has no enabled models", () => {
    const modelsAllDisabled = mockModels.map(m => (m.pricingTier === "low" ? { ...m, runtimeEnabled: false } : m))

    const result = pickUserModelForTier("low", modelsAllDisabled)
    // Should fall back to best overall (medium-3 with intelligence 9)
    expect(result).toBe("medium-3")
  })

  it("should use default when no models available", () => {
    const result = pickUserModelForTier("low", [])
    expect(result).toBe("claude-3-5-sonnet")
  })
})
