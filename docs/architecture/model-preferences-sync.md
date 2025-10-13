# Model Preferences Sync Architecture

## Overview

Model preferences use a Zustand store with localStorage persistence and server sync. This document explains how sync works, when data is considered stale, and how the dual-key system operates.

## Sync Model

### Auto-save vs Manual Refresh

- **Auto-save**: Model toggles save immediately using optimistic updates
- **Manual refresh**: Users can click the refresh icon to pull latest data from server
- **Staleness threshold**: Data older than 5 minutes is considered stale (yellow badge)
- **Multi-tab behavior**: Each tab has independent state; manual refresh syncs with server

### Data Flow

```
User Action → Optimistic Update (Local) → API Call → Server Update → Sync Confirmation
```

If the API call fails, the store automatically rolls back to the previous state.

## When to Refresh

Users should refresh model preferences when:

1. **After changing API keys**: The system shows a tooltip reminder
2. **When "Stale" badge appears**: Data is > 5 minutes old
3. **When switching back to tab**: After being away for a while
4. **When another user/device made changes**: Multi-device scenarios

## Sync Status UI

The `SyncStatusBadge` component shows:

- **Green badge + "Synced just now"**: Data is fresh (< 1 minute old)
- **Green badge + "Synced 2m ago"**: Data is recent (< 5 minutes old)
- **Yellow badge + "Stale"**: Data is > 5 minutes old, refresh recommended
- **Loading spinner**: Refresh in progress

Users can click the refresh icon next to the badge to force a sync at any time.

## Dual-Key System

The system supports two sources for API keys:

### 1. Environment Variables (Local Development)

For local development, API keys can be set in `.env.local`:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

The SDK reads these directly from `process.env`.

### 2. Lockbox (UI Configuration)

When users configure providers through the UI, API keys are stored in the database "lockbox" table with AES-256-GCM encryption.

The system prioritizes keys in this order:
1. Lockbox keys (user-configured via UI)
2. Environment variables (fallback for development)

This dual system ensures:
- Developers can use env vars for quick local testing
- Production users have secure, per-user API key storage
- The UI can show which providers are configured

## Store Architecture

### State

```typescript
interface ModelPreferencesState {
  preferences: UserModelPreferences | null
  isLoading: boolean
  isSaving: boolean
  lastSynced: Date | null
  error: string | null
}
```

### Key Actions

- `loadPreferences()`: Fetch from server, update `lastSynced`
- `toggleModel()`: Optimistic update + auto-save
- `setProviderModels()`: Batch update + auto-save
- `forceRefresh()`: Clear cache and reload from server
- `isStale()`: Check if data is > 5 minutes old
- `getLastSyncedRelative()`: Get human-readable time string

### Persistence

Zustand's `persist` middleware saves to localStorage:

```typescript
{
  name: "model-preferences-storage",
  partialize: state => ({
    preferences: state.preferences,
    lastSynced: state.lastSynced,
  })
}
```

This allows the UI to show cached data immediately while loading fresh data in the background.

## API Endpoints

### GET /api/user/model-preferences

Returns unified model preferences for all providers:

```json
{
  "providers": [
    {
      "provider": "openai",
      "enabledModels": ["gpt-4", "gpt-3.5-turbo"],
      "isEnabled": true,
      "metadata": {
        "apiKeyConfigured": true,
        "lastUpdated": "2025-01-15T10:30:00Z"
      }
    }
  ],
  "lastSynced": "2025-01-15T10:30:00Z"
}
```

### PUT /api/user/model-preferences

Updates all provider settings atomically. Validates the request body against `userModelPreferencesSchema` (Zod).

**Important**: Model IDs are NOT normalized. Each provider expects its own format:
- OpenAI: `"gpt-4"`
- OpenRouter: `"openai/gpt-4"`

The API trusts the provider's API as the source of truth for available models.

## Design Decisions

### Why 5-minute staleness threshold?

- Long enough to avoid annoying users with constant "stale" warnings
- Short enough to catch multi-tab/multi-device conflicts
- Balances UX with data freshness

### Why manual refresh only (no auto-polling)?

- Simpler implementation (no WebSocket, no intervals)
- Reduces server load
- Gives users control over when they sync
- Avoids interrupting user workflows

### Why reusable `SyncStatusBadge` component?

- Used in 3 places (agent dialog, provider overview, potentially more)
- DRY principle (single source of truth for sync status UI)
- Consistent UX across the app

### Why optimistic updates?

- Instant feedback (no waiting for server)
- Feels fast and responsive
- Automatically rolls back on error

## Testing Scenarios

### Manual Testing

1. **Fresh sync**: Open page → verify "Synced just now"
2. **Staleness**: Wait 6 minutes → verify "Stale" badge appears
3. **Manual refresh**: Click refresh → verify updates to "Synced just now"
4. **Multi-tab sync**: Open two tabs → toggle model in Tab A → refresh in Tab B → verify sync
5. **Error handling**: Simulate API failure → verify rollback + error toast

### Edge Cases

- **No API key**: Store still loads, but enabledModels is empty
- **Provider disabled**: Models not shown in agent dialog
- **Stale + loading**: Shows spinner during refresh
- **Rapid toggles**: Optimistic updates queue correctly

## Future Enhancements

These are out of scope for this PR but could be added later:

- **Auto-refresh on focus**: Automatically sync when user switches back to tab
- **WebSocket real-time sync**: Push updates from server
- **Sync status in notifications**: Browser notification when data is stale
- **Server-driven staleness**: API tells client when data is stale
- **Conflict resolution**: Handle multi-device edit conflicts

## Troubleshooting

### Sync badge shows "Stale" immediately

- Check that `lastSynced` is being set correctly in API responses
- Verify localStorage is not corrupted (clear with DevTools if needed)

### Refresh doesn't update data

- Check network tab for API errors
- Verify Supabase RLS policies allow reading provider_settings
- Check browser console for Zustand errors

### Multi-tab issues

- Each tab has independent Zustand state
- Manual refresh syncs with server
- This is expected behavior (not a bug)
