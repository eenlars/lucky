import { describe, expect, it } from "vitest"
import { searchGoogleMaps } from "../main"

const expectedAlbertHeijnStructure = {
  storeName: expect.stringContaining("Albert Heijn"),
  stars: expect.any(String),
  numberOfReviews: expect.anything(), // can be null or number
  googleUrl: expect.stringContaining("google.com/maps"),
  bizWebsite: expect.anything(), // can be ah.nl or janlinders.nl
  address: expect.any(String), // not necessarily containing "Den Bosch" for all stores
  category: "Supermarkt",
  status: expect.any(String),
  phone: expect.any(String), // just the phone number without "Telefoon: " prefix
  hours: expect.anything(), // can be null or object with hours
  placeId: expect.any(String),
  ratingText: expect.any(String),
  mainImage: expect.anything(), // can be undefined
}

describe("Albert Heijn Den Bosch Netherlands - Multiple Results Test", () => {
  // FAILING: This test expects to find 8 Albert Heijn stores but only finds 1
  // The test fails at line 40: expect(albertHeijnStores.length).toBe(businesses.length)
  // Expected 8 Albert Heijn stores but got 1, suggesting either:
  // 1. The search query isn't broad enough to find multiple locations
  // 2. The Google Maps scraper is not returning all expected results
  // 3. The search area is too narrow or the query parameters need adjustment
  // This is an integration test that depends on real Google Maps data which can be inconsistent

  it("should find multiple Albert Heijn stores in Den Bosch", async () => {
    const result = await searchGoogleMaps({
      query: "albert heijn den bosch",
      resultCount: 20,
      mode: "multiple",
    })

    expect(result.success).toBe(true)

    if (result.success) {
      const { businesses } = result.output

      expect(businesses).toBeDefined()
      expect(businesses.length).toBeGreaterThan(1) // expecting multiple results

      // check that all results are Albert Heijn stores
      const albertHeijnStores = businesses.filter((b) =>
        b.storeName?.toLowerCase().includes("albert heijn")
      )
      expect(albertHeijnStores.length).toBe(businesses.length)

      // verify each store has essential properties
      albertHeijnStores.forEach((store) => {
        expect(store.storeName).toContain("Albert Heijn")
        expect(store.category).toBe("Supermarkt")
        expect(store.googleUrl).toContain("google.com/maps")
        expect(store.address).toBeDefined()
        expect(store.phone).toBeDefined()
        expect(store.stars).toBeDefined()
        expect(store.placeId).toBeDefined()
        expect(store.ratingText).toBeDefined()
      })

      // check that we have multiple unique stores (not duplicates)
      const uniqueAddresses = new Set(albertHeijnStores.map((s) => s.address))
      expect(uniqueAddresses.size).toBeGreaterThan(1)

      // verify specific known locations
      const gruttostraatStore = albertHeijnStores.find((s) =>
        s.address?.includes("Gruttostraat")
      )
      expect(gruttostraatStore).toBeDefined()
      expect(gruttostraatStore?.storeName).toContain("Albert Heijn")

      // verify rating information is reasonable
      albertHeijnStores.forEach((store) => {
        if (store.stars && store.stars !== "0") {
          const rating = parseFloat(store.stars)
          expect(rating).toBeGreaterThanOrEqual(1)
          expect(rating).toBeLessThanOrEqual(5)
        }

        // check hours format if present
        if (store.hours && typeof store.hours === "object") {
          expect(Object.keys(store.hours).length).toBeGreaterThan(0)
        }
      })

      console.log(
        `Found ${albertHeijnStores.length} Albert Heijn stores in Den Bosch`
      )
      console.log(
        `Gruttostraat location: ${gruttostraatStore ? "Found" : "Not found"}`
      )
    }
  }, 30000) // 30 second timeout for scraping
})
