import { defineTool } from "@lucky/tools"
import { z } from "zod"
import { type LocationData, geocodeLocation } from "./mapboxUse"

/**
 * Mapbox geocoding tool for location verification
 */
const mapboxTool = defineTool({
  name: "verifyLocation",
  description:
    "Geocode a list of addresses to get coordinates, place name, and context using Mapbox. Best with complete addresses. LIMITS: may return multiple results for ambiguous queries, less accurate with partial addresses",
  params: z.object({
    queries: z
      .array(z.string())
      .describe(
        "Array of search queries to find locations, preferably with street name, house number, city and country.",
      ),
  }),
  async execute(params) {
    const { queries } = params

    const results = await Promise.all(queries.map(query => geocodeLocation({ query })))

    return {
      success: true,
      data: results,
      error: null,
    }
  },
})

export const tool = mapboxTool
export type { LocationData }
