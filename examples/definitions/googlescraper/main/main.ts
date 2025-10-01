/* searchGoogleMaps.ts – single-file, self-contained
   ------------------------------------------------- */

import type { LocationMapLink } from "@examples/definitions/googlescraper/main/data_manager"
import { searchSingleBusiness } from "@examples/definitions/googlescraper/main/page-detail/extractDetailPage"
import { handleMultipleFeed } from "@examples/definitions/googlescraper/main/page-multiple/handleMultipleFeed"
import type { GoogleMapsBusiness } from "@examples/definitions/googlescraper/main/types/GoogleMapsBusiness"
import { cleanupBrowser, navigateToGoogleMaps, sanitizeJSON } from "@examples/definitions/googlescraper/main/util"
import { normalizeHostname } from "@examples/definitions/googlescraper/utils/hostname"
import type { ProxyResponse } from "@examples/definitions/googlescraper/utils/proxies"
import { detectFeed, setupPage } from "@examples/definitions/googlescraper/utils/scrapeUtils"
import type { CodeToolName } from "@lucky/tools"
import Tools, { type CodeToolResult } from "@lucky/tools"

export type GoogleMapsResult = {
  businesses: GoogleMapsBusiness[]
  html: string
}

export type SearchMode = "auto" | "multiple" | "single"

export type InputAuto = {
  mode?: "auto" // default when omitted
  query: string
  resultCount: number
  includeDetails?: boolean
}

export type InputMultiple = {
  mode: "multiple"
  query: string | LocationMapLink
  resultCount: number
  includeDetails?: boolean
}

export type InputUrl = {
  mode: "url"
  url: string
}

export type SearchInput = InputAuto | InputMultiple | InputUrl

export type GoogleMapsOptions = {
  proxy?: ProxyResponse
  enableLogging?: boolean
  onlyIncludeWithWebsite?: string // if you want to filter by hostname (e.g. albertheijn.nl, ...), you can put it here
  concurrency?: number // for detail-scrape pooling (default 3)
}

const toolName: CodeToolName = "searchGoogleMaps"

export async function searchGoogleMaps(
  input: SearchInput,
  options: GoogleMapsOptions = {},
): Promise<CodeToolResult<GoogleMapsResult>> {
  const { proxy, enableLogging = false, onlyIncludeWithWebsite, concurrency = 3 } = options

  const { browser, page } = await setupPage(proxy)

  try {
    if (input.mode === "url") {
      await page.goto(input.url, { waitUntil: "networkidle2" })
    } else {
      const navArgs = typeof input.query === "string" ? { query: input.query } : { locationMapLink: input.query }
      await navigateToGoogleMaps(page, navArgs)
    }
  } catch (err) {
    await cleanupBrowser(browser)
    return Tools.createFailure(toolName, {
      location: "searchGoogleMaps:navigation",
      error: err,
    })
  }

  const isFeed = input.mode !== "url" && (await detectFeed(page))

  if (isFeed) {
    return await handleMultipleFeed({
      page,
      browser,
      input,
      proxy,
      enableLogging,
      onlyIncludeWithWebsite,
      concurrency,
    })
  }

  // we know it is not a feed, so we can scrape the detail page

  const html = await page.content()
  const singleRes = await searchSingleBusiness(html, page.url(), enableLogging)
  await cleanupBrowser(browser)

  if (!singleRes.success) return singleRes

  let bizArr: GoogleMapsBusiness[] =
    singleRes.output.businesses.length > 0 ? [sanitizeJSON<GoogleMapsBusiness>(singleRes.output.businesses[0])] : []
  if (onlyIncludeWithWebsite) {
    bizArr = bizArr.filter(
      b => b.bizWebsite && normalizeHostname(b.bizWebsite) === normalizeHostname(onlyIncludeWithWebsite),
    )
  }

  return Tools.createSuccess<GoogleMapsResult>(toolName, {
    businesses: bizArr,
    html,
  })
}
