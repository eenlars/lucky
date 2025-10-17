import { Population } from "@core/improvement/gp/Population"
import { describe, expect, it } from "vitest"

describe("Population.size sanity", () => {
  it("returns 0 initially", () => {
    const mockRunService = {
      getCurrentGenerationId: () => 0,
      getRunId: () => "r",
      getEvolutionContext: () => ({ runId: "r", generationId: "g", generationNumber: 0 }),
    } as any
    const p = new Population({ populationSize: 1, generations: 1 } as any, mockRunService)
    expect(typeof (p as any).size).toBe("function")
    expect(p.size()).toBe(0)
    expect(p.getGenomes()).toEqual([])
  })
})
