/**
 * locationChain.ts - Simulated location tools with large JSON payloads
 * Sequence: search_google_maps → location_data_manager → verify_location → location_data_info
 */
import { tool, zodSchema } from "ai"
import { z } from "zod"

const Bounds = z.object({
  north: z.number(),
  south: z.number(),
  east: z.number(),
  west: z.number(),
})

const Location = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string(),
  category: z.string(),
  rating: z.number(),
})

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateLocations(count: number, bounds: z.infer<typeof Bounds>) {
  const categories = ["grocery", "pharmacy", "cafe", "restaurant", "gym", "bank"]
  const results: Array<z.infer<typeof Location>> = []
  for (let i = 0; i < count; i++) {
    results.push({
      id: `loc_${i}_${Math.random().toString(36).slice(2, 8)}`,
      name: `Place ${i + 1}`,
      lat: randomBetween(bounds.south, bounds.north),
      lng: randomBetween(bounds.west, bounds.east),
      address: `${Math.floor(randomBetween(1, 9999))} Main St, City ${i}`,
      category: categories[Math.floor(randomBetween(0, categories.length))],
      rating: Math.round(randomBetween(25, 50)) / 10, // 2.5 - 5.0
    })
  }
  return results
}

// 1) SearchGoogleMaps – returns many locations + the original bounds
const SearchParams = z.object({
  query: z.string().describe("Search query for places"),
  area: Bounds.describe("Geographic bounds to search within"),
})

export const searchGoogleMapsSpec = tool({
  description: "Searches for locations and returns a large JSON payload of results",
  inputSchema: zodSchema(SearchParams),
  execute: async ({ query: _query, area }: z.infer<typeof SearchParams>) => {
    // Ignore query semantics; just generate data within bounds
    const locations = generateLocations(60, area)
    return { locations, area }
  },
})

// 2) LocationDataManager – requires locations from search and returns datasetId
const ManagerParams = z.object({
  locations: z.array(Location).describe("Locations to manage"),
  action: z.enum(["save", "remove"]).describe("Requested data action"),
})

export const locationDataManagerSpec = tool({
  description: "Saves or removes locations and returns a dataset reference",
  inputSchema: zodSchema(ManagerParams),
  execute: async ({ locations, action }: z.infer<typeof ManagerParams>) => {
    const datasetId = `ds_${Math.random().toString(36).slice(2, 10)}`
    const savedCount = action === "save" ? locations.length : 0
    return { datasetId, savedCount, locations }
  },
})

// 3) VerifyLocation – requires datasetId from manager + area from search
const VerifyParams = z.object({
  datasetId: z.string().describe("Dataset reference returned from manager"),
  locations: z.array(Location).describe("Locations to verify"),
  area: Bounds.describe("Bounds used for verification"),
})

export const verifyLocationSpec = tool({
  description: "Verifies which locations fall within the given area bounds",
  inputSchema: zodSchema(VerifyParams),
  execute: async ({ datasetId, locations, area }: z.infer<typeof VerifyParams>) => {
    const within = [] as Array<z.infer<typeof Location>>
    const outside = [] as Array<z.infer<typeof Location>>
    for (const loc of locations) {
      if (loc.lat <= area.north && loc.lat >= area.south && loc.lng <= area.east && loc.lng >= area.west) {
        within.push(loc)
      } else {
        outside.push(loc)
      }
    }
    return {
      datasetId,
      verified: within,
      rejected: outside,
      verifiedCount: within.length,
      rejectedCount: outside.length,
    }
  },
})

// 4) LocationDataInfo – requires verification counts and datasetId
const InfoParams = z.object({
  datasetId: z.string().describe("Dataset reference"),
  verifiedCount: z.number().describe("Count of verified locations"),
  rejectedCount: z.number().describe("Count of rejected locations"),
})

export const locationDataInfoSpec = tool({
  description: "Summarizes the verification results for reporting",
  inputSchema: zodSchema(InfoParams),
  execute: async ({ datasetId, verifiedCount, rejectedCount }: z.infer<typeof InfoParams>) => {
    return `Dataset ${datasetId}: ${verifiedCount} locations verified, ${rejectedCount} rejected`
  },
})

// Export combined toolset and strict expected order
export const locationChainTools = {
  search_google_maps: searchGoogleMapsSpec,
  location_data_manager: locationDataManagerSpec,
  verify_location: verifyLocationSpec,
  location_data_info: locationDataInfoSpec,
}

export const locationChainOrder = [
  "search_google_maps",
  "location_data_manager",
  "verify_location",
  "location_data_info",
]
