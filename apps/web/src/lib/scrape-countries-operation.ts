import { lgg } from "@core/utils/logging/Logger"
import * as cheerio from "cheerio"

export interface CountriesOperationResult {
  countries: string[]
  error?: string
}

export interface ScrapingOptions {
  userAgent?: string
  timeout?: number
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

/**
 * extracts countries of operation from a webpage by looking for "operates in" section
 */
export async function extractCountriesOperation(
  url: string,
  options: ScrapingOptions = {},
): Promise<CountriesOperationResult> {
  try {
    const { userAgent = DEFAULT_USER_AGENT, timeout = 10000 } = options

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        countries: [],
        error: `failed to fetch url: ${response.statusText}`,
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const countries: string[] = []

    // look for the "operates in" section and extract countries
    $("span").each((_, element) => {
      const spanText = $(element).text().trim()
      if (spanText === "Operates In") {
        // find the parent div and look for country paragraphs
        const parentDiv = $(element).parent()
        const countryElements = parentDiv.find("p.inline")

        countryElements.each((_, countryElement) => {
          const countryName = $(countryElement).text().trim()
          if (countryName && !countries.includes(countryName)) {
            countries.push(countryName)
          }
        })
      }
    })

    return { countries }
  } catch (error) {
    lgg.error("error extracting countries operation:", error)

    if (error instanceof Error && error.name === "AbortError") {
      return {
        countries: [],
        error: "request timeout",
      }
    }

    return {
      countries: [],
      error: "failed to process the request",
    }
  }
}
