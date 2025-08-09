import { createRequire } from "node:module"
import * as path from "node:path"

/**
 * Resolve a file shipped in @lucky/core using Node's module resolution.
 * This avoids repo-relative paths and mirrors how large orgs treat internal packages.
 */
export function resolveCoreFile(...segments: string[]): string {
  const require = createRequire(import.meta.url)
  const base = path.dirname(require.resolve("@lucky/core/package.json"))
  return path.join(base, ...segments)
}
