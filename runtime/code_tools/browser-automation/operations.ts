import type { Page } from "puppeteer"
import type { InputType } from "./main"

export async function handleNavigate(page: Page, input: InputType): Promise<any> {
  if (!input.url) {
    throw new Error("URL is required for navigate operation")
  }

  await page.goto(input.url, { waitUntil: "networkidle2" })
  const html = await page.content()
  const url = page.url()

  return { html, url, success: true }
}

export async function handleClick(_page: Page, _input: InputType): Promise<any> {
  // if (!input.selector) {
  //   throw new Error("Selector is required for click operation")
  // }
  // await page.waitForSelector(input.selector, { timeout: 10000 })
  // await page.click(input.selector)
  // return { success: true, data: { clicked: input.selector } }
}

export async function handleWaitFor(_page: Page, _input: InputType): Promise<any> {
  // if (!input.waitTime) {
  //   throw new Error("waitTime is required for waitFor operation")
  // }
  // const { type, value, timeout = 5000 } = input
  // switch (type) {
  //   case "element":
  //     if (!value) throw new Error("value is required for element wait")
  //     await page.waitForSelector(value, { timeout })
  //     break
  //   case "network":
  //     await page.waitForNavigation({ waitUntil: "networkidle2", timeout })
  //     break
  //   case "timeout":
  //     const waitTime = value ? parseInt(value) : timeout
  //     await new Promise((resolve) => setTimeout(resolve, waitTime))
  //     break
  //   case "custom":
  //     if (!value) throw new Error("value is required for custom wait")
  //     await page.waitForFunction(value, { timeout })
  //     break
  // }
  // return { success: true, data: { waitedFor: input.waitCondition } }
}

export async function handleCheckElement(_page: Page, _input: InputType): Promise<any> {
  // if (!input.selector) {
  //   throw new Error("Selector is required for checkElement operation")
  // }
  // const element = await page.$(input.selector)
  // const exists = !!element
  // let elementData: any = { exists, selector: input.selector }
  // if (exists && element) {
  //   const text = await element.evaluate((el) => el.textContent?.trim())
  //   const isVisible = await element.isVisible()
  //   const attributes = await element.evaluate((el) => {
  //     const attrs: Record<string, string> = {}
  //     for (const attr of el.attributes) {
  //       attrs[attr.name] = attr.value
  //     }
  //     return attrs
  //   })
  //   elementData = {
  //     ...elementData,
  //     text,
  //     isVisible,
  //     attributes,
  //   }
  // }
  // // check against expected state if provided
  // if (input.expectedState) {
  //   const matches = Object.entries(input.expectedState).every(
  //     ([key, expectedValue]) => {
  //       return elementData[key] === expectedValue
  //     }
  //   )
  //   elementData.matchesExpectedState = matches
  // }
  // return { success: true, data: elementData }
}

export async function handleGetPageInfo(_page: Page): Promise<any> {
  // const title = await page.title()
  // const url = page.url()
  // const html = await page.content()
  // // get basic page metrics
  // const metrics = await page.metrics()
  // // get viewport size
  // const viewport = page.viewport()
  // // get all links
  // const links = await page.evaluate(() => {
  //   return Array.from(document.querySelectorAll("a[href]")).map((a) => ({
  //     text: a.textContent?.trim(),
  //     href: (a as HTMLAnchorElement).href,
  //   }))
  // })
  // // get all forms
  // const forms = await page.evaluate(() => {
  //   return Array.from(document.querySelectorAll("form")).map((form) => ({
  //     action: form.action,
  //     method: form.method,
  //     inputs: Array.from(form.querySelectorAll("input, select, textarea")).map(
  //       (input) => ({
  //         name: input.getAttribute("name"),
  //         type: input.getAttribute("type"),
  //         required: input.hasAttribute("required"),
  //       })
  //     ),
  //   }))
  // })
  // return {
  //   success: true,
  //   data: {
  //     title,
  //     url,
  //     viewport,
  //     metrics,
  //     links: links.slice(0, 20), // limit to prevent huge responses
  //     forms,
  //     htmlLength: html.length,
  //   },
  // }
}

export async function handleExecuteScript(_page: Page, _input: InputType): Promise<any> {
  // if (!input.script) {
  //   throw new Error("Script is required for executeScript operation")
  // }
  // const result = await page.evaluate(input.script)
  // return { success: true, data: { result } }
}
