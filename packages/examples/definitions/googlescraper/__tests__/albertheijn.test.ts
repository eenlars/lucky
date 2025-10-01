import { describe, expect, it } from "vitest"
import { searchGoogleMaps } from "../main"

const expectedAlbertHeijnStructure = {
  storeName: "Albert Heijn",
  stars: expect.any(String),
  numberOfReviews: expect.any(Number),
  googleUrl: expect.stringContaining("google.com/maps"),
  bizWebsite: expect.stringContaining("ah.nl"),
  address: expect.stringMatching(/Adres: .+2151 NN Nieuw-Vennep/),
  category: "Supermarkt",
  status: expect.any(String),
  phone: expect.stringMatching(/Telefoon: .+/),
  mainImage: expect.stringContaining("https://"),
  hours: {
    monday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    tuesday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    wednesday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    thursday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    friday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    saturday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
    sunday: expect.stringMatching(/\d{2}:\d{2}-\d{2}:\d{2}/),
  },
}

describe.skip("Albert Heijn Nieuw-Vennep Integration Test Detail page immediately", () => {
  it("should find Albert Heijn store information in Nieuw-Vennep", async () => {
    const result = await searchGoogleMaps({
      query: "albert heijn nieuw-vennep",
      resultCount: 5,
    })

    expect(result.success).toBe(true)

    if (result.success) {
      const { businesses } = result.output

      expect(businesses).toBeDefined()
      expect(businesses.length).toBeGreaterThan(0)

      // check that we found at least one Albert Heijn
      const albertHeijnStores = businesses.filter(b => b.storeName?.toLowerCase().includes("albert heijn"))
      expect(albertHeijnStores.length).toBeGreaterThan(0)

      // verify first store matches expected structure
      const firstStore = albertHeijnStores[0]
      expect(firstStore).toMatchObject(expectedAlbertHeijnStructure)
    }
  }, 30000) // 30 second timeout for scraping
})
