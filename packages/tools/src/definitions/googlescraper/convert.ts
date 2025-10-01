import { lgg } from "@core/utils/logging/Logger"
import type { GoogleMapsBusiness } from "@lucky/tools/definitions/googlescraper/main/types/GoogleMapsBusiness"
import { normalizeHostname } from "@lucky/tools/definitions/googlescraper/utils/hostname"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// get directory path for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

//run with: tsx src/lib/scraping/exports/may-29/convert.ts

export interface GoogleScraperBusinessExtended extends GoogleMapsBusiness {
  coordinates?: { latitude: number; longitude: number }
}

export interface StandardizedLocation {
  name: string
  address: string
  city: string
  country: string
  postcode: string
  // phone: string | null
  // email: string | null
  coordinates: { latitude: number; longitude: number } | null
  opening_times:
    | {
        monday: string
        tuesday: string
        wednesday: string
        thursday: string
        friday: string
        saturday: string
        sunday: string
      }
    | null
    | undefined
  owner_imgs: string[]
  metadata: {
    [key: string]: any
  }
  domain: string | null
}

export function transformLocationData(
  input: GoogleScraperBusinessExtended | GoogleScraperBusinessExtended[],
  extraMetadata?: Record<string, any>,
): StandardizedLocation[] {
  // handle both single objects and arrays
  const locations = Array.isArray(input) ? input : [input]

  return locations.map(location => {
    return {
      name: extractName(location),
      address: extractAddress(location),
      city: extractCity(location),
      country: extractCountry(location),
      postcode: extractPostcode(location),
      // phone: extractPhone(location),
      // email: extractEmail(location),
      coordinates: extractCoordinates(location),
      opening_times: transformOpeningHours(location),
      owner_imgs: extractOwnerImages(location),
      metadata: generateMetadata(location, extraMetadata),
      domain: location.bizWebsite ? normalizeHostname(location.bizWebsite) : null,
    }
  })
}

function extractName(location: GoogleMapsBusiness | GoogleScraperBusinessExtended): string {
  return location.storeName || ""
}

export function extractCoordinates(
  location: GoogleMapsBusiness | GoogleScraperBusinessExtended,
): { latitude: number; longitude: number } | null {
  // if coordinates already exist, use them
  if ("coordinates" in location && location.coordinates) {
    return location.coordinates
  }

  // extract from google maps url using !3d and !4d markers
  if (!location.googleUrl) return null

  const match = location.googleUrl.match(/!3d([-0-9\.]+)!4d([-0-9\.]+)/)
  if (!match) return null

  const latitude = parseFloat(match[1])
  const longitude = parseFloat(match[2])

  if (isNaN(latitude) || isNaN(longitude)) return null

  return { latitude, longitude }
}

function extractAddress(location: GoogleMapsBusiness): string {
  if (!location.address) return ""

  // remove prefix if present
  return location.address.replace(/^adres:\s*/i, "")
}

function extractCity(location: GoogleMapsBusiness): string {
  if (!location.address) return ""

  // remove prefix if present
  const cleanAddress = location.address.replace(/^adres:\s*/i, "")
  const addressParts = cleanAddress.split(",")
  if (addressParts.length < 2) return ""

  // get the last part which should contain postcode and city
  // format: "3111 CH Schiedam" or "2151 NN Nieuw-Vennep"
  const lastPart = addressParts[addressParts.length - 1].trim()

  // match dutch postcode format (4 digits, space, 2 letters, space, city)
  const cityMatch = lastPart.match(/^\d{4}\s+[A-Z]{2}\s+(.+)$/)

  return cityMatch ? cityMatch[1].trim() : ""
}

function extractCountry(_: GoogleMapsBusiness): string {
  return "Netherlands"
}

function extractPostcode(location: GoogleMapsBusiness): string {
  if (!location.address) return ""

  const postcodeMatch = location.address.match(/\b(\d{4}\s*[A-Z]{2})\b/)
  return postcodeMatch ? postcodeMatch[1] : ""
}

function extractPhone(location: GoogleMapsBusiness): string | null {
  if (!location.phone) return null

  // remove prefix if present
  const phone = location.phone.replace(/^telefoon:\s*/i, "")
  return phone || null
}

function extractEmail(_: GoogleMapsBusiness): string | null {
  // email not available in the example data
  return null
}

function transformOpeningHours(location: GoogleMapsBusiness):
  | {
      monday: string
      tuesday: string
      wednesday: string
      thursday: string
      friday: string
      saturday: string
      sunday: string
    }
  | undefined
  | null {
  // if no hours data available, return closed for all days
  if (!location.hours || typeof location.hours !== "object") {
    return null
  }

  // if all undefined, return undefined
  if (
    !location.hours.monday &&
    !location.hours.tuesday &&
    !location.hours.wednesday &&
    !location.hours.thursday &&
    !location.hours.friday &&
    !location.hours.saturday &&
    !location.hours.sunday
  ) {
    return undefined
  }

  // transform the hours object to our standardized format
  return {
    monday: location.hours.monday || "closed",
    tuesday: location.hours.tuesday || "closed",
    wednesday: location.hours.wednesday || "closed",
    thursday: location.hours.thursday || "closed",
    friday: location.hours.friday || "closed",
    saturday: location.hours.saturday || "closed",
    sunday: location.hours.sunday || "closed",
  }
}

function extractOwnerImages(location: GoogleMapsBusiness): string[] {
  const images = []
  if (location.mainImage) {
    images.push(location.mainImage)
  }
  return images
}

function generateMetadata(
  location: GoogleMapsBusiness,
  extraMetadata?: Record<string, any>,
): {
  [key: string]: any
} {
  return {
    original_data: location,
    category: location.category || null,
    status: location.status || null,
    googleUrl: location.googleUrl || null,
    bizWebsite: location.bizWebsite || null,
    stars: location.stars || null,
    numberOfReviews: location.numberOfReviews || 0,
    scrapedAt: new Date().toISOString(),
    ...(extraMetadata || {}),
  }
}

// main execution function
export async function convertGoogleScraperData() {
  try {
    // read the input file
    const inputPath = path.join(__dirname, "output", "all_businesses.json")
    const outputPath = path.join(__dirname, "output", "standardized_locations.json")

    const rawData = fs.readFileSync(inputPath, "utf8")
    const businesses = JSON.parse(rawData) as GoogleMapsBusiness[]

    // transform the data
    const standardizedLocations = transformLocationData(businesses)

    // write the output file
    fs.writeFileSync(outputPath, JSON.stringify(standardizedLocations, null, 2), "utf8")

    lgg.log(`Successfully converted ${businesses.length} businesses to standardized format.`)
    lgg.log(`Output saved to: ${outputPath}`)
  } catch (error) {
    lgg.error("Error converting Google scraper data:", error)
  }
}
