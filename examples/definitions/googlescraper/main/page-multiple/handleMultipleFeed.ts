import type { GoogleMapsResult, InputAuto, InputMultiple } from "@examples/definitions/googlescraper/main/main"
import { scrapeDetailPage } from "@examples/definitions/googlescraper/main/page-detail/extractDetailPage"
import { searchMultipleBusinesses } from "@examples/definitions/googlescraper/main/page-multiple/extractorMultiple"
import type { GoogleMapsBusiness } from "@examples/definitions/googlescraper/main/types/GoogleMapsBusiness"
import { autoScroll, cleanupBrowser, sanitizeJSON } from "@examples/definitions/googlescraper/main/util"
import { normalizeHostname } from "@examples/definitions/googlescraper/utils/hostname"
import type { ProxyResponse } from "@examples/definitions/googlescraper/utils/proxies"
import { isNir } from "@lucky/shared"
import type { CodeToolResult } from "@lucky/tools"
import Tools from "@lucky/tools"
import type { Browser, Page } from "puppeteer"

const toolName = "searchGoogleMaps" as const
/**
 * High-level entry point – runs **only** when a feed with “multiple” mode is requested.
 */
export async function handleMultipleFeed({
  page,
  browser,
  input,
  proxy,
  enableLogging,
  onlyIncludeWithWebsite,
  concurrency,
}: {
  page: Page
  browser: Browser
  input: InputMultiple | InputAuto
  proxy?: ProxyResponse
  enableLogging?: boolean
  onlyIncludeWithWebsite?: string
  concurrency?: number // for detail-scrape pooling (default 3)
}): Promise<CodeToolResult<GoogleMapsResult>> {
  try {
    await autoScroll(page) // 1️⃣ ensure all cards are loaded
    const pageHTML = await page.content() // 2️⃣ snapshot the DOM

    const parse = await searchMultipleBusinesses(pageHTML, input.resultCount, enableLogging)

    if (!parse.success) {
      return parseFailure<GoogleMapsResult>(browser, parse)
    }

    // 3️⃣ transform ⇒ filter ⇒ optionally enrich ⇒ return
    const initial = parse.output.businesses
    const filtered = filterByWebsite(initial, onlyIncludeWithWebsite)
    const final = input.includeDetails ? await enrichWithDetails(filtered, proxy, enableLogging, concurrency) : filtered

    return Tools.createSuccess<GoogleMapsResult>(toolName, {
      businesses: final.length ? final : initial.map(sanitizeJSON<GoogleMapsBusiness>),
      html: pageHTML,
    })
  } finally {
    await cleanupBrowser(browser)
  }
}

/* ──────────────────────────── helpers ──────────────────────────── */

/** Bail early on parse failure and close the browser. */
function parseFailure<T>(browser: Browser, result: CodeToolResult<T>): CodeToolResult<T> {
  // fire-and-forget – no `await` needed because we’re returning afterwards
  cleanupBrowser(browser)
  return Tools.createFailure(toolName, {
    location: "handleMultipleFeed:parseFailure",
    error: result.error,
  })
}

/** Keep only businesses whose website hostname matches `onlyIncludeWithWebsite`. */
function filterByWebsite(businesses: GoogleMapsBusiness[], onlyIncludeWithWebsite?: string): GoogleMapsBusiness[] {
  if (!onlyIncludeWithWebsite) return businesses

  const targetHost = normalizeHostname(onlyIncludeWithWebsite)
  return businesses.filter(b => b.bizWebsite && normalizeHostname(b.bizWebsite) === targetHost)
}

/** Fetch detail pages in parallel and merge them back into the original list. */
async function enrichWithDetails(
  list: GoogleMapsBusiness[],
  proxy?: ProxyResponse,
  enableLogging?: boolean,
  concurrency?: number, // for detail-scrape pooling (default 3)
): Promise<GoogleMapsBusiness[]> {
  const googleUrls = list
    .map(b => b.googleUrl)
    .filter(Boolean)
    .filter(url => !isNir(url))

  // process urls in batches of 3 with timeout
  const batchSize = concurrency ?? 3
  const results: PromiseSettledResult<any>[] = []

  // add a small timeout between batches to avoid rate limiting
  for (let i = 0; i < googleUrls.length; i += batchSize) {
    const batch = googleUrls.slice(i, i + batchSize)
    const batchPromises = batch.map(googleUrl => scrapeDetailPage(googleUrl, proxy, enableLogging))

    const batchResults = await Promise.allSettled(batchPromises)
    results.push(...batchResults)

    // small timeout between batches
    if (i + batchSize < googleUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Build a lookup from googleUrl → detailed business
  const enriched = new Map<string, GoogleMapsBusiness>()

  results.filter(isFulfilled).forEach(result => {
    if (result.value.business) {
      enriched.set(result.value.business.googleUrl!, result.value.business)
    }
  })

  return list.map(b => enriched.get(b.googleUrl!) ?? b)
}

/** Type-guard for `PromiseSettledResult<T>` → `PromiseFulfilledResult<T>` */
function isFulfilled<T>(r: PromiseSettledResult<T>): r is PromiseFulfilledResult<T> {
  return r.status === "fulfilled"
}
