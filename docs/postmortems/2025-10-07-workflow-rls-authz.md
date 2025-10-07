# Postmortem: 403 on Workflow list (RLS + IAM privileges)

- Incident ID: WEB-2025-10-07-001
- Date: 2025-10-07
- Affected area: Web app (Next.js) workflow listing (`public.Workflow`)
- Severity: Medium (read path blocked for signed‑in users)

## Summary

Signed‑in users saw 403 errors when the browser attempted to list workflows. Supabase RLS policies on `public.Workflow` reference functions in the `iam` schema (e.g., `iam.current_user_id()`), but the `authenticated` role lacked required privileges on the `iam` schema and the `iam.users` table. This caused Postgres to error during policy evaluation and PostgREST returned 403, even though a valid Clerk session token was sent.

## Impact

- Users could not list workflows in the UI (blocking primary navigation and selection).
- No data corruption; server workloads unaffected.

## Root Cause

- RLS policy on `public.Workflow` requires role `authenticated` and uses `iam.current_user_id()` for ownership checks.
- The `authenticated` role did not have:
  - USAGE on schema `iam`
  - EXECUTE on functions in schema `iam`
  - SELECT on `iam.users` (referenced via FK/ownership lookups)
- Browser Supabase client initially sent anon requests in some paths, compounding the issue. After fixing token flow, the missing DB privileges remained and still caused 403.

## Timeline

- T0: Users report 403 on `GET /rest/v1/Workflow?select=*...`
- T0+short: Added browser token flow (Clerk → Supabase `accessToken`); enforced adapter server‑only.
- T0+short: Error changed from generic to `permission denied for schema iam` (code 42501).
- T0+short: Granted `USAGE` on `iam` and `EXECUTE` on functions; error changed to `permission denied for table users`.
- T0+short: Granted `SELECT` on `iam.users`; workflow list started working.

## Detection

- Browser console errors and 403 responses from PostgREST.
- Supabase advisors and manual SQL checks (MCP) confirmed RLS and privilege gaps.

## Resolution

Executed targeted grants (project: `together`):

```
GRANT USAGE ON SCHEMA iam TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA iam TO authenticated;
GRANT SELECT ON iam.users TO authenticated;
```

Client/runtime fixes:

- Web: Centralized Clerk→Supabase token bridge; zero‑arg `createClient()` always supplies `accessToken`.
- Web: Added issuer guard to prevent mixing dev Clerk with prod Supabase.
- Adapter: Enforced server‑only; prefers service‑role key on servers, supports URL or project ID.

## Contributing Factors

- RLS posture inconsistent across tables (many without RLS) made the issue non‑obvious when only `Workflow` failed.
- Initial anon calls masked by lack of explicit session token flow in some utilities.
- Missing schema/table/function privileges for `authenticated` on `iam` schema.

## Preventive Actions

- Add a startup healthcheck that performs a minimal `SELECT` against `public.Workflow` and fails fast with a clear message if issuer or DB grants are wrong.
- Option A (preferred): Make `iam.current_user_id()` `SECURITY DEFINER` and restrict broad `SELECT` on `iam.users` (or enable RLS on `iam.users` and add a “read own row” policy). This reduces wide grants to `authenticated`.
- Document “Local with production Clerk” setup in README; ensure `NEXT_PUBLIC_CLERK_EXPECTED_ISSUER` is set and checked.
- Standardize RLS posture across other public tables (enable RLS where user‑scoped, add policies).

## What Went Well

- Clear separation of server adapter vs browser client; server remained unaffected.
- Supabase MCP made it fast to enumerate privileges and apply fixes safely.

## What Went Poorly

- Privilege prerequisites for policy functions (`iam.*`) were not documented or tested.
- Initial browser utilities issued anon requests when session wasn’t yet wired.

## Follow‑ups (Owners / Due)

- [ ] Convert `iam.current_user_id()` to `SECURITY DEFINER` and remove broad `SELECT` grant on `iam.users` (DB owner) — (Owner: Platform, Due: 1w)
- [ ] Add healthcheck endpoint to validate issuer + RLS + privileges on boot — (Owner: Web, Due: 1w)
- [ ] Review/enable RLS on other public tables; add policies and indexes for columns used in policies — (Owner: Data, Due: 2w)

