/**
 * Lucky Client - Native TypeScript implementation for Lucky web scraping API
 * Replaces @mendable/firecrawl-js with our own system
 */

export interface LuckyConfig {
  apiKey?: string
  apiUrl?: string
}

export interface LuckyDocument {
  url?: string
  title?: string
  description?: string
  markdown?: string
  html?: string
  rawHtml?: string
  links?: string[]
  screenshot?: string
  actions?: any
  metadata?: Record<string, any>
}

export interface ScrapeResponse {
  success: boolean
  data?: LuckyDocument
  error?: string
}

export interface MapResponse {
  success: boolean
  links?: string[]
  error?: string
}

export interface SearchResponse {
  success: boolean
  data?: LuckyDocument[]
  error?: string
}

export interface CrawlResponse {
  success: boolean
  id?: string
  url?: string
  error?: string
}

export interface CrawlStatusResponse {
  success: boolean
  status?: "scraping" | "completed" | "failed"
  completed?: number
  total?: number
  creditsUsed?: number
  expiresAt?: Date
  data?: LuckyDocument[]
  error?: string
}

export interface ExtractResponse {
  success: boolean
  data?: any
  error?: string
}

export interface BatchScrapeResponse {
  success: boolean
  id?: string
  error?: string
}

export interface BatchScrapeStatusResponse {
  success: boolean
  status?: "processing" | "completed" | "failed"
  completed?: number
  total?: number
  creditsUsed?: number
  expiresAt?: Date
  data?: LuckyDocument[]
  error?: string
}

/**
 * LuckyApp - Main client for Lucky web scraping API
 * Compatible interface with FirecrawlApp for easy migration
 */
export default class LuckyApp {
  private apiKey?: string
  private apiUrl: string

  constructor(config?: LuckyConfig) {
    this.apiKey = config?.apiKey
    this.apiUrl = config?.apiUrl || process.env.LUCKY_API_URL || "https://api.lucky.dev"
  }

  /**
   * Scrape a single URL
   */
  async scrape(url: string, options?: any): Promise<ScrapeResponse> {
    return this.request("/scrape", {
      url,
      ...options,
    })
  }

  /**
   * Map a website to discover URLs
   */
  async map(url: string, options?: any): Promise<MapResponse> {
    return this.request("/map", {
      url,
      ...options,
    })
  }

  /**
   * Search the web
   */
  async search(query: string, options?: any): Promise<SearchResponse> {
    return this.request("/search", {
      query,
      ...options,
    })
  }

  /**
   * Start a crawl job
   */
  async crawl(url: string, options?: any): Promise<CrawlResponse> {
    return this.request("/crawl", {
      url,
      ...options,
    })
  }

  /**
   * Check crawl job status
   */
  async getCrawlStatus(id: string): Promise<CrawlStatusResponse> {
    return this.request(`/crawl/${id}`)
  }

  /**
   * Extract structured data
   */
  async extract(options: any): Promise<ExtractResponse> {
    return this.request("/extract", options)
  }

  /**
   * Batch scrape multiple URLs
   */
  async asyncBatchScrapeUrls(urls: string[], options?: any): Promise<BatchScrapeResponse> {
    return this.request("/batch/scrape", {
      urls,
      ...options,
    })
  }

  /**
   * Check batch scrape status
   */
  async checkBatchScrapeStatus(id: string): Promise<BatchScrapeStatusResponse> {
    return this.request(`/batch/scrape/${id}`)
  }

  /**
   * Internal request handler
   */
  private async request(endpoint: string, body?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(url, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        }
      }

      return await response.json()
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
