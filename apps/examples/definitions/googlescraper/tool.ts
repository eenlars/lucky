import { createHash } from "node:crypto"
import fs from "node:fs/promises"
import path, { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { DenBoschAlbertHeijn } from "@examples/definitions/googlescraper/cache/bosch"
import { DenBoschAlbertHeijnNoDomain } from "@examples/definitions/googlescraper/cache/bosch-no-domain"
import { transformLocationData } from "@examples/definitions/googlescraper/convert"
import { searchGoogleMaps } from "@examples/definitions/googlescraper/main/main"
import { normalizeHostname } from "@examples/definitions/googlescraper/utils/hostname"
import type { StandardizedLocation } from "@lucky/shared"
import { Tools } from "@lucky/shared"
import { type CodeToolResult, commonSchemas, defineTool } from "@lucky/tools"
import { z } from "zod"

const paramsSchema = z.object({
  query: commonSchemas.query,
  maxResultCount: commonSchemas.resultCount,
  domainFilter: z
    .string()
    .optional()
    .describe(
      "if you want to filter by hostname (e.g. albertheijn.nl, ...), you can put it here; only hostname.tld (two parts) note: this is very handy when looking for specific websites",
    ),
})
type Params = z.infer<typeof paramsSchema>

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CACHE_DIR = path.join(__dirname, ".cache")

const getCacheKey = (params: Params) => {
  const sortedKeys = Object.keys(params).sort()
  const sortedParams: Record<string, any> = {}
  for (const key of sortedKeys) {
    sortedParams[key] = params[key as keyof Params]
  }
  const paramsString = JSON.stringify(sortedParams)
  return createHash("sha256").update(paramsString).digest("hex")
}

/**
 * Google Maps search tool for business information
 */
const googleMaps = defineTool({
  name: "searchGoogleMaps",
  description:
    "Search Google Maps for business information. Uses 'auto' mode (detects single/multiple results). Returns up to 20 results with business details, hours, contact info. you can filter by hostname (e.g. albertheijn.nl, ...), you can only use hostname.tld (two parts). CANNOT: interact with map elements, click buttons, or handle pages requiring authentication.",
  params: paramsSchema,
  async execute(params, _externalContext): Promise<CodeToolResult<StandardizedLocation[]>> {
    const { query, maxResultCount, domainFilter } = params

    // used cached responses.
    const mustHaveSearchTerms: string[] = ["albert", "heijn", "bosch"]
    if (
      // order does not matter
      mustHaveSearchTerms.every(term => query.toLowerCase().includes(term)) &&
      normalizeHostname(domainFilter ?? "") === "ah.nl"
    ) {
      console.log("🔍 Using cached response for Den Bosch Albert Heijn No Domain")
      return Tools.createSuccess("searchGoogleMaps", DenBoschAlbertHeijnNoDomain)
    }
    if (mustHaveSearchTerms.every(term => query.toLowerCase().includes(term))) {
      console.log("🔍 Using cached response for Den Bosch Albert Heijn")
      return Tools.createSuccess("searchGoogleMaps", DenBoschAlbertHeijn)
    }

    // File-based caching
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const cacheKey = getCacheKey(params)
    const cacheFilePath = path.join(CACHE_DIR, `${cacheKey}.json`)

    try {
      const cachedData = await fs.readFile(cacheFilePath, "utf-8")
      console.log(`🔍 Using file-cached response for query: ${query}`)
      return Tools.createSuccess("searchGoogleMaps", JSON.parse(cachedData))
    } catch (_error) {
      // Cache miss, proceed to fetch data
    }

    // lgg.log(
    //   "🔍 Executing Google Maps search with query:",
    //   query,
    //   "and max_result_count:",
    //   maxResultCount,
    //   "and domainFilter:",
    //   domainFilter
    // )
    const response = await searchGoogleMaps(
      {
        mode: "auto",
        query,
        resultCount: Math.min(Number(maxResultCount), 20),
        includeDetails: false,
      },
      {
        onlyIncludeWithWebsite: domainFilter ?? undefined,
      },
    )
    // Extract the actual result from the CodeToolResult format
    if (!response.success) {
      return Tools.createFailure("searchGoogleMaps", {
        error: response.error || "Google Maps search failed",
        location: "searchGoogleMaps:no-response",
      })
    }
    if (!response.output?.businesses) {
      return Tools.createFailure("searchGoogleMaps", {
        error: "No businesses found",
        location: "searchGoogleMaps:no-businesses",
      })
    }
    const converted = transformLocationData(response.output?.businesses)
    if (!converted) {
      return Tools.createFailure("searchGoogleMaps", {
        error: "No converted businesses found",
        location: "searchGoogleMaps:no-converted-businesses",
      })
    }
    await fs.writeFile(cacheFilePath, JSON.stringify(converted, null, 2))
    return Tools.createSuccess("searchGoogleMaps", converted)
  },
})

export const tool = googleMaps
