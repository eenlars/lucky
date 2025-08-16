### Postmortem: Evolution linking and counting inconsistencies

- **Date**: 2025-08-15
- **Incident ID**: EVO-2025-08-15-001
- **Owner**: Evolution UI + Data
- **Severity**: Low (analytics/visibility impact only)

### Summary

Some cultural/iterative evolution runs were not being counted correctly and the Evolution page showed stale numbers after a DB backfill. Root causes were (1) legacy invocation rows missing `run_id`/`generation_id` links and (2) client-side caching of run lists in localStorage.

### Impact

- **Incorrect analytics**: Early queries missed runs/generations with multiple invocations.
- **Stale UI**: `/evolution` showed outdated totals (e.g., still 113) until local cache was cleared.
- No data loss. Execution and persistence of runs were unaffected.

### Detected by

- Manual validation when a known cultural run `evo_run_997d58` (12 invocations, 1 generation) didn’t appear in initial counts.

### Root cause

- Legacy cultural runs saved some `WorkflowInvocation` rows with `run_id = null` and/or `generation_id = null`.
- Early scripts and views filtered by `run_id` and assumed `generation_id` was present, silently excluding legacy rows.
- The Evolution page (`/evolution`) prefilled from a persisted cache (`localStorage` key `evolution-runs/v1`), so updated server data wasn’t visible without clearing the cache.

### Contributing factors

- Schema allowed nullable links on legacy writes.
- Counting scripts started with run-centric filters instead of joining via versions.
- Client caching lacked an automatic invalidation bump when the server-side logic improved.

### What we changed

- Counting and export scripts now resolve via `Generation -> WorkflowVersion -> WorkflowInvocation` and merge with `run_id` matches:
  - `app/scripts/count-multi-invocations.ts`
  - `app/scripts/export-single-gen-high-invocation-ids.ts`
  - `app/scripts/find-chocolonely-runs.ts`
- Added a safe backfill script to link legacy rows where possible:
  - `app/scripts/backfill-evolution-links.ts` (dry-run by default; `--apply` to persist)
- Added a quick verifier:
  - `app/scripts/check-run-links.ts` (e.g., `--run=evo_run_997d58`)

### Current status (post-fix)

- Cultural/iterative runs analyzed: 414
- Runs with ≥2 invocations in the same generation: 83
- One-generation cultural runs with >5 invocations: 22
- `evo_run_997d58`: fully linked (0 missing links)

### UI cache note

- The Evolution page uses a persisted cache (`localStorage` key `evolution-runs/v1`). To reflect new server data immediately, run in DevTools:

```
localStorage.removeItem('evolution-runs/v1'); location.reload();
```

Optionally clear any prefixed keys:

```
Object.keys(localStorage)
  .filter(k => k.startsWith('evolution-runs/'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

### Timeline

- T0: Initial scripts undercount cultural generations due to null links.
- T1: Discrepancy noticed for `evo_run_997d58`.
- T2: Scripts updated to join via versions; backfill tool added and applied (7 safe rows updated on first pass).
- T3: UI cache behavior documented; hard-refresh guidance added here.

### Preventative actions

- Consider backfilling remaining legacy rows in batches (safe-only policy).
- Add a materialized view or server-side join that always resolves via versions; deprecate run-only filters.
- Add a small test dataset with legacy-style rows to CI for regression.
- When server logic changes, bump the client cache key (e.g., `evolution-runs/v2`) to auto-invalidate.

### Appendix

- API: `app/src/app/api/evolution-runs/route.ts` (rollup logic)
- Store: `app/src/stores/evolution-runs-store.ts` (local cache and filters)
- Scripts updated/added as listed above
