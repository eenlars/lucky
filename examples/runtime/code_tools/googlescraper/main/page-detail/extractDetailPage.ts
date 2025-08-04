import { lgg } from "@/logger"
import type { GoogleMapsResult } from "@/runtime/code_tools/googlescraper/main/main"
import type { GoogleMapsBusiness } from "@/runtime/code_tools/googlescraper/main/types/GoogleMapsBusiness"
import {
  cleanupBrowser,
  parseNumber,
  sanitizeJSON,
} from "@/runtime/code_tools/googlescraper/main/util"
import { parseHours } from "@/runtime/code_tools/googlescraper/utils/extractHours"
import type { ProxyResponse } from "@/runtime/code_tools/googlescraper/utils/proxies"
import { setupPage } from "@/runtime/code_tools/googlescraper/utils/scrapeUtils"
import Tools, { type CodeToolResult } from "@tools/code/output.types"
import type { CodeToolName } from "@tools/tool.types"
import * as cheerio from "cheerio"

const toolName: CodeToolName = "searchGoogleMaps"

export async function searchSingleBusiness(
  html: string,
  pageUrl: string,
  enableLogging: boolean = false
): Promise<CodeToolResult<GoogleMapsResult>> {
  try {
    if (enableLogging) {
      lgg.log("searchSingleBusiness: starting single business search")
    }

    let business: GoogleMapsBusiness | null = null

    // single business page parsing
    const $ = cheerio.load(html)

    // 1. name
    const main = $('div[role="main"][aria-label]')
    const storeName = main.attr("aria-label") || null
    const mainImage =
      main.find("img[decoding='async']").first().attr("src") || null

    // 2. rating & reviews via aria-labels on their icons
    const stars = $(".fontDisplayLarge").text() || null

    const reviewsLabel =
      $('span[aria-label$="reviews"]').attr("aria-label") || null
    const numberOfReviews = parseNumber(reviewsLabel ?? undefined)

    // 3. website, phone, address, category, status
    const bizWebsite = $('a[data-item-id="authority"]').attr("href") || null

    const phoneLabel =
      $('button[data-item-id^="phone:"]').attr("aria-label") || ""
    const phone = phoneLabel.replace(/^Phone:\s*/, "").trim() || null

    const addressLabel =
      $('button[data-item-id="address"]').attr("aria-label") || ""
    const address = addressLabel.replace(/^Address:\s*/, "").trim() || null

    const category = $('button[jsaction*="category"]').text().trim() || null

    // hours/status button: "Closed ⋅ Opens 9 am Mon"
    const hoursText = $('div[aria-expanded][jsaction*="openhours"] span.ZDu9vd')
      .text()
      .trim()
    const status = hoursText
      ? hoursText.split("⋅").map((s) => s.trim())[0]
      : null

    const hoursTable =
      $("div.fontBodyMedium table.fontBodyMedium").first().parent().html() ||
      null

    const placeIdMatch = pageUrl.match(/ChI[^?&]+/)
    const placeId = placeIdMatch?.[0] ?? null

    const googleUrl =
      $('a[href^="https://www.google.com/maps/place"]').attr("href") ||
      pageUrl ||
      null

    business = {
      placeId: placeId || undefined,
      storeName: storeName || undefined,
      ratingText: undefined,
      stars: stars || null,
      numberOfReviews,
      googleUrl: googleUrl || undefined,
      bizWebsite: bizWebsite || undefined,
      address: address || undefined,
      category: category || undefined,
      status: status || undefined,
      phone: phone || undefined,
      mainImage: mainImage || undefined,
      hours: parseHours(hoursTable),
    }

    return Tools.createSuccess(toolName, {
      businesses: [business],
      html,
    })
  } catch (error) {
    if (enableLogging) {
      lgg.error(
        "error at single business search",
        error instanceof Error ? error.message : String(error)
      )
    }
    return Tools.createFailure(toolName, {
      location: "searchSingleBusiness",
      error: error,
    })
  }
}

// Scrape a single detail URL in its own ephemeral browser
export async function scrapeDetailPage(
  googleUrl: string,
  proxy: ProxyResponse | undefined,
  enableLogging = false
): Promise<{ originalUrl: string; business: GoogleMapsBusiness | null }> {
  try {
    const { browser, page } = await setupPage(proxy)
    await page.goto(googleUrl, { waitUntil: "networkidle2" })
    const html = await page.content()
    const singleRes = await searchSingleBusiness(html, googleUrl, enableLogging)
    await cleanupBrowser(browser)
    return singleRes.success && singleRes.output.businesses.length > 0
      ? {
          originalUrl: googleUrl,
          business: sanitizeJSON<GoogleMapsBusiness>(
            singleRes.output.businesses[0]
          ),
        }
      : { originalUrl: googleUrl, business: null }
  } catch (e) {
    if (enableLogging) lgg.error("scrapeDetailPage", e)
    return { originalUrl: googleUrl, business: null }
  }
}
