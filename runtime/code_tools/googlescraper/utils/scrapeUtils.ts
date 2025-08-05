import { setupBrowser } from "@runtime/code_tools/googlescraper/main/util"
import type { ProxyResponse } from "@runtime/code_tools/googlescraper/utils/proxies"
import { Utils } from "@runtime/code_tools/googlescraper/utils/userAgent"
import type { Page } from "puppeteer"
import { Browser } from "puppeteer"

export async function setupPage(
  proxy?: ProxyResponse
): Promise<{ browser: Browser; page: Page }> {
  const { browser } = await setupBrowser(proxy)
  const page = await browser.newPage()
  if (proxy)
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    })
  await page.setUserAgent(
    Utils.UserAgents[Math.floor(Math.random() * Utils.UserAgents.length)]
  )
  return { browser, page }
}

// Detect if current page is a list/feed
export async function detectFeed(page: Page): Promise<boolean> {
  return (await page.$('div[role="feed"]')) !== null
}
