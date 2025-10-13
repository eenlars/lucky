import FirecrawlApp from "@mendable/firecrawl-js"
import type {
  BatchScrapeResponse,
  BatchScrapeStatusResponse,
  FirecrawlDocument,
  SearchResponse,
} from "@mendable/firecrawl-js"
import { beforeEach, vi } from "vitest"

// Create mock responses
const mockSearchResponse: SearchResponse = {
  success: true,
  data: [
    {
      url: "https://example.com",
      title: "Test Page",
      description: "Test Description",
      markdown: "# Test Content",
      actions: null as never,
    },
  ] as FirecrawlDocument<undefined, never>[], // FirecrawlDocument is from external library
}

const mockBatchScrapeResponse: BatchScrapeResponse = {
  success: true,
  id: "test-batch-id",
}

const mockBatchStatusResponse: BatchScrapeStatusResponse = {
  success: true,
  status: "completed",
  completed: 1,
  total: 1,
  creditsUsed: 1,
  expiresAt: new Date(),
  data: [
    {
      url: "https://example.com",
      title: "Test Page",
      description: "Test Description",
      markdown: "# Test Content",
      actions: null as never,
    },
  ] as FirecrawlDocument<undefined, never>[], // FirecrawlDocument is from external library
}

// Create mock instance methods
const mockSearch = vi.fn().mockImplementation(async () => mockSearchResponse)
const mockAsyncBatchScrapeUrls = vi.fn().mockImplementation(async () => mockBatchScrapeResponse)
const mockCheckBatchScrapeStatus = vi.fn().mockImplementation(async () => mockBatchStatusResponse)

// Create mock instance
const mockInstance = {
  apiKey: "test-api-key",
  apiUrl: "test-api-url",
  search: mockSearch,
  asyncBatchScrapeUrls: mockAsyncBatchScrapeUrls,
  checkBatchScrapeStatus: mockCheckBatchScrapeStatus,
}

// Mock the external firecrawl library
vi.mock("@mendable/firecrawl-js", () => ({
  default: vi.fn().mockImplementation(() => mockInstance),
}))
