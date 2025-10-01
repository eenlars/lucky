# Browser Automation Tool

Comprehensive Puppeteer-based browser automation with stealth capabilities, proxy support, and structured error handling for web scraping and interaction tasks.

## Quick Start

```typescript
import { browserAutomation } from "./main"

// Navigate to a page
const result = await browserAutomation({
  operation: "navigate",
  url: "https://example.com",
})

// Click an element
await browserAutomation({
  operation: "click",
  selector: "button.submit",
  url: "https://example.com",
})

// Get page information
const info = await browserAutomation({
  operation: "getPageInfo",
})
```

## Core Operations

### Navigate

Navigate to a URL and capture page content.

```typescript
{
  operation: "navigate",
  url: "https://example.com",
  waitFor?: {
    type: "element" | "network" | "timeout",
    value: ".loading-complete", // selector or timeout ms
    timeout?: 10000 // default 5000ms
  }
}
```

**Returns**: Page HTML, URL, and basic page metrics

### Click

Click elements using CSS selectors with automatic wait and retry.

```typescript
{
  operation: "click",
  selector: "button.submit",
  url?: "https://example.com", // optional if already on page
  waitFor?: {
    type: "element",
    value: ".result-loaded",
    timeout: 5000
  }
}
```

**Features**:

- Automatic element wait with timeout
- Scroll element into view before clicking
- Retry on transient failures
- Post-click validation

### Wait For Conditions

Wait for various page states and conditions.

```typescript
{
  operation: "waitFor",
  waitCondition: {
    type: "element" | "network" | "timeout" | "custom",
    value: ".loading-done", // selector or custom script
    timeout: 10000 // optional, default 5000ms
  }
}
```

**Wait Types**:

- `element`: Wait for CSS selector to appear
- `network`: Wait for network requests to complete
- `timeout`: Simple delay
- `custom`: Execute custom JavaScript condition

### Element Inspection

Check element existence and extract properties.

```typescript
{
  operation: "checkElement",
  selector: "h1.title",
  expectedState?: {
    exists: true,
    isVisible: true,
    text: "Expected Title",
    attributes: { class: "title" }
  }
}
```

**Returns**: Element properties, text content, attributes, and validation results

### Page Information

Extract comprehensive page metadata and structure.

```typescript
{
  operation: "getPageInfo",
  includeLinks?: boolean, // default true
  includeForms?: boolean, // default true
  includeImages?: boolean // default false
}
```

**Returns**:

- Page title, URL, viewport dimensions
- Performance metrics (load time, resources)
- First 20 links with text and URLs
- Form elements with input types
- Page structure analysis

### Script Execution

Execute custom JavaScript in the page context.

```typescript
{
  operation: "executeScript",
  script: "return document.querySelectorAll('.product').length",
  timeout?: 5000 // execution timeout
}
```

**Advanced Examples**:

```typescript
// Extract structured data
{
  operation: "executeScript",
  script: `
    return Array.from(document.querySelectorAll('.product')).map(el => ({
      name: el.querySelector('.name')?.textContent,
      price: el.querySelector('.price')?.textContent,
      image: el.querySelector('img')?.src
    }))
  `
}

// Wait for dynamic content
{
  operation: "executeScript",
  script: `
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (document.querySelector('.dynamic-content')) {
          clearInterval(interval)
          resolve(true)
        }
      }, 100)
    })
  `
}
```

## Advanced Features

### Proxy Configuration

Route requests through proxy servers for anonymity or geo-targeting.

```typescript
await browserAutomation(operation, {
  proxy: {
    ip: "proxy.example.com",
    port: "8080",
    username: "user",
    password: "pass",
    protocol: "http", // or "https", "socks5"
  },
})
```

### User Agent Rotation

Randomize user agents to avoid detection.

```typescript
// Automatic rotation (default)
await browserAutomation(operation, {
  userAgent: "random", // rotates from pool
})

// Custom user agent
await browserAutomation(operation, {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
})
```

### Stealth Mode

Advanced anti-detection measures using puppeteer-extra-plugin-stealth.

```typescript
await browserAutomation(operation, {
  stealth: {
    enabled: true,
    webdriver: false, // hide webdriver traces
    chrome: {
      runtime: false, // disable chrome runtime detection
      permissions: false, // disable permission API
    },
  },
})
```

### Request Interception

Intercept and modify requests/responses.

```typescript
await browserAutomation(operation, {
  interceptRequests: true,
  requestFilter: request => {
    // Block ads and trackers
    if (request.url().includes("ads") || request.url().includes("tracking")) {
      return "abort"
    }
    return "continue"
  },
})
```

## Utility Functions

### Form Interaction

```typescript
import { fillForm, selectOption } from "./utils"

// Fill form fields
await fillForm(page, {
  "#email": "user@example.com",
  "#password": "password123",
  "#name": "John Doe",
})

// Select dropdown option
await selectOption(page, "#country", "United States")
```

### Element Utilities

```typescript
import { scrollToElement, getElementRect, isElementVisible } from "./utils"

// Scroll element into view
await scrollToElement(page, ".target-element")

// Get element dimensions
const rect = await getElementRect(page, ".element")
// Returns: { x, y, width, height }

// Check visibility
const visible = await isElementVisible(page, ".element")
```

### Screenshot Capture

```typescript
import { takeScreenshot } from "./utils"

// Full page screenshot
const screenshot = await takeScreenshot(page, {
  type: "fullPage",
  format: "png",
})

// Element screenshot
const elementShot = await takeScreenshot(page, {
  type: "element",
  selector: ".target-element",
  format: "jpeg",
  quality: 80,
})
```

### Page Load Utilities

```typescript
import { waitForPageLoad } from "./utils"

// Wait for complete page load
await waitForPageLoad(page, {
  waitUntil: "networkidle2", // or 'load', 'domcontentloaded'
  timeout: 30000,
})
```

## Error Handling

### Structured Error Responses

All operations return standardized error information:

```typescript
{
  success: false,
  error: "Element not found: .missing-selector",
  errorType: "ElementNotFound",
  details: {
    selector: ".missing-selector",
    timeout: 5000,
    pageUrl: "https://example.com"
  }
}
```

### Common Error Types

- `NavigationError`: Page navigation failures
- `ElementNotFound`: CSS selector not found
- `TimeoutError`: Operation timeout exceeded
- `NetworkError`: Network request failures
- `ScriptError`: JavaScript execution errors

### Retry Logic

```typescript
// Automatic retry with exponential backoff
await browserAutomation(operation, {
  retry: {
    attempts: 3,
    delay: 1000, // initial delay
    backoff: 2.0, // exponential multiplier
    maxDelay: 10000, // maximum delay
  },
})
```

## Performance Optimization

### Browser Instance Management

```typescript
// Reuse browser instances
const browser = await launchBrowser({
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
})
```

### Memory Management

```typescript
// Automatic cleanup
await browserAutomation(operation, {
  cleanup: {
    closePages: true,
    clearCache: true,
    clearCookies: false,
  },
})
```

### Resource Optimization

```typescript
// Block unnecessary resources
await browserAutomation(operation, {
  blockResources: ["image", "stylesheet", "font"],
  javascriptEnabled: false, // for content-only scraping
})
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  timeout: 30000,
  viewport: { width: 1366, height: 768 },
  userAgent: "random",
  stealth: { enabled: true },
  retry: { attempts: 3 },
  cleanup: { closePages: true },
}
```

### Environment Variables

```env
BROWSER_AUTOMATION_TIMEOUT=30000
BROWSER_AUTOMATION_VIEWPORT_WIDTH=1366
BROWSER_AUTOMATION_VIEWPORT_HEIGHT=768
BROWSER_AUTOMATION_STEALTH=true
BROWSER_AUTOMATION_POOL_SIZE=5
```

## Testing

### Unit Tests

```typescript
import { browserAutomation } from "./main"

describe("Browser Automation", () => {
  it("should navigate to page", async () => {
    const result = await browserAutomation({
      operation: "navigate",
      url: "https://example.com",
    })

    expect(result.success).toBe(true)
    expect(result.url).toBe("https://example.com")
    expect(result.html).toContain("Example Domain")
  })
})
```

### Integration Tests

```typescript
// End-to-end workflow test
it("should complete full interaction flow", async () => {
  // Navigate
  await browserAutomation({
    operation: "navigate",
    url: "https://example.com/form",
  })

  // Fill form
  await browserAutomation({
    operation: "executeScript",
    script: `document.querySelector('#email').value = 'test@example.com'`,
  })

  // Submit
  await browserAutomation({
    operation: "click",
    selector: "button[type='submit']",
  })

  // Verify result
  const result = await browserAutomation({
    operation: "checkElement",
    selector: ".success-message",
  })

  expect(result.data.exists).toBe(true)
})
```

## Troubleshooting

### Common Issues

#### Issue: Browser crashes or hangs

**Solution**: Implement proper resource limits and cleanup

```typescript
await browserAutomation(operation, {
  browserArgs: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--memory-pressure-off"],
  timeout: 30000,
  cleanup: { closePages: true },
})
```

#### Issue: Anti-bot detection

**Solution**: Enhance stealth configuration

```typescript
await browserAutomation(operation, {
  stealth: {
    enabled: true,
    webdriver: false,
    chrome: { runtime: false },
    userAgent: "random",
  },
  proxy: {
    /* proxy config */
  },
})
```

#### Issue: Slow page loads

**Solution**: Optimize resource loading

```typescript
await browserAutomation(operation, {
  blockResources: ["image", "stylesheet", "font"],
  waitUntil: "domcontentloaded",
  timeout: 15000,
})
```

### Debug Mode

```typescript
await browserAutomation(operation, {
  debug: {
    enabled: true,
    screenshots: true,
    console: true,
    network: true,
  },
})
```

## Architecture

### File Structure

```
browser-automation/
├── main.ts           # Core automation function and schema
├── operations.ts     # Individual operation handlers
├── utils.ts         # Helper utilities
├── constants.ts     # User agents and configurations
├── types.ts         # TypeScript interfaces
└── test.ts          # Validation tests
```

### Dependencies

- `puppeteer`: Core browser automation
- `puppeteer-extra`: Plugin system
- `puppeteer-extra-plugin-stealth`: Anti-detection
- `user-agents`: User agent rotation
- `zod`: Schema validation

## Best Practices

1. **Always set timeouts** to prevent hanging operations
2. **Use stealth mode** for public website scraping
3. **Implement retry logic** for transient failures
4. **Clean up resources** after operations
5. **Validate selectors** before using in production
6. **Monitor performance** and adjust pool sizes
7. **Respect robots.txt** and rate limits

## Security Considerations

- Never execute untrusted JavaScript code
- Validate all user inputs and selectors
- Use proxy rotation for sensitive operations
- Monitor for IP blocking and rate limiting
- Implement proper error handling for security errors
- Keep browser version updated for security patches
