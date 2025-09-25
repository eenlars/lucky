type FetcherOptions = {
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  retryDelay?: number
}

type FetcherResult = {
  json: () => Promise<any>
  text: () => Promise<string>
  status: number
  statusText: string
  headers: Headers
}

const defaultOptions: Required<FetcherOptions> = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  },
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second base delay
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function fetcher(url: string, options: FetcherOptions = {}): Promise<FetcherResult> {
  const config = { ...defaultOptions, ...options }

  // validate url
  try {
    new URL(url)
  } catch {
    throw new Error(`invalid url: ${url}`)
  }

  let lastError: Error

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          headers: config.headers,
          cache: "no-store",
        },
        config.timeout
      )

      // return result even for non-ok responses, let caller decide what to do
      return {
        json: async () => {
          const text = await response.text()
          try {
            return JSON.parse(text)
          } catch {
            throw new Error(`invalid json response from ${url}`)
          }
        },
        text: async () => {
          return await response.text()
        },
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // don't retry on certain errors
      if (lastError.message.includes("invalid url") || lastError.message.includes("TypeError: Failed to fetch")) {
        break
      }

      // if this isn't the last attempt, wait and retry
      if (attempt < config.retries) {
        const delay = config.retryDelay * Math.pow(2, attempt) // exponential backoff
        await sleep(delay)
        continue
      }
    }
  }

  throw new Error(`failed to fetch ${url} after ${config.retries + 1} attempts: ${lastError!.message}`)
}
