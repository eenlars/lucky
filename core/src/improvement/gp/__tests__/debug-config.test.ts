// debug test to see actual config values
import { createEvolutionSettingsWithConfig } from "@runtime/settings/evolution"
import { describe, expect, it } from "vitest"

describe("Debug Config", () => {
  it("should show actual config values", () => {
    const config = createEvolutionSettingsWithConfig()
    console.log("Actual config:", JSON.stringify(config, null, 2))

    // basic validation that it creates something
    expect(config).toBeDefined()
    expect(typeof config.populationSize).toBe("number")
  })
})
