import { describe, it, expect } from "vitest"
import { parseCliArguments, ArgumentParsingError } from "../argumentParser"

describe("parseCliArguments", () => {
  // TODO: additional test coverage improvements:
  // 1. no test for combined valid arguments (e.g., --mode=GP --population=10 --generations=5)
  // 2. no test for argument order independence
  // 3. no test for very long argument values or argument count limits
  // 4. no test for help/version flags if supported
  // 5. no test for default values when no arguments provided
  // 6. consider testing system limits (max string length, max arguments)
  it("parses valid iterative mode with generations", () => {
    const result = parseCliArguments(["--mode=iterative", "--generations=5"])
    expect(result).toEqual({ mode: "iterative", generations: 5 })
  })

  it("parses valid GP mode with population", () => {
    const result = parseCliArguments(["--mode=GP", "--population=10"])
    expect(result).toEqual({ mode: "GP", populationSize: 10 })
  })

  it("parses genetic mode", () => {
    const result = parseCliArguments(["--mode=genetic"])
    expect(result.mode).toBe("genetic")
  })

  it("parses boolean variations correctly", () => {
    const testCases = [
      { input: "true", expected: true },
      { input: "false", expected: false },
      { input: "1", expected: true },
      { input: "0", expected: false },
      { input: "yes", expected: true },
      { input: "no", expected: false },
      { input: "TRUE", expected: true },
      { input: "FALSE", expected: false },
    ]

    testCases.forEach(({ input, expected }) => {
      const result = parseCliArguments([`--self-improve-nodes=${input}`])
      expect(result.selfImproveNodes).toBe(expected)
    })
  })

  it("handles improvement types", () => {
    const result1 = parseCliArguments(["--improvement-type=judge"])
    expect(result1.improvementType).toBe("judge")

    const result2 = parseCliArguments(["--improvement-type=unified"])
    expect(result2.improvementType).toBe("unified")
  })

  it("handles file paths with spaces", () => {
    const result = parseCliArguments(["--setup-file=my file.json"])
    expect(result.setupFile).toBe("my file.json")
  })

  it("handles values containing equals signs", () => {
    const result = parseCliArguments(["--setup-file=key=value.json"])
    expect(result.setupFile).toBe("key=value.json")
  })

  it("throws error for invalid mode", () => {
    expect(() => parseCliArguments(["--mode=invalid"])).toThrow(ArgumentParsingError)
    expect(() => parseCliArguments(["--mode=invalid"])).toThrow("Invalid mode: invalid. Valid: iterative, GP, genetic")
  })

  it("throws error for invalid generations", () => {
    expect(() => parseCliArguments(["--generations=abc"])).toThrow("generations must be a positive integer, got: abc")
    expect(() => parseCliArguments(["--generations=0"])).toThrow("generations must be a positive integer, got: 0")
    expect(() => parseCliArguments(["--generations=-5"])).toThrow("generations must be a positive integer, got: -5")
  })

  it("throws error for invalid population", () => {
    expect(() => parseCliArguments(["--population=abc"])).toThrow("population must be a positive integer, got: abc")
  })

  it("throws error for invalid boolean", () => {
    expect(() => parseCliArguments(["--self-improve-nodes=maybe"])).toThrow(
      "Boolean value must be true/false/1/0/yes/no, got: maybe",
    )
  })

  it("throws error for invalid improvement type", () => {
    expect(() => parseCliArguments(["--improvement-type=invalid"])).toThrow(
      "Invalid improvement type: invalid. Valid: judge, unified",
    )
  })

  it("throws error for empty values", () => {
    expect(() => parseCliArguments(["--mode="])).toThrow("Empty value for --mode")
  })

  it("throws error for duplicate arguments", () => {
    expect(() => parseCliArguments(["--mode=iterative", "--mode=GP"])).toThrow("Duplicate argument: --mode")
  })

  it("throws error for invalid format", () => {
    expect(() => parseCliArguments(["--mode"])).toThrow("Invalid format: --mode. Use --key=value")
    expect(() => parseCliArguments(["mode=iterative"])).toThrow("Invalid format: mode=iterative. Use --key=value")
  })

  it("throws error for unknown arguments", () => {
    expect(() => parseCliArguments(["--unknown=value"])).toThrow("Unknown argument: --unknown")
  })

  it("handles empty arguments array", () => {
    const result = parseCliArguments([])
    expect(result).toEqual({})
  })

  it("handles partial arguments", () => {
    const result = parseCliArguments(["--mode=iterative", "--generations=5"])
    expect(result).toEqual({ mode: "iterative", generations: 5 })
  })

  it("trims whitespace from file paths", () => {
    const result = parseCliArguments(["--setup-file=  test.json  "])
    expect(result.setupFile).toBe("test.json")
  })
})
