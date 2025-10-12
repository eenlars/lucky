# Zustand Frontend State Management Learnings

**Context:** Implementing optimistic workflow loading with Zustand + localStorage caching
**Outcome:** 3 critical bugs, 2 hours debugging, multiple commits to fix

## Start Here Next Time

### 1. Draw the State Chart First

Before writing code, map ALL states and transitions:

```
States to consider:
- SSR (server-side, no window)
- Client initial (no auth)
- Auth loading
- Auth ready
- Data loading (with/without cache)
- Data loaded
- Error states
- Cache stale/fresh

Transitions:
- What triggers each state change?
- What happens on errors?
- What happens on race conditions?
```

**Why:** All 3 critical bugs were state transition bugs we didn't anticipate.

### 2. Identify Race Conditions Upfront

Ask these questions before implementing:

- ✅ **Auth vs Data**: Does data fetch require auth? Can they race?
- ✅ **Multiple calls**: What if component unmounts/remounts rapidly?
- ✅ **SSR vs Client**: Does this run server-side? Client-side? Both?
- ✅ **Cache vs Fresh**: Can fresh data arrive while showing cache?

**Why:** We fetched workflows before auth loaded → empty results overwrote cache.

### 3. Plan Cache Strategy

Define cache behavior explicitly:

```typescript
// Cache policy checklist:
// 1. When to show cache? (immediately on mount)
// 2. When to fetch fresh? (after auth ready)
// 3. When to update cache? (after successful fetch)
// 4. What invalidates cache? (auth changes, mutations)
// 5. How to handle stale cache? (show + background refresh)
```

**Why:** We showed cache but then cleared it with empty results.

### 4. Verify Serialization

Check ALL data types in persisted state:

```typescript
// ❌ DON'T persist these:
Set, Map, WeakSet, WeakMap, Date (use ISO strings), Functions, Symbols

// ✅ DO persist these:
Arrays, Objects, Primitives (string, number, boolean, null)
```

**Why:** We used `Set<string>` → broke localStorage serialization.

## Critical Bugs We Hit

### Bug #1: SSR localStorage Error

**Symptom:** `ReferenceError: localStorage is not defined`

**Cause:** Zustand store created server-side, tried to access `localStorage`

**Fix:**
```typescript
storage: createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  }
  return { /* localStorage wrapper */ }
})
```

**Lesson:** Guard ALL browser APIs with `typeof window !== "undefined"`

### Bug #2: Auth Race Condition

**Symptom:** Workflows flash for 1 second then disappear

**Cause:**
```typescript
// ❌ WRONG: Fetches before auth ready
useEffect(() => {
  loadWorkflows() // Called immediately, auth not ready
}, [])

// Inside loadWorkflows():
// 1. Shows cached workflows ✅
// 2. Calls API with no auth
// 3. Gets empty array []
// 4. Overwrites cache with []
// 5. UI shows "no workflows" 💥
```

**Fix:**
```typescript
// ✅ CORRECT: Wait for auth
const { isLoaded, isSignedIn } = useAuth()
useEffect(() => {
  if (isLoaded && isSignedIn) {
    loadWorkflows()
  }
}, [isLoaded, isSignedIn])
```

**Lesson:** Match the `enabled:` conditions from TanStack Query when migrating to Zustand.

### Bug #3: Wrong Loading State

**Symptom:** Shows "No workflows yet" while auth is loading

**Cause:**
```typescript
// ❌ WRONG: Only checks data loading
{isLoading && workflows.length === 0 ? <Spinner /> : <NoWorkflows />}

// When auth is loading:
// - isLoading = false (not fetching yet)
// - workflows.length = 0 (no cache)
// - Shows "No workflows" instead of spinner
```

**Fix:**
```typescript
// ✅ CORRECT: Check auth loading too
{!isLoaded || (isLoading && workflows.length === 0) ? <Spinner /> : ...}
```

**Lesson:** Loading state = auth loading OR (data loading AND no cache)

## Implementation Checklist

Use this before writing Zustand store code:

- [ ] Drew state chart with all states and transitions
- [ ] Identified all possible race conditions
- [ ] Defined cache invalidation strategy
- [ ] Verified all types are JSON-serializable
- [ ] Added SSR guards for browser APIs
- [ ] Matched auth conditions from original implementation
- [ ] Tested loading states for all scenarios
- [ ] Added request deduplication if needed
- [ ] Handled localStorage quota errors gracefully
- [ ] Tested on fresh browser (no cache) and with cache

## Quick Reference

### SSR-Safe Storage Pattern

```typescript
storage: createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }
  return {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  }
})
```

### Race Condition Prevention

```typescript
let currentRequest: Promise<void> | null = null

loadData: async () => {
  if (currentRequest) return currentRequest

  currentRequest = (async () => {
    try {
      // fetch logic
    } finally {
      currentRequest = null
    }
  })()

  return currentRequest
}
```

### Auth-Aware Loading

```typescript
const { isLoaded, isSignedIn } = useAuth()
const hasLoadedRef = useRef(false)

useEffect(() => {
  if (isLoaded && isSignedIn && !hasLoadedRef.current) {
    hasLoadedRef.current = true
    loadData()
  }
}, [isLoaded, isSignedIn])
```

## Performance Impact

When done right, cache-first loading provides:
- **Initial load (cached)**: ~50ms vs ~800ms (94% faster)
- **Initial load (fresh)**: ~800ms (same as before)
- **Zero flickering**: Shows cache immediately, updates in background

## Related Issues

- Auth race conditions: Check `isLoaded && isSignedIn` before fetching
- Multiple simultaneous requests: Use request deduplication
- localStorage quota: Wrap in try/catch, handle QuotaExceededError
- Sets/Maps in state: Convert to Arrays/Objects for persistence
