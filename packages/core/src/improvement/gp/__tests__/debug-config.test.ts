// debug test to see actual config values
import { describe, expect, it } from "vitest"
import { createEvolutionSettingsWithConfig } from "@improvement/gp/resources/evolutionSettings"

describe("Debug Config", () => {
  it("should show actual config values", () => {
    const config = createEvolutionSettingsWithConfig()
    console.log("Actual config:", JSON.stringify(config, null, 2))

    // basic validation that it creates something
    expect(config).toBeDefined()
    expect(typeof config.populationSize).toBe("number")
  })
})
