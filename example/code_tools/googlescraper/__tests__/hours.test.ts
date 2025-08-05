import { parseHours } from "@/code_tools/googlescraper/utils/extractHours"
import { readFileSync } from "fs"
import { join } from "path"
import { beforeAll, describe, expect, it } from "vitest"

describe("parseHours", () => {
  let validHoursTableHtml: string

  beforeAll(() => {
    validHoursTableHtml = readFileSync(
      join(__dirname, "html/validHoursTable.html"),
      "utf-8"
    )
  })

  it("should parse valid hours table with exact expected values", () => {
    const result = parseHours(validHoursTableHtml)

    expect(result).toEqual({
      monday: "8 AM-9 PM",
      tuesday: "8 AM-9 PM",
      wednesday: "8 AM-9 PM",
      thursday: "12-6 PM", // special case: ascension day
      friday: "8 AM-9 PM",
      saturday: "8 AM-9 PM",
      sunday: "12-6 PM",
    })
  })

  it("should return null for null input", () => {
    const result = parseHours(null)
    expect(result).toBeNull()
  })

  it("should return null for empty string", () => {
    const result = parseHours("")
    expect(result).toBeNull()
  })

  it("should handle multilingual day names", () => {
    const germanHtml = `
      <table>
        <tr>
          <td><div>Montag</div></td>
          <td><li class="G8aQO">9:00-17:00</li></td>
        </tr>
        <tr>
          <td><div>Dienstag</div></td>
          <td><li class="G8aQO">9:00-17:00</li></td>
        </tr>
      </table>
    `

    const result = parseHours(germanHtml)
    expect(result?.monday).toBe("9:00-17:00")
    expect(result?.tuesday).toBe("9:00-17:00")
    expect(result?.wednesday).toBeUndefined()
  })

  it("should handle special day annotations like ascension day", () => {
    const result = parseHours(validHoursTableHtml)
    expect(result?.thursday).toBe("12-6 PM")
  })

  it("should throw error when parsing fails with unrecognizable data", () => {
    const invalidHtml = `
      <table>
        <tr>
          <td><div>SomeUnknownDay</div></td>
          <td><li class="G8aQO">9:00-17:00</li></td>
        </tr>
      </table>
    `

    expect(() => parseHours(invalidHtml)).toThrow("failed to parse hours table")
  })

  it("should handle missing hours gracefully", () => {
    const noHoursHtml = `
      <table>
        <tr>
          <td><div>Monday</div></td>
          <td></td>
        </tr>
      </table>
    `

    const result = parseHours(noHoursHtml)
    expect(result).toEqual({
      monday: undefined,
      tuesday: undefined,
      wednesday: undefined,
      thursday: undefined,
      friday: undefined,
      saturday: undefined,
      sunday: undefined,
    })
  })

  it("should use positional mapping for 7-day tables when day names fail", () => {
    const positionalHtml = `
      <table>
        <tr><td><div>unknownday1</div></td><td><li class="G8aQO">8:00-20:00</li></td></tr>
        <tr><td><div>unknownday2</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>unknownday3</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>unknownday4</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>unknownday5</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>unknownday6</div></td><td><li class="G8aQO">9:00-18:00</li></td></tr>
        <tr><td><div>unknownday7</div></td><td><li class="G8aQO">10:00-16:00</li></td></tr>
      </table>
    `

    const result = parseHours(positionalHtml) // should use sunday-first pattern when day name matching fails
    expect(result).toEqual({
      sunday: "8:00-20:00",
      monday: "9:00-17:00",
      tuesday: "9:00-17:00",
      wednesday: "9:00-17:00",
      thursday: "9:00-17:00",
      friday: "9:00-18:00",
      saturday: "10:00-16:00",
    })
  })

  it("should prefer day name matching over positional when names are recognized", () => {
    const mixedHtml = `
      <table>
        <tr><td><div>Friday</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>Monday</div></td><td><li class="G8aQO">8:00-18:00</li></td></tr>
      </table>
    `

    const result = parseHours(mixedHtml)
    expect(result?.friday).toBe("9:00-17:00")
    expect(result?.monday).toBe("8:00-18:00")
    expect(result?.sunday).toBeUndefined()
  })

  it("should handle tbody vs table element correctly", () => {
    const tbodyHtml = `
      <tbody>
        <tr><td><div>Monday</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
      </tbody>
    `

    const tableHtml = `
      <table>
        <tr><td><div>Tuesday</div></td><td><li class="G8aQO">10:00-18:00</li></td></tr>
      </table>
    `

    const tbodyResult = parseHours(tbodyHtml)
    const tableResult = parseHours(tableHtml)

    expect(tbodyResult?.monday).toBe("9:00-17:00")
    expect(tableResult?.tuesday).toBe("10:00-18:00")
  })

  it("should handle case insensitive day names", () => {
    const caseHtml = `
      <table>
        <tr><td><div>MONDAY</div></td><td><li class="G8aQO">9:00-17:00</li></td></tr>
        <tr><td><div>Tuesday</div></td><td><li class="G8aQO">10:00-18:00</li></td></tr>
      </table>
    `

    const result = parseHours(caseHtml)
    expect(result?.monday).toBe("9:00-17:00")
    expect(result?.tuesday).toBe("10:00-18:00")
  })
})
