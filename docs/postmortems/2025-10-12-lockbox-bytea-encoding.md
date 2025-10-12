# Postmortem: API Key Storage Failure (Lockbox bytea Encoding)

- Incident ID: WEB-2025-10-12-001
- Date: 2025-10-12
- Affected area: Provider configuration API (`/api/user/env-keys`)
- Severity: High (blocking user onboarding and API key configuration)

## Summary

Users attempting to save API keys in the provider settings UI received "Failed to save API key" errors. The root cause was incorrect encoding of encrypted binary data (`ciphertext`, `iv`, `auth_tag`) when inserting into PostgreSQL `bytea` columns. The encryption function returned various formats (`Uint8Array`, hex, base64) that PostgREST couldn't correctly interpret as binary data, causing CHECK constraint violations on `auth_tag` which requires exactly 16 bytes.

## Impact

- Users completely blocked from configuring API keys via UI
- Workflow execution failed for UI users due to missing keys
- No data loss (no successful writes occurred)
- SDK/programmatic access unaffected

## Root Cause

**Technical details:**
1. `encryptGCM()` in `apps/web/src/lib/crypto/lockbox.ts` initially returned `Uint8Array` objects
2. Supabase JS client uses PostgREST (REST API over HTTP/JSON) which requires specific encoding for `bytea` columns
3. Database columns (`ciphertext`, `iv`, `auth_tag`) are typed as `bytea` with CHECK constraint: `octet_length(auth_tag) = 16`
4. PostgREST expects `bytea` data formatted as `\x<hex>` strings (e.g., `\x71557e49910...`)

**Evolution of the problem:**
- **Initial state:** Returned `Uint8Array` - doesn't serialize to JSON correctly
- **Attempt 1 (hex):** Plain hex strings - PostgREST treated as text, not binary
- **Attempt 2 (base64):** Standard binary encoding - still not recognized as `bytea` by PostgREST
- **Solution (PostgREST format):** `\x` prefix + hex encoding - correctly parsed as 16-byte binary

## Timeline

- T0: User reports "Error: Failed to save API key" when configuring OpenRouter provider
- T0+5min: Identified Supabase error code 23514 (CHECK constraint violation on `user_secrets_auth_tag_check`)
- T0+10min: Asked user for database schema; discovered `bytea` column types and 16-byte constraint
- T0+15min: Changed encoding from `Uint8Array` to hex strings - still failed
- T0+20min: Changed to base64 encoding - still failed
- T0+25min: Added detailed logging to inspect actual byte lengths
- T0+30min: Realized PostgREST requires `\x` prefix for `bytea` format
- T0+35min: Implemented `\x<hex>` encoding - **resolved**

## Detection

- User-reported error in provider configuration UI
- Server logs showed Supabase PostgREST error: `"new row for relation "user_secrets" violates check constraint "user_secrets_auth_tag_check"`
- Error code 23514 indicated CHECK constraint violation

## Resolution

Modified `apps/web/src/lib/crypto/lockbox.ts`:

**encryptGCM():**
```typescript
return {
  ciphertext: "\\x" + enc.toString("hex"),
  iv: "\\x" + iv.toString("hex"),
  authTag: "\\x" + tag.toString("hex"),
}
```

**decryptGCM():**
```typescript
const stripPrefix = (s: string) => (s.startsWith("\\x") ? s.slice(2) : s)
const iv = Buffer.from(stripPrefix(params.iv), "hex")
const tag = Buffer.from(stripPrefix(params.authTag), "hex")
const data = Buffer.from(stripPrefix(params.ciphertext), "hex")
```

Added validation logging in `apps/web/src/app/api/user/env-keys/route.ts` to verify byte lengths before insert.

## Contributing Factors

- **Lack of documentation:** PostgREST's `bytea` format (`\x<hex>`) is not obvious and poorly documented
- **Misleading validation:** Initial logging decoded with wrong encoding (base64 when using hex), giving incorrect byte counts
- **No format testing:** Encryption utilities were not tested against actual database constraints
- **Missing schema awareness:** Code was written without checking target column types (`bytea` vs `text`)

## Preventive Actions

- [ ] Document PostgREST `bytea` encoding requirements in `lockbox.ts` comments
- [ ] Add unit tests for `encryptGCM/decryptGCM` that validate:
  - Output format matches `\x[0-9a-f]+` regex
  - `auth_tag` decodes to exactly 16 bytes
  - Round-trip encryption/decryption works
- [ ] Add integration test that actually inserts/retrieves from `lockbox.user_secrets`
- [ ] Create developer guide: "Working with PostgreSQL bytea in Supabase JS"
- [ ] Add pre-insert validation helper that checks byte lengths match DB constraints

## What Went Well

- User provided clear error message immediately
- Proactively asked for database schema (column types + constraints) which revealed the root cause
- Added comprehensive logging that showed exact byte lengths and formats
- Identified the issue systematically through format elimination (Uint8Array → hex → base64 → PostgREST format)

## What Went Poorly

- **Didn't research PostgREST format first:** Should have checked PostgREST documentation for `bytea` handling before trying multiple encodings
- **Validation used wrong decoder:** Logging decoded base64 even after switching to hex, causing confusion
- **No upfront schema check:** Should have verified column types before writing encryption code
- **Insufficient error handling:** Database constraint errors were opaque; needed better error messages

## Lessons Learned

**Critical insight:** When using Supabase JS client with PostgreSQL `bytea` columns, binary data MUST be formatted as `\x<hex>` strings. This is a PostgREST transport convention, not a PostgreSQL or JavaScript standard.

**Key takeaway:** Different layers use different binary encodings:
- Node.js crypto: `Buffer` / `Uint8Array`
- PostgreSQL: `bytea` (binary type)
- PostgREST (Supabase REST API): `\x<hex>` strings as transport format
- Understanding the full stack is essential when working with binary data across API boundaries

**Debugging approach:** Always validate data format at each layer boundary with logging that uses the SAME encoding being sent.

## Follow-ups (Owners / Due)

- [ ] Add `lockbox.ts` unit tests for encryption format validation (Owner: Backend, Due: 1w)
- [ ] Document PostgREST `bytea` format in developer guides (Owner: Docs, Due: 3d)
- [ ] Add integration test for full API key save/retrieve flow (Owner: Backend, Due: 1w)
- [ ] Review other binary data handling in codebase for similar issues (Owner: Backend, Due: 2w)
