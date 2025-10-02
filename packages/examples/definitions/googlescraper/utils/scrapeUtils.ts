import { setupBrowser } from "@examples/definitions/googlescraper/main/util"
import type { ProxyResponse } from "@examples/definitions/googlescraper/utils/proxies"
import { Utils } from "@examples/definitions/googlescraper/utils/userAgent"
import type { Page } from "puppeteer"
import type { Browser } from "puppeteer"

export async function setupPage(proxy?: ProxyResponse): Promise<{ browser: Browser; page: Page }> {
  const { browser } = await setupBrowser(proxy)
  const page = await browser.newPage()
  if (proxy)
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    })
  await page.setUserAgent(Utils.UserAgents[Math.floor(Math.random() * Utils.UserAgents.length)])
  return { browser, page }
}

// Detect if current page is a list/feed
export async function detectFeed(page: Page): Promise<boolean> {
  return (await page.$('div[role="feed"]')) !== null
}
