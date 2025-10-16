/**
 * Root Vitest workspace configuration
 *
 * Re-exports the shared workspace configuration from @lucky/test-config
 * This allows running tests with clear project names:
 * - bunx vitest -w -p pkg-unit
 * - bunx vitest -w -p pkg-int
 * - bunx vitest -w -p app-unit
 * - bunx vitest -w -p app-int
 * - bunx vitest -w -p xrepo
 * - bunx vitest -w -p e2e
 */
export { default } from "./packages/test-config/src/workspace"
