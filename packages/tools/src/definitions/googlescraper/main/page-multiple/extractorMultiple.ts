import Tools, { type CodeToolResult } from "@lucky/tools"
import type { CodeToolName } from "@lucky/tools"
import { isNir } from "@lucky/shared"
import { lgg } from "@core/utils/logging/Logger"
import type { GoogleMapsResult } from "@lucky/tools/definitions/googlescraper/main/main"
import type { GoogleMapsBusiness } from "@lucky/tools/definitions/googlescraper/main/types/GoogleMapsBusiness"
import * as cheerio from "cheerio"

const toolName: CodeToolName = "searchGoogleMaps"

export async function searchMultipleBusinesses(
  html: string,
  resultCount: number = 10,
  enableLogging: boolean = false,
): Promise<CodeToolResult<GoogleMapsResult>> {
  try {
    const businesses: GoogleMapsBusiness[] = []

    // multiple businesses page parsing
    const $ = cheerio.load(html)
    const aTags = $("a")
    const parents: any[] = []

    aTags.each((i, el) => {
      const href = $(el).attr("href")
      if (!href) {
        return
      }
      if (href.includes("/maps/place/")) {
        parents.push($(el).parent())
      }
    })

    parents.forEach(parent => {
      // remove all google symbols elements from the entire parent
      parent.find(".google-symbols").remove()
      parent.find("[class*='google-symbols']").remove()
      parent.find("*:has(.google-symbols)").remove()

      const url = parent.find("a").attr("href")
      // get a tag where data-value="Website"
      const website = parent.find('a[data-value="Website"]').attr("href")
      // find a div that includes the class fontHeadlineSmall
      const storeName = parent.find("div.fontHeadlineSmall").text()
      // find span that includes class fontBodyMedium
      const ratingText = parent.find("span.fontBodyMedium > span").attr("aria-label")

      // get the first div that includes the class fontBodyMedium
      const bodyDiv = parent.find("div.fontBodyMedium").first()
      const children = bodyDiv.children()
      const lastChild = children.last()
      const firstOfLast = lastChild.children().first()
      const lastOfLast = lastChild.children().last()
      const phone = lastOfLast?.text()?.split("·")?.[1]?.trim()

      let address = firstOfLast?.text()?.split("·")?.[1]?.trim()

      if (isNir(address)) {
        const addressDiv = parent.find(".W4Efsd .W4Efsd span[aria-hidden='true']").next()
        address = addressDiv.text().trim()
      }

      // note: google maps multiple results only provide partial addresses (street names)
      // full addresses with postal codes and cities are only available in detail pages
      // use includeDetails: true option to get complete address information

      // weird behavior, but sometimes the phone number is included in the address
      const finalPhone = sanitize(address.replace(phone ?? "", ""))

      businesses.push({
        placeId: `ChI${url?.split("?")?.[0]?.split("ChI")?.[1]}`,
        address: finalPhone,
        category: firstOfLast?.text()?.split("·")?.[0]?.trim(),
        status: "",
        phone: phone ? sanitize(phone) : undefined,
        googleUrl: url,
        bizWebsite: website,
        storeName: sanitize(storeName),
        ratingText,
        stars: ratingText?.split("stars")?.[0]?.trim() || null,
        numberOfReviews: ratingText?.split("stars")?.[1]?.replace("Reviews", "")?.trim()
          ? Number(ratingText?.split("stars")?.[1]?.replace("Reviews", "")?.trim())
          : null,
        mainImage: undefined,
        hours: null,
      })
    })

    if (enableLogging) lgg.info(`parsed businesses:`, JSON.stringify(businesses, null, 2))

    // limit results to the requested count
    const limitedBusinesses = businesses.slice(0, resultCount)
    if (enableLogging) {
      lgg.log(
        `📊 Found ${businesses.length} businesses, returning ${limitedBusinesses.length} (requested: ${resultCount})`,
      )
    }

    return Tools.createSuccess(toolName, {
      businesses: limitedBusinesses,
      html,
    })
  } catch (error) {
    if (enableLogging) {
      lgg.error("error at multiple businesses search", error instanceof Error ? error.message : String(error))
    }
    return Tools.createFailure(toolName, {
      location: "searchMultipleBusinesses",
      error: error,
    })
  }
}

const sanitize = (address: string) => {
  return address.replace(/·/g, " ").replace(/\n/g, "").replace(/\s+/g, " ").trim()
}
