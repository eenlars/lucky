import { describe, expect, it } from "vitest"
import { type GoogleScraperBusinessExtended, transformLocationData } from "../convert"

describe("Google Scraper Data Conversion", () => {
  it("should transform Albert Heijn Google Maps data to standardized format", () => {
    // input json - raw Google Maps scraper data
    const inputAlbertHeijn: GoogleScraperBusinessExtended = {
      storeName: "Albert Heijn",
      stars: "4,1",
      numberOfReviews: 913,
      googleUrl: "https://www.google.com/maps/place/Albert+Heijn/@52.2899!3d52.2899!4d4.6377",
      bizWebsite: "https://www.ah.nl/winkel/1253",
      address: "Adres: Händelplein 185, 2151 NN Nieuw-Vennep",
      category: "Supermarkt",
      status: "Sluit binnenkort",
      phone: "Telefoon: 0252 622 111",
      mainImage:
        "https://lh3.googleusercontent.com/gps-cs-s/AC9h4noz9EsH7aX1d1EZk35tv1WO2iK7CS8abjw4Y-wQgpbn7pWHhHseq-ZYv4bkGoZALlZ5A9BShe62Qb9ZKqqzZGaZB_fqd21d4gctiLf_Q64D2eRlbLojzk6TXAfGqAmZaL8R0VtBZw=w408-h306-k-no",
      hours: {
        monday: "08:00-22:00",
        tuesday: "08:00-22:00",
        wednesday: "08:00-22:00",
        thursday: "08:00-22:00",
        friday: "08:00-22:00",
        saturday: "08:00-22:00",
        sunday: "08:00-22:00",
      },
    }

    // expected output json - standardized location format
    const expectedOutput = {
      name: "Albert Heijn",
      address: "Händelplein 185, 2151 NN Nieuw-Vennep",
      city: "Nieuw-Vennep",
      country: "Netherlands",
      postcode: "2151 NN",
      phone: "0252 622 111",
      email: null,
      coordinates: [52.2899, 4.6377],
      opening_times: {
        monday: "08:00-22:00",
        tuesday: "08:00-22:00",
        wednesday: "08:00-22:00",
        thursday: "08:00-22:00",
        friday: "08:00-22:00",
        saturday: "08:00-22:00",
        sunday: "08:00-22:00",
      },
      owner_imgs: [
        "https://lh3.googleusercontent.com/gps-cs-s/AC9h4noz9EsH7aX1d1EZk35tv1WO2iK7CS8abjw4Y-wQgpbn7pWHhHseq-ZYv4bkGoZALlZ5A9BShe62Qb9ZKqqzZGaZB_fqd21d4gctiLf_Q64D2eRlbLojzk6TXAfGqAmZaL8R0VtBZw=w408-h306-k-no",
      ],
      metadata: {
        original_data: inputAlbertHeijn,
        category: "Supermarkt",
        status: "Sluit binnenkort",
        googleUrl: "https://www.google.com/maps/place/Albert+Heijn/@52.2899!3d52.2899!4d4.6377",
        bizWebsite: "https://www.ah.nl/winkel/1253",
        stars: "4,1",
        numberOfReviews: 913,
        scrapedAt: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      },
      domain: "ah.nl",
    }

    // perform transformation
    const result = transformLocationData(inputAlbertHeijn)

    expect(result).toHaveLength(1)
    const transformedLocation = result[0]

    // verify all fields match expected output
    expect(transformedLocation.name).toBe(expectedOutput.name)
    expect(transformedLocation.address).toBe(expectedOutput.address)
    expect(transformedLocation.city).toBe("Nieuw-Vennep")
    expect(transformedLocation.country).toBe(expectedOutput.country)
    expect(transformedLocation.postcode).toBe(expectedOutput.postcode)
    expect(transformedLocation.coordinates).toEqual({
      latitude: 52.2899,
      longitude: 4.6377,
    })
    expect(transformedLocation.opening_times).toEqual(expectedOutput.opening_times)
    expect(transformedLocation.owner_imgs).toEqual(expectedOutput.owner_imgs)

    // verify metadata
    expect(transformedLocation.metadata.category).toBe(expectedOutput.metadata.category)
    expect(transformedLocation.metadata.status).toBe(expectedOutput.metadata.status)
    expect(transformedLocation.metadata.googleUrl).toBe(expectedOutput.metadata.googleUrl)
    expect(transformedLocation.metadata.bizWebsite).toBe(expectedOutput.metadata.bizWebsite)
    expect(transformedLocation.metadata.stars).toBe(expectedOutput.metadata.stars)
    expect(transformedLocation.metadata.numberOfReviews).toBe(expectedOutput.metadata.numberOfReviews)
    expect(transformedLocation.metadata.scrapedAt).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(transformedLocation.metadata.original_data).toEqual(inputAlbertHeijn)
  })

  it("should handle array of businesses", () => {
    const inputBusinesses: GoogleScraperBusinessExtended[] = [
      {
        storeName: "Store 1",
        address: "Adres: Test Street 1, 1234 AB Amsterdam",
        phone: "Telefoon: 012 345 6789",
        hours: null,
        stars: "4,1",
        numberOfReviews: 913,
      },
      {
        storeName: "Store 2",
        address: "Adres: Test Avenue 2, 5678 CD Rotterdam",
        phone: "Telefoon: 098 765 4321",
        hours: {
          monday: "09:00-18:00",
          tuesday: "09:00-18:00",
          wednesday: "09:00-18:00",
          thursday: "09:00-18:00",
          friday: "09:00-21:00",
          saturday: "10:00-17:00",
          sunday: "closed",
        },
        stars: "4,1",
        numberOfReviews: 913,
      },
    ]

    const result = transformLocationData(inputBusinesses)

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("Store 1")
    expect(result[0].postcode).toBe("1234 AB")
    expect(result[0].city).toBe("Amsterdam")
    expect(result[0].opening_times).toBeNull()

    expect(result[1].name).toBe("Store 2")
    expect(result[1].postcode).toBe("5678 CD")
    expect(result[1].city).toBe("Rotterdam")
    expect(result[1].opening_times?.friday).toBe("09:00-21:00")
  })

  it("should add extra metadata when provided", () => {
    const input: GoogleScraperBusinessExtended = {
      storeName: "Test Store",
      address: "Adres: Test 1, 1234 AB City",
      stars: "4,1",
      numberOfReviews: 913,
      hours: null,
    }

    const extraMetadata = {
      scraperVersion: "2.0",
      batchId: "batch-123",
    }

    const result = transformLocationData(input, extraMetadata)

    expect(result[0].metadata.scraperVersion).toBe("2.0")
    expect(result[0].metadata.batchId).toBe("batch-123")
  })

  it("should extract city from Dutch address format 'Lange Haven 54, 3111 CH Schiedam'", () => {
    const input: GoogleScraperBusinessExtended = {
      storeName: "Test Business",
      address: "Lange Haven 54, 3111 CH Schiedam",
      stars: "4,5",
      numberOfReviews: 150,
      hours: null,
    }

    const result = transformLocationData(input)

    expect(result[0].city).toBe("Schiedam")
    expect(result[0].postcode).toBe("3111 CH")
    expect(result[0].address).toBe("Lange Haven 54, 3111 CH Schiedam")
  })
})
