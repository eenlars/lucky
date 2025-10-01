import Tools, { type CodeToolResult } from "@lucky/tools"
import { commonSchemas, defineTool } from "@lucky/tools"
import { DenBoschAlbertHeijn } from "@lucky/tools/definitions/googlescraper/cache/bosch"
import { DenBoschAlbertHeijnNoDomain } from "@lucky/tools/definitions/googlescraper/cache/bosch-no-domain"
import { transformLocationData, type StandardizedLocation } from "@lucky/tools/definitions/googlescraper/convert"
import { searchGoogleMaps } from "@lucky/tools/definitions/googlescraper/main/main"
import { normalizeHostname } from "@lucky/tools/definitions/googlescraper/utils/hostname"
import { createHash } from "crypto"
import fs from "fs/promises"
import path, { dirname } from "path"
import { fileURLToPath } from "url"
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
  params: paramsSchema,
  async execute(params, externalContext): Promise<CodeToolResult<StandardizedLocation[]>> {
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
    } else if (mustHaveSearchTerms.every(term => query.toLowerCase().includes(term))) {
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
    } catch (error) {
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
