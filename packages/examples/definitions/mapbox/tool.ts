import { defineTool } from "@lucky/tools"
import { z } from "zod"
import { geocodeLocation, type LocationData } from "./mapboxUse"

/**
 * Mapbox geocoding tool for location verification
 */
const mapboxTool = defineTool({
  name: "verifyLocation",
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
