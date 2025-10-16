# MSW Test Infrastructure

Mock Service Worker (MSW) setup for testing external HTTP dependencies.

## Structure

- `handlers/` - Service-specific request handlers (OpenAI, Anthropic, GitHub, etc.)
- `fixtures/` - JSON response fixtures for third-party APIs
- `scenarios/` - Reusable test scenarios combining multiple handlers
- `server.ts` - Server setup utilities

## Usage

### Basic Setup

```typescript
import { createTestServer } from "@tests/msw/server"
import { openaiHandlers } from "@tests/msw/handlers"

const server = createTestServer(...openaiHandlers())

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
```

### With Options

```typescript
// Simulate failure
const server = createTestServer(...openaiHandlers({ fail: true }))

// Simulate rate limiting
const server = createTestServer(...openaiHandlers({ rateLimited: true }))

// Add delay
const server = createTestServer(...openaiHandlers({ delay: 1000 }))
```

### Multiple Services

```typescript
import { openaiHandlers, anthropicHandlers } from "@tests/msw/handlers"

const server = createTestServer(
  ...openaiHandlers(),
  ...anthropicHandlers()
)
```

## Philosophy

- **Self-contained handlers** - Each service file exports its own handlers
- **Minimal fixtures** - Only canonical examples, not exhaustive coverage
- **Composable scenarios** - Build complex test cases from simple handlers
- **Explicit mocking** - `onUnhandledRequest: 'error'` catches missing mocks
