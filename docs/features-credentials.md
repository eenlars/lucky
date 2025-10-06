# Feature-Credential Mapping

This document outlines which credentials enable which features in the application, and how graceful degradation works when credentials are missing.

## Credential Overview

### Required Credentials

These credentials are **required** for the application to function:

| Credential | Purpose | Get it from |
|------------|---------|-------------|
| `OPENAI_API_KEY` | Access to OpenAI GPT models | https://platform.openai.com/api-keys |
| `GOOGLE_API_KEY` | Access to Google Gemini models | https://ai.google.dev/ |
| `SERPAPI_API_KEY` | Web search functionality | https://serpapi.com/manage-api-key |

### Optional Credentials

These credentials enable additional features but are not required:

| Credential | Purpose | Get it from | Fallback Available |
|------------|---------|-------------|--------------------|
| `SUPABASE_PROJECT_ID` | Database persistence | https://supabase.com/ | Yes (in-memory) |
| `SUPABASE_ANON_KEY` | Database authentication | https://supabase.com/ | Yes (in-memory) |
| `OPENROUTER_API_KEY` | Multi-model AI access | https://openrouter.ai/keys | No |
| `MEM0_API_KEY` | Enhanced memory features | https://mem0.ai/ | Yes (basic memory) |
| `TAVILY_API_KEY` | Advanced search | https://tavily.com/ | No |
| `GROQ_API_KEY` | Groq AI models | https://console.groq.com/keys | No |

## Feature Mapping

### Persistence

**Credentials Required:**
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ANON_KEY`

**Description:** Store workflow runs, traces, and evolution data in a persistent database.

**Graceful Degradation:**
- When credentials missing: Falls back to in-memory storage
- Data persists only for current session
- Evolution history not preserved across restarts
- Enable with: `USE_MOCK_PERSISTENCE=true`

**Usage:**
```typescript
import { hasSupabase } from '@lucky/core/utils/clients/supabase/client'

if (hasSupabase()) {
  // Use database persistence
} else {
  // Using in-memory mode
}
```

### Evolution Tracking

**Credentials Required:**
- `SUPABASE_PROJECT_ID`
- `SUPABASE_ANON_KEY`

**Description:** Track genetic programming runs and generational improvements over time.

**Graceful Degradation:**
- When credentials missing: Falls back to in-memory tracking
- Evolution history not preserved across restarts
- Cannot query historical runs
- Current session evolution still works

### AI Models

**Credentials Required** (at least one):
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`
- `GROQ_API_KEY`

**Description:** Execute workflows using AI language models.

**Graceful Degradation:**
- None - at least one AI provider must be configured
- Application will not function without AI model access
- Different models have different capabilities/costs

**Usage:**
```typescript
import { isOpenRouterAvailable } from '@lucky/core/utils/clients/openrouter/openrouterClient'

if (isOpenRouterAvailable()) {
  // Can use OpenRouter models
}
```

### Search

**Credentials Required** (at least one):
- `TAVILY_API_KEY`
- `SERPAPI_API_KEY`

**Description:** Search the web and retrieve information for workflows.

**Graceful Degradation:**
- None - search features will be unavailable
- Workflows requiring search will fail
- At least one search provider recommended

### Memory

**Credentials Required:**
- `MEM0_API_KEY`

**Description:** Enhanced context and memory management across workflow runs.

**Graceful Degradation:**
- When credentials missing: Basic memory still works
- No cross-run memory persistence
- No semantic search capabilities
- Local context only

**Usage:**
```typescript
import { isMem0Available, getMemories } from '@lucky/core/utils/clients/mem0/client'

if (isMem0Available()) {
  const result = await getMemories(query)
  if (result.ok) {
    // Use memories
  }
} else {
  // Use local context only
}
```

## Checking Credential Status

### Server-Side (Core Package)

```typescript
import {
  getSystemHealth,
  isFeatureAvailable,
  getCredentialStatus,
} from '@lucky/core/utils/config/credential-status'

// Check overall system health
const health = getSystemHealth()
if (!health.healthy) {
  console.warn('Missing credentials:', health.missingRequired)
  console.warn('Unavailable features:', health.unavailableFeatures)
}

// Check specific feature
if (isFeatureAvailable('persistence')) {
  // Use database
} else {
  // Use in-memory
}

// Check specific credential
const status = getCredentialStatus('OPENROUTER_API_KEY')
if (status.configured) {
  console.log('OpenRouter available')
}
```

### Client-Side (Web App)

```typescript
import { useSystemHealth, useFeatureStatus } from '@/lib/credential-status'

function MyComponent() {
  const { health, loading } = useSystemHealth()

  if (loading) return <div>Loading...</div>

  if (!health?.healthy) {
    return <div>Configuration required</div>
  }

  return <div>All systems operational</div>
}
```

### UI Components

```tsx
import { FeatureGuard } from '@/components/config/FeatureGuard'
import { CredentialStatusBanner } from '@/components/config/CredentialStatusBanner'

// Wrap features requiring specific credentials
function EvolutionPage() {
  return (
    <FeatureGuard feature="evolution">
      {/* Content only shown if evolution is available */}
    </FeatureGuard>
  )
}

// Show banner when credentials are missing
function Layout() {
  return (
    <>
      <CredentialStatusBanner />
      {children}
    </>
  )
}
```

## API Error Handling

When API routes encounter missing credentials, they return standardized errors:

```json
{
  "error": "Feature unavailable",
  "code": "MISSING",
  "credential": "OPENROUTER_API_KEY",
  "message": "AI model access requires an OpenRouter API key. Configure it in Settings → Environment Keys.",
  "docsUrl": "https://openrouter.ai/keys"
}
```

Example handler:

```typescript
const response = await fetch('/api/workflow/run', { method: 'POST', body: ... })

if (!response.ok) {
  const error = await response.json()

  if (error.code === 'MISSING') {
    // Show user-friendly message
    toast.error(error.message)
    // Optionally redirect to settings
    router.push('/settings')
  }
}
```

## Environment Setup

### Minimal Setup (In-Memory Mode)

For local development without database:

```bash
# Required
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
SERPAPI_API_KEY=...

# Enable in-memory mode
USE_MOCK_PERSISTENCE=true
```

### Full Setup (Production)

```bash
# Required
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
SERPAPI_API_KEY=...

# Database
SUPABASE_PROJECT_ID=...
SUPABASE_ANON_KEY=...

# Optional enhancements
OPENROUTER_API_KEY=sk-or-v1-...
MEM0_API_KEY=...
TAVILY_API_KEY=...
GROQ_API_KEY=...
```

## Testing

When writing tests, use in-memory mode:

```typescript
// test-setup.ts
process.env.USE_MOCK_PERSISTENCE = 'true'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.GOOGLE_API_KEY = 'test-google-key'
process.env.SERPAPI_API_KEY = 'test-serpapi-key'
```

## Troubleshooting

### "Feature unavailable" errors

1. Check which credential is missing in the error response
2. Verify the credential is set in your environment
3. Ensure the credential doesn't start with "test-" (reserved for tests)
4. Check credential format is valid

### In-memory mode not working

1. Ensure `USE_MOCK_PERSISTENCE=true` is set
2. Check that imports use the factory: `createPersistence()`
3. Verify no hard-coded database calls

### Type errors after upgrade

1. Run `bun run tsc` to check for type issues
2. Ensure core package is rebuilt: `cd packages/core && bun run build`
3. Clear turbo cache: `bunx turbo run build --force`
