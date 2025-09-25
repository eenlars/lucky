import { lgg } from "@core/utils/logging/Logger"
import type { LocationMapLink } from "@runtime/code_tools/googlescraper/main/data_manager"
import type { ProxyResponse } from "@runtime/code_tools/googlescraper/utils/proxies"
import { type Browser, type CookieData, type Page } from "puppeteer"
import puppeteerExtra from "puppeteer-extra"
import stealthPlugin from "puppeteer-extra-plugin-stealth"

export async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    const wrapper = document.querySelector('div[role="feed"]')

    await new Promise((resolve) => {
      let totalHeight = 0
      const distance = 1000
      const scrollDelay = 2000 // reduced from 3000ms for faster scrolling
      let noChangeCount = 0 // track consecutive scroll attempts with no new content

      const timer = setInterval(async () => {
        const scrollHeightBefore = wrapper?.scrollHeight ?? 0
        wrapper?.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeightBefore && scrollHeightBefore !== undefined) {
          totalHeight = 0
          await new Promise((resolve) => setTimeout(resolve, scrollDelay))

          // Calculate scrollHeight after waiting
          const scrollHeightAfter = wrapper?.scrollHeight

          if (
            scrollHeightAfter !== undefined &&
            scrollHeightBefore !== undefined &&
            scrollHeightAfter > scrollHeightBefore
          ) {
            // More content loaded, keep scrolling
            noChangeCount = 0 // reset counter
            return
          } else {
            // No more content loaded, but give it a few more tries
            noChangeCount++
            if (noChangeCount >= 3) {
              // stop after 3 consecutive scroll attempts with no new content
              clearInterval(timer)
              resolve(void 0)
            }
          }
        }
      }, 200)
    })
  })
}

export async function setupBrowser(proxy?: ProxyResponse): Promise<{
  browser: Browser
}> {
  puppeteerExtra.use(stealthPlugin())

  const launchOptions: any = {
    headless: false,
    executablePath: "", // your path here
  }

  // Set proxy at browser level instead
  if (proxy) {
    launchOptions.args = [`--proxy-server=${proxy.ip}:${proxy.port}`]
  }

  const browser = await puppeteerExtra.launch(launchOptions)

  const cookies: CookieData[] = [
    {
      name: "SOCS",
      value: "CAESHAgCEhJnd3NfMjAyNDA5MjQtMF9SQzIaAmVuIAEaBgiAjt23Bg",
      domain: ".google.com",
      path: "/",
      secure: true,
      sameSite: "Lax",
      expires: new Date("2025-10-28T14:13:10.467Z").getTime(),
    },
  ]

  // check if cookie is not expired, otherwise error
  if (cookies.some((cookie) => cookie.expires && cookie.expires < Date.now())) {
    throw new Error("Cookie expired")
  }
  await browser.setCookie(...cookies)

  return { browser }
}

export async function navigateToGoogleMaps(
  page: Page,
  options:
    | {
        query: string
      }
    | {
        locationMapLink: LocationMapLink
      }
) {
  let fullUrl: string

  if ("query" in options) {
    const mapsParsed = options.query.split(" ").join("+")
    fullUrl = `https://www.google.com/maps/search/${mapsParsed}`
  } else if ("locationMapLink" in options) {
    fullUrl = options.locationMapLink.link
  } else {
    throw new Error("Invalid options")
  }

  try {
    await page.goto(fullUrl)
  } catch (error) {
    lgg.error("error going to page", error)
    throw error
  }

  await page.waitForSelector("div.top-center-stack")
}

export async function cleanupBrowser(browser: any) {
  const pages = await browser.pages()
  await Promise.all(pages.map((page: Page) => page.close()))
  await browser.close()
}

// helper to pull out an integer from a string, or null
export function parseNumber(s?: string) {
  if (!s) return null
  const m = s.match(/(\d+[.,]?\d*)/)
  return m ? Number(m[1].replace(",", ".")) : null
}

export const sanitizeJSON = <T>(json: Record<string, any>): T => {
  const sanitized: Record<string, any> = {}
  for (const [key, value] of Object.entries(json)) {
    if (typeof value === "string") {
      sanitized[key] = value?.replace(/[\n\s]+/g, " ").trim() ?? ""
    } else {
      sanitized[key] = value
    }
  }
  return sanitized as T
}
