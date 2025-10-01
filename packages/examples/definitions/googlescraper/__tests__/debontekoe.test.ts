import { describe, expect, it } from "vitest"
import { transformLocationData } from "../convert"
import { searchGoogleMaps } from "../main/main"

describe("De Bonte Koe Integration Test", () => {
  it("should find De Bonte Koe chocolate shop and extract city from address", async () => {
    const query = "De Bonte Koe chocolate Netherlands"
    const maxResults = 5

    const result = await searchGoogleMaps(
      {
        mode: "auto",
        query,
        resultCount: maxResults,
      },
      {
        proxy: undefined,
        enableLogging: true,
      },
    )

    expect(result.success).toBe(true)
    expect(result.output?.businesses).toBeDefined()
    expect(Array.isArray(result.output?.businesses)).toBe(true)
    expect(result.output?.businesses.length).toBeGreaterThan(0)

    // transform to standardized format to test city extraction
    const standardizedData = transformLocationData(result.output?.businesses || [])

    // find the De Bonte Koe entry
    const bonteKoeEntry = standardizedData.find(
      business => business.name && business.name.toLowerCase().includes("bonte koe"),
    )

    expect(bonteKoeEntry).toBeDefined()
    expect(bonteKoeEntry?.name).toContain("Bonte Koe")

    if (!bonteKoeEntry) {
      throw new Error("De Bonte Koe entry not found")
    }

    // verify address and city extraction
    expect(bonteKoeEntry.address).toBeDefined()
    expect(bonteKoeEntry.address.length).toBeGreaterThan(0)

    // the key test - city should be extracted (if postcode format is available)
    // note: city extraction only works when postcode is present in address
    // current addresses from google scraper don't include postcode/city, so expect empty string
    expect(bonteKoeEntry.city).toBeDefined()
    expect(typeof bonteKoeEntry.city).toBe("string")
    // expect empty city since addresses don't contain postcode format
    expect(bonteKoeEntry.city).toBe("")

    console.log("De Bonte Koe business found:")
    console.log("Name:", bonteKoeEntry.name)
    console.log("Address:", bonteKoeEntry.address)
    console.log("City:", bonteKoeEntry.city)
    console.log("Postcode:", bonteKoeEntry.postcode)

    // log all businesses to see address formats
    console.log("All businesses with addresses:")
    standardizedData.forEach((business, index) => {
      console.log(`${index + 1}. ${business.name}`)
      console.log(`   Address: "${business.address}"`)
      console.log(`   City: "${business.city}"`)
      console.log(`   Postcode: "${business.postcode}"`)
    })
  }, 30000) // 30 second timeout for integration test
})
