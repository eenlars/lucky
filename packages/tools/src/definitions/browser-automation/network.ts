import { lgg } from "@core/utils/logging/Logger"
import { randomUserAgents } from "@lucky/tools/definitions/browser-automation/constants"
import { saveInLoc } from "@lucky/tools/definitions/file-saver/save"
import type { ProxyResponse } from "@lucky/tools/definitions/googlescraper/main"
import { PATHS } from "../../config/runtime"
import type { HTTPRequest, HTTPResponse, Page } from "puppeteer"
import puppeteer from "puppeteer"
import { z } from "zod"

// network request summary structure
type NetworkRequestSummary = {
  id: string
  url: string
  method: string
  resourceType: string
  status?: number
  statusText?: string
  timestamp: number
  duration?: number
  headers: Record<string, string>
  size?: number
  fromCache?: boolean
  redirected?: boolean
  errorText?: string
  responseBody?: string
  responseHeaders?: Record<string, string>
}

type NetworkMonitorOutput = {
  url: string
  success: boolean
  requestCount: number
  requests: NetworkRequestSummary[]
  sessionId?: string
  statistics: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    cachedRequests: number
    redirectedRequests: number
    averageResponseTime: number
    totalSize: number
    resourceTypes: Record<string, number>
    statusCodes: Record<string, number>
  }
  error?: string
}

// default excluded resource types and url patterns
const DEFAULT_EXCLUDED_TYPES = ["image", "stylesheet", "font", "script", "media", "websocket", "eventsource"] as const

const DEFAULT_EXCLUDED_URL_PATTERNS = [
  // file extensions
  /\.(css|js|svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)(\?.*)?$/i,
  // monitoring and analytics
  /google-analytics|googletagmanager|facebook\.com\/tr|doubleclick|adsystem|outbrain|taboola|hotjar|mixpanel|segment\.com|amplitude|intercom|zendesk|drift/i,
  // metrics and tracking
  /metrics|analytics|tracking|beacon|pixel|collect|stats|telemetry/i,
  // cookies and consent
  /cookiebot|onetrust|trustarc|cookielaw|cookie.*consent|gdpr/i,
  // cdn and static assets
  /demandware\.static.*\.(svg|png|jpg|jpeg|gif|css|js)/i,
] as const

export const inputSchemaNetworkMonitor = z.object({
  url: z.string(),
  waitTime: z.number().nullish().default(5000),
  includeTypes: z.array(z.string()).nullish(),
  excludeTypes: z.array(z.string()).nullish(),
  maxRequests: z.number().nullish().default(100),
  maxResponseSize: z
    .number()
    .nullish()
    .default(1024 * 1024), // 1mb default
})

export type NetworkMonitorInput = z.infer<typeof inputSchemaNetworkMonitor>

// simplified browser setup without stealth plugin
async function setupSimpleBrowser(proxy?: ProxyResponse): Promise<{
  browser: any
}> {
  const launchOptions: any = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }

  // set proxy at browser level
  if (proxy) {
    launchOptions.args.push(`--proxy-server=${proxy.ip}:${proxy.port}`)
  }

  const browser = await puppeteer.launch(launchOptions)
  return { browser }
}

export async function networkMonitor(input: NetworkMonitorInput, proxy?: ProxyResponse): Promise<NetworkMonitorOutput> {
  let browser: any = null
  const requests: Map<string, NetworkRequestSummary> = new Map()
  let requestCounter = 0

  try {
    // ensure defaults are applied
    const processedInput = {
      ...input,
      maxResponseSize: input.maxResponseSize ?? 1024 * 1024, // 1mb default
      maxRequests: input.maxRequests ?? 100,
      waitTime: input.waitTime ?? 5000,
    }

    // generate session id for this monitoring session
    const sessionId = generateTimestampId()
    lgg.log(`network monitoring session: ${sessionId}`)

    // use simplified browser setup instead
    const { browser: browserInstance } = await setupSimpleBrowser(proxy)
    browser = browserInstance

    const page = await browser.newPage()

    if (proxy) {
      await page.authenticate({
        username: proxy.username,
        password: proxy.password,
      })
    }

    await page.setUserAgent(randomUserAgents[Math.floor(Math.random() * randomUserAgents.length)])

    // enable request interception
    await page.setRequestInterception(true)

    // set up network listeners
    setupNetworkListeners(page, requests, processedInput, sessionId, () => ++requestCounter)

    // navigate to the target url
    await page.goto(processedInput.url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    // wait for additional network activity
    await new Promise(resolve => setTimeout(resolve, processedInput.waitTime))

    // compile the results
    const requestArray = Array.from(requests.values())
    const statistics = calculateStatistics(requestArray)

    const result: NetworkMonitorOutput = {
      url: processedInput.url,
      success: true,
      requestCount: requestArray.length,
      requests: requestArray,
      sessionId,
      statistics,
    }

    lgg.log("result", result)

    // save to file if requested
    saveInLoc(
      `${PATHS.runtime}/logging_folder/network/network-monitor-output-${sessionId}.json`,
      JSON.stringify(result, null, 2),
    )

    await cleanupSimpleBrowser(browser)
    return result
  } catch (error) {
    if (browser) {
      await cleanupSimpleBrowser(browser)
    }

    lgg.error("error in networkMonitor", error instanceof Error ? error.message : String(error))

    const errorResult: NetworkMonitorOutput = {
      url: input.url,
      success: false,
      requestCount: requests.size,
      requests: Array.from(requests.values()),
      statistics: calculateStatistics(Array.from(requests.values())),
      error: error instanceof Error ? error.message : String(error),
    }

    return errorResult
  }
}

async function cleanupSimpleBrowser(browser: any) {
  const pages = await browser.pages()
  await Promise.all(pages.map((page: Page) => page.close()))
  await browser.close()
}

function setupNetworkListeners(
  page: Page,
  requests: Map<string, NetworkRequestSummary>,
  input: NetworkMonitorInput & { maxResponseSize: number; maxRequests: number },
  sessionId: string,
  getNextId: () => number,
): void {
  // handle request initiated
  page.on("request", (request: HTTPRequest) => {
    if (requests.size >= input.maxRequests) {
      request.continue()
      return
    }

    const resourceType = request.resourceType()
    const url = request.url()

    // filter out the original url request
    if (url === input.url) {
      request.continue()
      return
    }

    // combine default excludes with user-provided excludes
    const excludeTypes = [...DEFAULT_EXCLUDED_TYPES, ...(input.excludeTypes || [])]

    // filter by resource type
    if (excludeTypes.includes(resourceType)) {
      request.continue()
      return
    }

    // filter by url patterns
    if (DEFAULT_EXCLUDED_URL_PATTERNS.some(pattern => pattern.test(url))) {
      request.continue()
      return
    }

    // filter by included types (if specified)
    if (input.includeTypes && !input.includeTypes.includes(resourceType)) {
      request.continue()
      return
    }

    const id = `req_${getNextId()}`
    const requestSummary: NetworkRequestSummary = {
      id,
      url: request.url(),
      method: request.method(),
      resourceType,
      timestamp: Date.now(),
      headers: request.headers(),
      fromCache: false,
      redirected: request.redirectChain().length > 0,
    }

    requests.set(id, requestSummary)
    request.continue()
  })

  // handle response received
  page.on("response", (response: HTTPResponse) => {
    const request = response.request()
    const existingRequest = Array.from(requests.values()).find(
      req => req.url === request.url() && req.method === request.method(),
    )

    if (existingRequest) {
      existingRequest.status = response.status()
      existingRequest.statusText = response.statusText()
      existingRequest.duration = Date.now() - existingRequest.timestamp
      existingRequest.fromCache = response.fromCache()
      existingRequest.responseHeaders = response.headers()

      // capture response body with size limit
      response
        .buffer()
        .then(buffer => {
          existingRequest.size = buffer.length

          // convert buffer to string for line counting
          let bodyContent: string
          try {
            bodyContent = buffer.toString("utf-8")
          } catch (error) {
            // if utf-8 decode fails, use base64
            bodyContent = buffer.toString("base64")
          }

          // count lines and skip if too few
          const lineCount = bodyContent.split("\n").length
          if (lineCount < 10) {
            // remove this request from the map as it has too little content
            requests.delete(existingRequest.id)
            return
          }

          // save response body to file
          const filePath = saveResponseBody(input.url, sessionId, existingRequest.id, existingRequest.url, bodyContent)
          // store file path and preview in response body field
          const previewLength = 300
          const previewHeader = `[saved to: ${filePath}]\n\n`

          if (buffer.length <= input.maxResponseSize) {
            existingRequest.responseBody = `${previewHeader}${bodyContent}`
          } else {
            try {
              // show preview with truncation note
              const preview = buffer.slice(0, previewLength).toString("utf-8")
              const truncationNote = `... [truncated: showing first ${previewLength} chars of ${buffer.length} total bytes]`
              existingRequest.responseBody = `${previewHeader}${preview}${truncationNote}`
            } catch (error) {
              // fallback to base64 preview if utf-8 fails
              const preview = buffer.slice(0, previewLength).toString("base64")
              const truncationNote = `... [truncated base64: showing first ${previewLength} chars of ${buffer.length} total bytes]`
              existingRequest.responseBody = `${previewHeader}${preview}${truncationNote}`
            }
          }
        })
        .catch(() => {
          // ignore errors getting response size
        })
    }
  })

  // handle request failed
  page.on("requestfailed", (request: HTTPRequest) => {
    const existingRequest = Array.from(requests.values()).find(
      req => req.url === request.url() && req.method === request.method(),
    )

    if (existingRequest) {
      existingRequest.errorText = request.failure()?.errorText || "unknown error"
      existingRequest.duration = Date.now() - existingRequest.timestamp
    }
  })
}

function calculateStatistics(requests: NetworkRequestSummary[]) {
  const stats = {
    totalRequests: requests.length,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    redirectedRequests: 0,
    averageResponseTime: 0,
    totalSize: 0,
    resourceTypes: {} as Record<string, number>,
    statusCodes: {} as Record<string, number>,
  }

  let totalDuration = 0
  let requestsWithDuration = 0

  for (const request of requests) {
    // count resource types
    stats.resourceTypes[request.resourceType] = (stats.resourceTypes[request.resourceType] || 0) + 1

    // count status codes
    if (request.status) {
      const statusCode = request.status.toString()
      stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1

      if (request.status >= 200 && request.status < 400) {
        stats.successfulRequests++
      } else {
        stats.failedRequests++
      }
    } else if (request.errorText) {
      stats.failedRequests++
    }

    // count cached and redirected requests
    if (request.fromCache) stats.cachedRequests++
    if (request.redirected) stats.redirectedRequests++

    // calculate size
    if (request.size) stats.totalSize += request.size

    // calculate average response time
    if (request.duration) {
      totalDuration += request.duration
      requestsWithDuration++
    }
  }

  if (requestsWithDuration > 0) {
    stats.averageResponseTime = Math.round(totalDuration / requestsWithDuration)
  }

  return stats
}

// helper function to generate timestamp-based folder id
function generateTimestampId(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  const seconds = now.getSeconds().toString().padStart(2, "0")
  const day = now.getDate().toString().padStart(2, "0")
  const month = (now.getMonth() + 1).toString().padStart(2, "0")
  const year = now.getFullYear()

  return `${hours}:${minutes}:${seconds}-${day}-${month}-${year}`
}

// helper function to convert url to safe folder name
function urlToFolderName(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
      .replace(/^www\./, "") // remove www prefix
      .replace(/\./g, "-") // replace dots with dashes
      .replace(/[^a-zA-Z0-9\-]/g, "") // remove any other special chars
      .toLowerCase()
  } catch (error) {
    // fallback if url parsing fails
    return url
      .replace(/https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/[^a-zA-Z0-9\-]/g, "-")
      .toLowerCase()
      .substring(0, 50) // limit length
  }
}

// helper function to save response body to file
function saveResponseBody(
  mainUrl: string,
  sessionId: string,
  requestId: string,
  requestUrl: string,
  body: string,
): string {
  const urlFolderName = urlToFolderName(mainUrl)
  const folderPath = `${PATHS.runtime}/logging_folder/network/responses/${urlFolderName}/${sessionId}`

  // create safe filename from request url
  const safeUrl = requestUrl
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9\-_\.]/g, "_")
    .substring(0, 100) // limit length

  const filename = `${requestId}_${safeUrl}.txt`
  const fullPath = `${folderPath}/${filename}`

  try {
    saveInLoc(fullPath, body)
    return fullPath
  } catch (error) {
    lgg.error(`failed to save response body for ${requestId}:`, error)
    return ""
  }
}
