import { describe, it, expect } from "vitest"
import { executeJavaScript } from "../tool"

describe("executeJavaScript", () => {
  it("should execute basic JavaScript expressions and return results", () => {
    // Test mathematical operations
    expect(executeJavaScript("2 + 3")).toBe(5)
    expect(executeJavaScript("10 * 4")).toBe(40)
    expect(executeJavaScript("Math.PI")).toBe(Math.PI)

    // Test string operations
    expect(executeJavaScript("'hello' + ' world'")).toBe("hello world")
    expect(executeJavaScript("'test'.toUpperCase()")).toBe("TEST")

    // Test arrays and objects
    expect(executeJavaScript("[1, 2, 3].length")).toBe(3)
    expect(executeJavaScript("({a: 1, b: 2}).a")).toBe(1)

    // Test functions and closures
    expect(executeJavaScript("((x) => x * 2)(5)")).toBe(10)
    expect(executeJavaScript("(() => { let x = 10; return x + 5; })()")).toBe(15)

    // Test complex expressions with return
    expect(
      executeJavaScript(`
      const arr = [1, 2, 3, 4, 5];
      return arr.filter(x => x % 2 === 0).map(x => x * 2)
    `)
    ).toEqual([4, 8])
  })

  it("should handle timeout and throw error for long-running code", () => {
    // Test with infinite loop - should timeout
    expect(() => executeJavaScript("while(true) {}", 100)).toThrow()

    // Test with slow computation - should timeout
    expect(() =>
      executeJavaScript(
        `
        let sum = 0;
        for(let i = 0; i < 10000000; i++) {
          sum += i;
        }
        sum
      `,
        10
      )
    ).toThrow()

    // Test that fast code still works with short timeout
    expect(executeJavaScript("1 + 1", 10)).toBe(2)

    // Test default timeout (1000ms) works for reasonable code
    expect(
      executeJavaScript(`
      let result = 0;
      for(let i = 0; i < 1000; i++) {
        result += i;
      }
      return result
    `)
    ).toBe(499500)
  })

  it("should handle JavaScript errors and throw them appropriately", () => {
    // Test syntax errors
    expect(() => executeJavaScript("2 + ")).toThrow()

    expect(() => executeJavaScript("let x = {")).toThrow()

    // Test runtime errors
    expect(() => executeJavaScript("undefined.someProperty")).toThrow()

    expect(() => executeJavaScript("nonExistentFunction()")).toThrow()

    // Test reference errors
    expect(() => executeJavaScript("someUndefinedVariable")).toThrow()

    // Test type errors
    expect(() => executeJavaScript("null.toString()")).toThrow()

    // Test that sandbox prevents access to Node.js globals
    expect(() => executeJavaScript("require('fs')")).toThrow()

    expect(() => executeJavaScript("process.exit()")).toThrow()

    expect(() => executeJavaScript("global.console")).toThrow()
  })
})
