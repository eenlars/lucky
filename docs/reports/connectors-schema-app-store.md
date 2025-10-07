# Connectors Platform (App-Store + TestFlight for MCP): Technical Design & Ops Guide

This doc explains *exactly* how the redesigned schema works, why it’s structured this way, and how to use it—day-to-day and over the long run. Think “Apple App Store + TestFlight,” but for MCP connectors where **one connector can expose multiple tools and transports**.

---

## 0) Design principles (why this shape)

* **One org model:** We reuse `iam.orgs` for *both* “publishers” (developers) and “customers”. No duplicate notions of org/tenant.
* **Simple distribution:** Connector-level **visibility** (`public|unlisted|private`) plus two allowlists:

  * **`org_access`** (connector-level) for private/unlisted releases,
  * **`beta_access`** (version-level) for TestFlight (internal vs external).
* **Clear lifecycle:** Version `status` (`draft → in_review → testflight|released → yanked`) and `listed` flag; **approvals** are internal but enforced.
* **Least privilege:** Row-Level Security (RLS) by org membership; immutable released artifacts; secrets isolated in service-role tables.
* **Extensible hooks:** Review events, license hook, enumerations, per-version test cohorts—without complicating the happy path.

---

## 1) High-level model

```
iam.orgs (single org primitive)
   ▲                ▲
   │                │
publisher (org)     customer (org)

connectors.connectors (publisher_org_id → iam.orgs.org_id, visibility)
  └─ connectors.connector_versions (per connector; MCP fields; status; listed)
       ├─ connectors.connector_transports (per version; MCP transport kinds)
       └─ connectors.tools              (per version; multiple tools)

Distribution controls:
  ├─ connectors.org_access   (conn_id, org_id, level='private')
  └─ connectors.beta_access  (cver_id, org_id, cohort='internal'|'external')

Approvals & review:
  ├─ connectors.approvals      (internal “approved|rejected|revoked”)
  └─ connectors.review_events  (timeline of review actions)

Installs & runtime:
  ├─ connectors.server_instances (cver_id, org_id, deploy_kind, status, endpoint)
  └─ connectors.health_checks    (per instance)

Extras:
  ├─ connectors.connector_transport_secrets (service-role only)
  ├─ connectors.tags + connectors.connector_tags
  └─ connectors.org_licenses (future commerce hook)
```

---

## 2) Entities & constraints

### 2.1 `iam` (already present)

* `iam.orgs(org_id, name, created_at)` — the single org primitive.
* `iam.org_memberships(org_id, clerk_id, role)` — `role` ∈ `{admin, member}`.
* `iam.users(clerk_id, …)` — maps users to identity; `public.sub()` returns `clerk_id`.

### 2.2 Connectors (publishers & catalog)

**`connectors.connectors`**

* `publisher_org_id` → **the developer org** that owns it.
* `slug` **unique per publisher** (`UNIQUE (publisher_org_id, slug)`).
* `visibility` ∈ `{public, unlisted, private}`.
* `kind` defaults to `'mcp'` (room for `'app'|‘bridge’|‘custom’` later).

**Why per-publisher slug?** Prevents global name collisions (e.g., everyone wants “calendar”).

### 2.3 Versions (lifecycle)

**`connectors.connector_versions`**

* MCP fields (`mcp_spec_version`, `capabilities_json`, `manifest_hash`) are **per version**.
* `status` ∈ `{draft, in_review, testflight, released, rejected, yanked}`.
* `listed` (boolean) controls whether a released version appears in the public catalog.
* **Uniqueness**: `UNIQUE (conn_id, version)`.
* **Immutability**: a trigger forbids mutating core payload after `released` (except allowed fields like `listed`, `status` transitions, and `release_notes`). You *can* `yank` to pull from catalog without deleting history.

### 2.4 Transports & tools (MCP specifics)

* **`connector_transports`** (per version): multiple rows, e.g. `'mcp:stdio'`, `'mcp:http'`, `'mcp:websocket'`.

  * Split: `connector_transport_secrets(ctra_id, config_json)` holds secrets (no user grants).
* **`tools`** (per version): multiple tools with `input_schema_json`, `metadata_json`.

  * Constraint: `UNIQUE (cver_id, name)`; `status` ∈ `{pending, active, disabled}`.

### 2.5 Distribution controls (App-Store/TestFlight)

* **`org_access(conn_id, org_id, level)`** for **released** but **non-public** distribution:

  * `level='private'` (simple: this org can see/install private/unlisted releases).
* **`beta_access(cver_id, org_id, cohort)`** for **TestFlight**:

  * `cohort='internal'` → no review required (fast developer loop).
  * `cohort='external'` → requires “beta approval”.

This mirrors Apple’s Internal vs External TestFlight, but minimal.

### 2.6 Approvals & review

* **`approvals`** — 1 active approval per subject (`UNIQUE WHERE decision='approved'`).

  * Typical subjects: `'connector_version'` for release; `'connector_version.beta'` for external TestFlight.
* **`review_events`** — append-only timeline of actions:

  * Examples: `submitted`, `auto_scan_pass`, `approved`, `rejected`, `revoked`.

### 2.7 Installs & runtime

* **`server_instances`** — *what you host* for a given org & version.

  * `deploy_kind` ∈ `{cloud, edge, local, testflight}`.
  * `status` ∈ `{provisioning, running, degraded, stopped, error}`.
  * `endpoint_json` contains **non-secret** endpoint info; secrets live elsewhere if needed.
* **`health_checks`** — system-written heartbeat. Users can read their own org’s instances’ health.

### 2.8 Tags

* `tags` & `connector_tags` — global taxonomy & many-to-many mapping.

### 2.9 Commerce (future hook, optional)

* **`org_licenses(org_id, conn_id, plan, valid_until)`** — inert today; lets you enforce paid installs later by plugging a single check into `can_install_cver()`.

---

## 3) Distribution rules (the truth tables)

### 3.1 Discovery (who can **see** which metadata)

A user can view a **connector** if:

1. They’re a member of the **publisher org** (collaborator), OR
2. `visibility='public'`, OR
3. Their org is listed in **`org_access(conn_id, org_id, 'private')`** (private/unlisted).

A user can view a **version** if **any** of:

1. They’re a member of the publisher org, OR
2. It’s **public released + listed + approved**, OR
3. Their org can install it via:

   * **Released private/unlisted** → found in `org_access(conn_id, org_id, 'private')`.
   * **TestFlight**:

     * `beta_access(cver_id, org_id, 'internal')`: **no beta approval** required, OR
     * `beta_access(cver_id, org_id, 'external')` **and** `'connector_version.beta'` is **approved**.

### 3.2 Installation (who can **install** what)

`can_install_cver(cver_id, org_id)` is **true** iff:

* **Released path**

  * Version is `status='released'` **and** `listed=true`.
  * **Approved** (subject = `'connector_version'`).
  * And either:

    * Connector `visibility='public'` (any org can install), **or**
    * Connector `visibility IN ('unlisted','private')` **and**
      `org_access(conn_id, org_id, 'private')` exists.
* **TestFlight path**

  * Version is `status='testflight'`.
  * And either:

    * `beta_access(cver_id, org_id, 'internal')` (no approval needed), **or**
    * `beta_access(cver_id, org_id, 'external')` **and**
      **beta approval** exists (subject = `'connector_version.beta'`).
* **Optional commerce hook (future):**

  * If connector requires a license, `org_licenses` must show active coverage.

### 3.3 Immutability (release discipline)

* After `released`: the version’s **code/capability fields** cannot change.
* Allowed post-release changes: `listed` toggle, `status` transition to `yanked`, `release_notes` edits.

---

## 4) Access control (RLS)

* **Publisher side:** Members of the publisher org can read drafts and manage everything; only **admins** can write.
* **Catalog side:** Any authed user can read **public released + approved + listed** versions; private/unlisted require org allowlist.
* **Customer side:** Members of an org can see their own org’s instances and health; **admins** can create/update/delete instances (subject to `can_install_cver()`).
* **Approvals, review events, and secrets tables**: **not** visible to normal users.

> All SECURITY DEFINER functions pin `search_path` to `pg_catalog, …` to avoid search-path attacks.

---

## 5) Helper functions (contract)

> These are the *only* policy brains most services need to call.

* `connectors.is_org_member(org_id) bool`
* `connectors.is_org_admin(org_id) bool`
* `connectors.conn_publisher_org(conn_id) text`
* `connectors.cver_publisher_org(cver_id) text`
* `connectors.is_cver_approved(cver_id) bool`
* `connectors.can_view_conn(conn_id) bool`
* `connectors.can_view_cver(cver_id) bool`
* `connectors.can_install_cver(cver_id, org_id) bool`  ← **the big one**

**`can_install_cver()` (final logic sketch, SQL-friendly):**

```sql
CASE
  WHEN NOT is_cver_approved(cver_id)
    AND NOT EXISTS (SELECT 1 FROM beta_access WHERE cver_id=$1 AND cohort='internal' AND org_id=$2)
  THEN false

  WHEN status='released' AND listed=true THEN
    CASE visibility
      WHEN 'public' THEN true
      ELSE EXISTS (SELECT 1 FROM org_access WHERE conn_id=v.conn_id AND org_id=$2 AND level='private')
    END

  WHEN status='testflight' THEN
       EXISTS (SELECT 1 FROM beta_access WHERE cver_id=$1 AND org_id=$2 AND cohort='internal')
    OR (EXISTS (SELECT 1 FROM beta_access WHERE cver_id=$1 AND org_id=$2 AND cohort='external')
        AND EXISTS (SELECT 1 FROM approvals
                    WHERE subject_type='connector_version.beta' AND subject_id=$1 AND decision='approved'))

  ELSE false
END
```

---

## 6) Reference flows (end-to-end)

### 6.1 Developer (publisher org) — **Release**

1. Create **connector** under `publisher_org_id`; pick `visibility`:

   * `public` if you want catalog visibility,
   * `unlisted/private` for restricted distribution.
2. Create **version** → set `status='in_review'`.
3. Internal reviewers record a **review event**, then put an **approved** row with
   `subject_type='connector_version'`.
4. Publisher sets `status='released'` and `listed=true`.

   * If `public`, authed users can **discover** via `catalog_public`.
   * If `unlisted/private`, add target orgs to `org_access(conn_id, org_id, 'private')`.

### 6.2 Developer — **TestFlight**

1. Create version; set `status='testflight'`.
2. For **internal testers**: add `beta_access(cver_id, org_id, 'internal')`. No approval needed.
3. For **external testers**: add `beta_access(cver_id, org_id, 'external')`, then reviewers add an **approved** row with `subject_type='connector_version.beta'`.
4. Testers’ org admins can now install (`server_instances` insert passes RLS + `can_install_cver`).

### 6.3 Customer org — **Install**

1. Browse `catalog_public` for public releases, or receive an allowlist via `org_access`/`beta_access`.
2. As **org admin**, create a `server_instances` row:

   * RLS requires: user is org admin **and** `can_install_cver(cver_id, org_id)` = true.
3. System provisions runtime; writes **health_checks**; members of the org can read status.

---

## 7) Usage examples (SQL)

### 7.1 Create a public connector & draft version

```sql
-- As a publisher org admin
INSERT INTO connectors.connectors (publisher_org_id, slug, display_name, visibility)
VALUES ('org_pub_123', 'github', 'GitHub Connector', 'public')
RETURNING conn_id;

INSERT INTO connectors.connector_versions (conn_id, version, mcp_spec_version, capabilities_json, manifest_hash)
VALUES ('conn_xxx', '1.0.0', '2024-11', '{"tools":["search","commit"]}', 'sha256:abc...')
RETURNING cver_id;
```

### 7.2 Submit for review → approve → release to catalog

```sql
UPDATE connectors.connector_versions
SET status='in_review'
WHERE cver_id='cver_1';

-- reviewers log events
INSERT INTO connectors.review_events (subject_type, subject_id, action, actor_id, reason)
VALUES ('connector_version', 'cver_1', 'submitted', 'staff_42', 'Initial submission');

-- internal approval
INSERT INTO connectors.approvals (subject_type, subject_id, decision, actor_id, reason)
VALUES ('connector_version', 'cver_1', 'approved', 'staff_42', 'Automated checks passed');

-- publisher flips to released & listed
UPDATE connectors.connector_versions
SET status='released', listed=true
WHERE cver_id='cver_1';
```

### 7.3 Private release for specific orgs

```sql
-- mark connector as private
UPDATE connectors.connectors SET visibility='private' WHERE conn_id='conn_xxx';

-- allow customer org to see/install
INSERT INTO connectors.org_access (conn_id, org_id, level)
VALUES ('conn_xxx', 'org_customer_9', 'private');
```

### 7.4 TestFlight (internal vs external)

```sql
-- create testflight build
INSERT INTO connectors.connector_versions (conn_id, version, mcp_spec_version, capabilities_json, manifest_hash, status)
VALUES ('conn_xxx', '1.1.0-beta1', '2024-11', '{"tools":["search","commit","issues"]}', 'sha256:def...', 'testflight')
RETURNING cver_id;

-- internal testers (dev loop, no review)
INSERT INTO connectors.beta_access (cver_id, org_id, cohort)
VALUES ('cver_beta', 'org_customer_9', 'internal');

-- external testers (requires beta approval)
INSERT INTO connectors.beta_access (cver_id, org_id, cohort)
VALUES ('cver_beta', 'org_design_partners', 'external');

INSERT INTO connectors.approvals (subject_type, subject_id, decision, actor_id)
VALUES ('connector_version.beta', 'cver_beta', 'approved', 'staff_42');
```

### 7.5 Install (passes only if allowed)

```sql
-- as admin of org_customer_9
INSERT INTO connectors.server_instances (cver_id, org_id, deploy_kind, region, desired_replicas)
VALUES ('cver_1', 'org_customer_9', 'cloud', 'eu-west-1', 2);
-- RLS check:
--   is_org_admin('org_customer_9') AND can_install_cver('cver_1','org_customer_9') = true
```

### 7.6 Read tools/transports for a version (viewable scope)

```sql
SELECT t.name, t.description
FROM connectors.tools t
WHERE t.cver_id = 'cver_1';  -- RLS relies on can_view_cver('cver_1')
```

---

## 8) Operational safeguards

* **Immutability trigger** on `connector_versions`: prevents post-release changes to critical fields.
* **Secrets isolation**: `connector_transport_secrets` (and similarly for instance secrets) are **not** granted to users; only service roles can read.
* **Review timeline**: `review_events` provides auditability for compliance.
* **Search hardening**: SECURITY DEFINER fns pin `search_path` to trusted schemas.

---

## 9) Public catalog

**`connectors.catalog_public`** (read-only view for authenticated users)

* Shows only **public**, **released**, **listed**, **approved** versions with safe metadata.
* You can later expose this to `anon` to mirror a public marketplace site.

Example:

```sql
SELECT * FROM connectors.catalog_public
ORDER BY display_name, version DESC;
```

---

## 10) Common questions & answers

**Q: Why approvals both for release and beta?**
A: Internal TestFlight doesn’t need approval (fast loop). **External** TestFlight mimics Apple’s “beta app review” to keep your brand safe. Releases always need approval.

**Q: Can I run prod on 1.0.0 while TestFlight tries 1.1.0-beta1?**
A: Yes. `beta_access` is per-version—prod keeps using released 1.0.0; beta testers install 1.1.0-beta1 side-by-side (different instances).

**Q: What if we need to pull a bad release?**
A: Set `status='yanked'`; it disappears from the catalog, and `can_install_cver()` will return false for new installs. Existing instances continue (your call: you can enforce shutdown via deploy pipeline).

**Q: How do we prevent name squatting?**
A: Slug conflicts are limited to a **publisher namespace**. Your marketplace UI can still show a global “display name” and a publisher badge (like “Acme • GitHub”).

**Q: Commerce later?**
A: Add a line in `can_install_cver()` to require `org_licenses` for certain connectors/plans. No schema rewrite needed.

---

## 11) Minimal API contract (TypeScript pseudocode)

```ts
// server-side check before provisioning
async function ensureInstallable(cverId: string, orgId: string, db: Pool) {
  const { rows } = await db.query(
    'select connectors.can_install_cver($1,$2) as ok',
    [cverId, orgId]
  );
  if (!rows[0]?.ok) throw new Error('Not installable for this org');
}

// list catalog
// (use the view; no custom joins → stable, safe columns)
const { rows: catalog } = await db.query('select * from connectors.catalog_public limit 50');

// check current user visibility on a version
const { rows: [{ ok }] } = await db.query(
  'select connectors.can_view_cver($1) as ok',
  [cverId]
);
```

---

## 12) What to monitor

* **Review SLA:** time from `in_review` → `approved`.
* **Beta conversion:** % of `testflight` that reach `released`.
* **Install failures:** count of `can_install_cver=false` to spot mis-configured access/visibility.
* **Secret access:** ensure only service role hits `connector_transport_secrets`.
* **Immutability violations:** trigger exceptions (should be zero).

---

## 13) Future-proof toggles (optional, low cost)

* **Status FSM**: add a trigger to enforce allowed transitions only.
* **Per-org install admins**: table mapping `(org_id, conn_id) → admin clerk_id` if large customer orgs need delegation.
* **Territories & pricing**: extend `org_licenses` and add “regions” to mirror App Store constraints.
* **Search**: add a `tsvector` over `connectors.search_text` for fast full-text.

---

### TL;DR

* **Simple for day 1**: one org model, one install-gate function, one place for approvals, one catalog view.
* **App-Store parity where it matters**: public/unlisted/private release, internal/external TestFlight, immutability, reviews.
* **MCP-native**: versions own multiple tools and transports; secrets handled safely.
* **Room to grow** without breaking contracts: licensing, stricter FSM, public marketplace, analytics.

This should scale cleanly from a fast-moving startup to a full marketplace, while keeping mental overhead low for both developers and operators.
