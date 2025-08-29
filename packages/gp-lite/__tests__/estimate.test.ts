import { describe, it, expect } from "vitest"
import { estimateRun, estimateFromMetrics } from "../src/index"

describe("estimateRun", () => {
  it("computes eval counts from defaults", () => {
    const est = estimateRun({ popSize: 100, generations: 10 })
    // elite default = 2% of popSize => 2
    expect(est.evaluations.init).toBe(100)
    expect(est.evaluations.perGen).toBe(98)
    expect(est.evaluations.plannedTotal).toBe(100 + 10 * 98)
    expect(est.operations.immigrantsPerGen).toBe(2) // 2% immigration
    expect(est.operations.childrenFromBreedingPerGen).toBe(96) // 100 - 2 elite - 2 immigrants
    expect(est.operations.pairsPerGen).toBe(48)
    expect(est.operations.selectionsPerGen).toBe(96)
  })

  it("applies unit time and money", () => {
    const est = estimateRun(
      { popSize: 50, generations: 4 },
      { units: { perEvaluationMs: 2, perEvaluationCost: 0.01, perRunOverheadMs: 10, perGenerationOverheadMs: 1 } }
    )
    // elite = 1 (max(1, floor(0.02*50)=1))
    // init=50, perGen=49, totals: planned=50+4*49=246
    expect(est.evaluations.plannedTotal).toBe(246)
    expect(est.monetary?.plannedTotal).toBeCloseTo(2.46)
    // time: init=50*2 + 10 = 110; perGen=49*2 + 1 = 99; total=110 + 4*99 = 506
    expect(est.timeMs?.plannedTotal).toBe(506)
  })
})

describe("estimateFromMetrics", () => {
  it("derives cost from metrics", () => {
    const metrics = {
      evaluations: 123,
      invalidEvaluations: 0,
      repaired: 0,
      repairFailures: 0,
      fitnessErrors: 0,
      nonFiniteFitness: 0,
      mutations: 0,
      crossovers: 0,
      selections: 0,
      immigrants: 0,
      elitesPerGen: 1,
      config: {
        popSize: 10,
        generations: 10,
        cxProb: 0.8,
        mutProb: 0.1,
        immigration: 0.02,
        tournament: 3,
        stall: 50,
        targetFitness: Infinity,
        timeLimitMs: Infinity,
        maxWallMs: Infinity,
        maxEvaluations: Infinity,
      },
    } as const
    const res = estimateFromMetrics(metrics, { perEvaluationMs: 5, perEvaluationCost: 0.02 })
    expect(res.evaluations).toBe(123)
    expect(res.timeMs).toBe(615)
    expect(res.monetary?.total).toBeCloseTo(2.46)
  })
})

