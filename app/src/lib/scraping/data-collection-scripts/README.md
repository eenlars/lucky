# B-Corp Data Collection Scripts

Automated data collection pipeline for transforming B-Corp data from data.world into structured JSON format with physical store locations.

## Overview

This directory contains a complete data extraction and transformation pipeline that processes B-Corp certification data and enriches it with physical store location information through automated web scraping.

## Quick Start

```bash
# 1. Extract countries from B-Corp data
bun run bcorp-countries-extractor.ts

# 2. Run Google scraper for store locations
bun run bcorp-google-scraper.ts

# 3. Filter and clean results
bun run filter.ts
```

## Pipeline Architecture

```
CSV (data.world) → Country Extraction → Google Scraping → Filtering → JSON Output
```

## Data Flow

### 1. Country Extraction (`bcorp-countries-extractor.ts`)

**Purpose**: Extract unique countries from B-Corp certification data for targeted scraping.

**Input**: CSV file from data.world B-Corp directory
**Output**: `countries.json` with unique country list

```typescript
// Example countries.json structure
{
  "countries": [
    "United States",
    "United Kingdom",
    "Canada",
    "Australia"
  ],
  "count": 4,
  "extractedAt": "2024-01-15T10:30:00Z"
}
```

**Usage**:

```bash
# Basic extraction
bun run bcorp-countries-extractor.ts

# With custom input file
bun run bcorp-countries-extractor.ts --input custom-bcorp-data.csv
```

### 2. Google Scraper (`bcorp-google-scraper.ts`)

**Purpose**: Scrape Google Maps/Search for physical store locations of B-Corp companies.

**Features**:

- Automated Google Maps API integration
- Backup mechanism for long-running processes
- Country-specific scraping with rate limiting
- Comprehensive error handling and retry logic

**Configuration**:

```typescript
interface ScrapingConfig {
  countryName?: string // Target specific country
  batchSize: number // Companies per batch (default: 10)
  delayMs: number // Delay between requests (default: 1000)
  maxRetries: number // Retry attempts (default: 3)
  backupInterval: number // Backup frequency (default: 100)
  apiKey: string // Google Maps API key
}
```

**Usage**:

```bash
# Scrape all countries
bun run bcorp-google-scraper.ts

# Scrape specific country
bun run bcorp-google-scraper.ts --country "United States"

# Resume from backup
bun run bcorp-google-scraper.ts --resume backup-2024-01-15.json
```

### 3. Data Filtering (`filter.ts`)

**Purpose**: Clean and validate scraped data, removing false positives and incomplete records.

**Filtering Criteria**:

- Domain name validation against B-Corp registry
- Store count validation (flags companies with >120 stores)
- Address format validation
- Duplicate location removal

**Filter Configuration**:

```typescript
interface FilterConfig {
  strictDomainMatching: boolean // Exact domain matching
  maxStoreCount: number // Store count threshold
  minStoreCount: number // Minimum viable stores
  addressValidation: boolean // Enable address validation
  duplicateThreshold: number // Distance threshold for duplicates
}
```

## Data Formats

### Input Format (CSV from data.world)

```csv
Company Name,Website,Country,Industry,Certification Date
Example Corp,https://example.com,United States,Technology,2023-01-15
```

### Output Format (Final JSON)

```json
{
  "companies": [
    {
      "name": "Example Corp",
      "website": "https://example.com",
      "country": "United States",
      "industry": "Technology",
      "certificationDate": "2023-01-15",
      "stores": [
        {
          "name": "Example Corp - Downtown",
          "address": "123 Main St, City, State 12345",
          "coordinates": {
            "lat": 40.7128,
            "lng": -74.006
          },
          "phone": "+1-555-123-4567",
          "hours": "Mon-Fri 9AM-6PM",
          "verified": true,
          "scrapedAt": "2024-01-15T10:30:00Z"
        }
      ],
      "storeCount": 15,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "metadata": {
    "totalCompanies": 1,
    "totalStores": 15,
    "countriesProcessed": ["United States"],
    "processingTime": "2h 45m",
    "qualityScore": 0.92
  }
}
```

## Error Handling

### Common Issues and Solutions

#### Issue: Rate Limiting from Google APIs

**Solution**: Implement exponential backoff with jitter

```typescript
const delay = baseDelay * Math.pow(2, retryCount) + Math.random() * 1000
await new Promise((resolve) => setTimeout(resolve, delay))
```

#### Issue: Incomplete Domain Matching

**Solution**: Use fuzzy matching with configurable threshold

```typescript
const similarity = calculateSimilarity(scrapedDomain, bcorpDomain)
if (similarity > 0.8) {
  // Accept as match
}
```

#### Issue: Large Store Count Processing

**Solution**: Implement pagination and batch processing

```typescript
if (storeCount > 120) {
  // Switch to manual scraping mode
  await queueForManualReview(company)
}
```

## Performance Optimization

### Batch Processing

```typescript
// Process companies in batches
const batchSize = 10
for (let i = 0; i < companies.length; i += batchSize) {
  const batch = companies.slice(i, i + batchSize)
  await Promise.all(batch.map((company) => scrapeCompany(company)))

  // Rate limiting between batches
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
```

### Caching Strategy

```typescript
// Cache Google API responses
const cacheKey = `${companyName}_${country}`
const cached = await cache.get(cacheKey)
if (cached) {
  return cached
}

const result = await googleMapsAPI.search(companyName, country)
await cache.set(cacheKey, result, { ttl: 3600 }) // 1 hour cache
```

### Memory Management

```typescript
// Stream processing for large datasets
const stream = fs
  .createReadStream("large-bcorp-data.csv")
  .pipe(csv())
  .pipe(
    new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Process chunk
        this.push(processCompany(chunk))
        callback()
      },
    })
  )
```

## API Rate Limiting

### Google Maps API Limits

- **Requests per second**: 50
- **Daily quota**: 100,000 requests
- **Burst limit**: 100 requests per 100 seconds

### Implementation

```typescript
class RateLimiter {
  private requests: number[] = []
  private readonly limit: number
  private readonly window: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.window = windowMs
  }

  async wait(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.window)

    if (this.requests.length >= this.limit) {
      const oldestRequest = Math.min(...this.requests)
      const delay = this.window - (now - oldestRequest)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    this.requests.push(now)
  }
}
```

## Data Quality Assurance

### Validation Rules

```typescript
interface ValidationRule {
  name: string
  validate: (data: any) => boolean
  severity: "error" | "warning" | "info"
  message: string
}

const validationRules: ValidationRule[] = [
  {
    name: "domainMatch",
    validate: (company) => company.website && company.stores.length > 0,
    severity: "error",
    message: "Company must have website and stores",
  },
  {
    name: "storeCount",
    validate: (company) => company.stores.length <= 120,
    severity: "warning",
    message: "Store count exceeds manual review threshold",
  },
]
```

### Quality Metrics

```typescript
interface QualityMetrics {
  completeness: number // % of companies with complete data
  accuracy: number // % of validated store locations
  consistency: number // % of consistent domain matches
  coverage: number // % of companies with >0 stores
}
```

## Output Examples

### Successful Company Record

```json
{
  "name": "Patagonia",
  "website": "https://patagonia.com",
  "country": "United States",
  "industry": "Retail",
  "certificationDate": "2011-01-01",
  "stores": [
    {
      "name": "Patagonia SoHo",
      "address": "101 Wooster St, New York, NY 10012",
      "coordinates": { "lat": 40.723, "lng": -74.003 },
      "phone": "+1-212-343-1776",
      "verified": true,
      "scrapedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "storeCount": 37,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "qualityScore": 0.95
}
```

### Failed Processing Record

```json
{
  "name": "Unknown Corp",
  "website": "https://unknown.com",
  "country": "Canada",
  "industry": "Unknown",
  "certificationDate": "2023-01-01",
  "stores": [],
  "storeCount": 0,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "qualityScore": 0.1,
  "processingError": "Domain not found in Google Maps",
  "requiresManualReview": true
}
```

## Debugging and Monitoring

### Logging Configuration

```typescript
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data),
  error: (message: string, error?: Error) => console.error(`[ERROR] ${message}`, error),
}

// Usage in scraper
logger.info("Starting scraping process", { totalCompanies, targetCountry })
logger.warn("Rate limit approaching", { requestsRemaining: 100 })
logger.error("Scraping failed", error)
```

### Progress Tracking

```typescript
// Progress indicator
const progress = new ProgressBar(":bar :current/:total :percent :etas", {
  complete: "=",
  incomplete: " ",
  width: 40,
  total: companies.length,
})

companies.forEach(async (company, index) => {
  await scrapeCompany(company)
  progress.tick()
})
```

## Deployment and Scaling

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
CMD ["bun", "run", "bcorp-google-scraper.ts"]
```

### Environment Variables

```env
GOOGLE_MAPS_API_KEY=your_api_key_here
BATCH_SIZE=10
DELAY_MS=1000
MAX_RETRIES=3
BACKUP_INTERVAL=100
OUTPUT_FORMAT=json
```

### Cloud Deployment

```bash
# Deploy to cloud function
gcloud functions deploy bcorp-scraper \
  --runtime nodejs18 \
  --trigger-http \
  --memory 2GB \
  --timeout 540s \
  --env-vars-file .env
```

## Known Limitations

1. **Domain Matching**: Filters out stores with incomplete or incorrect domain names
2. **Large Store Counts**: Manual review required for companies with >120 stores
3. **API Rate Limits**: Google Maps API quotas may limit processing speed
4. **Data Freshness**: Store information may become outdated over time
5. **Language Support**: Currently optimized for English-language results

## Future Enhancements

- Multi-language support for international B-Corps
- Real-time data validation and updates
- Integration with additional map providers
- Machine learning for improved domain matching
- Automated quality scoring system
- Dashboard for monitoring scraping progress

## Contributing

When adding new features:

1. Update validation rules for new data fields
2. Add comprehensive error handling
3. Include performance impact assessment
4. Update documentation with examples
5. Add appropriate unit tests
