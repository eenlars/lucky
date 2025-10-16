// extractJSON.test.ts
import { describe, expect, it } from "vitest"
import { JSONN } from "./jsonParse"

describe("extractJSON", () => {
  it("parses a simple JSON object", () => {
    const input = `{
      "foo": 123,
      "bar": ["a", "b", "c"]
    }`
    expect(JSONN.extract(input)).toEqual({ foo: 123, bar: ["a", "b", "c"] })
  })

  it("accepts a top-level array by wrapping it", () => {
    const input = `["x", "y", "z"]`
    expect(JSONN.extract(input)).toEqual({ data: ["x", "y", "z"] })
  })

  it("extracts JSON inside backtick fences", () => {
    const input = `
      Here's some code:
      \`\`\`json
      { "a": 1, "b": 2 }
      \`\`\`
      And some text afterwards.
    `
    expect(JSONN.extract(input)).toEqual({ a: 1, b: 2 })
  })

  it("extracts JSON inside tilde fences", () => {
    const input = `
      ~~~
      { "nested": { "ok": true } }
      ~~~
    `
    expect(JSONN.extract(input)).toEqual({ nested: { ok: true } })
  })

  it("handles JSON5 features: single quotes, trailing commas, comments", () => {
    const input = `
      {
        // a comment
        'x': 'hello', // trailing comma
        'y': 3,
      }
    `
    expect(JSONN.extract(input)).toEqual({ x: "hello", y: 3 })
  })

  it("picks the largest JSON blob when multiple are present", () => {
    const input = `
      { "small": true }
      {
        "large": [1,2,3],
        "more": { "deep": "yes" }
      }
    `
    expect(JSONN.extract(input)).toEqual({
      large: [1, 2, 3],
      more: { deep: "yes" },
    })
  })

  it("throws if input is not a string", () => {
    expect(() => JSONN.extract(123, true)).toThrow(/expected a string/)
  })

  it("throws if there is no JSON at all", () => {
    expect(() => JSONN.extract("no braces here", true)).toThrow(/no valid JSON/)
  })

  it("throws if braces are unmatched", () => {
    const input = '{ "incomplete": 42 '
    expect(() => JSONN.extract(input, true)).toThrow(/no valid JSON/)
  })

  it("isJSON works", () => {
    const test =
      '```json\n{\n  "what_went_well": [\n    "Successfully identified an official MR Marvis store location in the Netherlands.", "Used both the brand\'s official website and Google Maps for verification.", "Compiled a clear and concise store address with relevant details."\n  ]\n}\n```'
    const expected = {
      what_went_well: [
        "Successfully identified an official MR Marvis store location in the Netherlands.",
        "Used both the brand's official website and Google Maps for verification.",
        "Compiled a clear and concise store address with relevant details.",
      ],
    }

    expect(JSONN.extract(test)).toEqual(expected)
  })

  it("isJSON works for non-strings", () => {
    const test = {
      what_went_well: [
        "Successfully identified an official MR Marvis store location in the Netherlands.",
        "Used both the brand's official website and Google Maps for verification.",
        "Compiled a clear and concise store address with relevant details.",
      ],
    }
    expect(JSONN.isJSON(test)).toBe(true)
  })
})
