/**
 * Test that core-config works in browser-like environments
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getCoreConfig, initCoreConfig } from "../index"

describe("Browser Compatibility", () => {
  let originalWindow: any

  beforeEach(() => {
    // Save original window state
    originalWindow = globalThis.window
  })

  afterEach(() => {
    // Restore original window state
    if (originalWindow === undefined) {
      ;(globalThis as any).window = undefined
    } else {
      ;(globalThis as any).window = originalWindow
    }
  })

  it("should work in browser environment (with window defined)", () => {
    // Simulate browser environment
    ;(globalThis as any).window = {}

    // This should not throw
    expect(() => getCoreConfig()).not.toThrow()

    const config = getCoreConfig()
    expect(config).toBeDefined()
    expect(config.paths).toBeDefined()
    expect(config.paths.runtime).toBeDefined()
  })

  it("should work in Node.js environment (without window)", () => {
    // Ensure we're in Node.js environment
    ;(globalThis as any).window = undefined

    // This should not throw
    expect(() => getCoreConfig()).not.toThrow()

    const config = getCoreConfig()
    expect(config).toBeDefined()
    expect(config.paths).toBeDefined()
    expect(config.paths.runtime).toBeDefined()
  })

  it("should allow initialization with custom config", () => {
    initCoreConfig({
      logging: {
        level: "debug",
        override: {
          API: true,
          GP: true,
          Database: true,
          Tools: true,
          Summary: true,
          InvocationPipeline: true,
          Messaging: true,
          Improvement: true,
          ValidationBeforeHandoff: true,
          Setup: true,
        },
      },
    })

    const config = getCoreConfig()
    expect(config.logging.level).toBe("debug")
    expect(config.logging.override.API).toBe(true)
  })
})
