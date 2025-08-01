import { describe, expect, it } from "vitest"

import { searchGoogleMaps } from "../main/main"

describe.skip("Google Maps Scraper", () => {
  it("should return businesses with Beethovenstraat 48H address", async () => {
    // Run the searchGoogleMaps function with a dummy query
    const result = await searchGoogleMaps(
      {
        mode: "multiple",
        query: "rituals stores amsterdam",
        resultCount: 10,
      },
      {
        proxy: undefined,
        enableLogging: true,
      }
    )

    // Verify the result is successful
    expect(result.success).toBe(true)

    if (result.success) {
      // Check that we have businesses
      expect(result.output.businesses).toBeDefined()
      expect(result.output.businesses.length).toBeGreaterThan(0)

      // Check if any business has the Beethovenstraat 48H address
      const beethovenBusiness = result.output.businesses.find((business) =>
        business.address?.includes("Beethovenstraat 48H")
      )

      expect(beethovenBusiness).toBeDefined()
      expect(beethovenBusiness?.address).toContain("Beethovenstraat 48H")

      // Additional checks for the business
      if (beethovenBusiness) {
        expect(beethovenBusiness.storeName).toBeDefined()
        expect(beethovenBusiness.googleUrl).toBeDefined()
      }
    }
  }, 30000) // 30 second timeout for scraping
})
