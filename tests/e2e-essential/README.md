### Essential E2E (golden-trace gate)

- **What this is**: A tiny, deterministic e2e layer (smoke + gate) that guards critical behavior using a golden hash. It complements existing `*.integration.test.*`.

- **How it works**:
  - Tests normalize a JSON artifact (strip timestamps/ids) and compute a sha256 via `utils/goldenTrace.ts`.
  - The gate compares the live hash to a committed golden at `golden/workflow-basics.hash`.
  - If they differ, the gate fails (prevents pushes).

- **Why this is stable**:
  - Uses workspace package resolution to locate a fixture inside `@lucky/core` (no `cwd`, no repo-relative paths).
  - Current fixture: `@lucky/core/src/messages/api/__tests__/resources/toolResponseNoToolUsed.json`.

- **Local commands**:
  - Smoke: `bun run test:smoke`
  - Gate: `bun run test:gate`
  - Update golden (after intentional change):
    ```bash
    bunx tsx tests/e2e-essential/scripts/update-golden.ts
    ```

- **Git hooks** (Husky):
  - Pre-commit: runs smoke
  - Pre-push: runs gate

- **Add a new essential check** (optional):
  - Add a spec under `gate/` that hashes a stable JSON artifact.
  - Add/update a matching file under `golden/` via the update script.
