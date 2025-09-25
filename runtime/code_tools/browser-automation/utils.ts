import type { Page } from "puppeteer"

export async function waitForPageLoad(page: Page, timeout = 30000): Promise<void> {
  await page
    .waitForNavigation({
      waitUntil: "networkidle2",
      timeout,
    })
    .catch(() => {
      // ignore timeout errors, page might already be loaded
    })
}

export async function scrollToElement(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const element = document.querySelector(sel)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, selector)
}

export async function getElementRect(
  page: Page,
  selector: string
): Promise<{
  x: number
  y: number
  width: number
  height: number
} | null> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel)
    if (!element) return null

    const rect = element.getBoundingClientRect()
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  }, selector)
}

export async function takeScreenshot(
  page: Page,
  options?: {
    selector?: string
    fullPage?: boolean
  }
): Promise<Uint8Array> {
  if (options?.selector) {
    const element = await page.$(options.selector)
    if (!element) {
      throw new Error(`Element not found: ${options.selector}`)
    }
    return await element.screenshot()
  }

  return await page.screenshot({
    fullPage: options?.fullPage ?? false,
  })
}

export async function fillForm(page: Page, formData: Record<string, string>): Promise<void> {
  for (const [selector, value] of Object.entries(formData)) {
    await page.waitForSelector(selector, { timeout: 5000 })
    await page.focus(selector)
    await page.evaluate((sel) => {
      const element = document.querySelector(sel) as HTMLInputElement
      if (element) element.value = ""
    }, selector)
    await page?.type(selector, value)
  }
}

export async function selectOption(page: Page, selector: string, value: string): Promise<void> {
  await page.select(selector, value)
}

export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel)
    if (!element) return false

    const style = window.getComputedStyle(element)
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0"
  }, selector)
}
