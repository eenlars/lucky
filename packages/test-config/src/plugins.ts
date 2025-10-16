import tsconfigPaths from "vite-tsconfig-paths"

/**
 * Helper to configure TypeScript path resolution for tests
 */
export function tsPathsFor(...projects: string[]) {
  return tsconfigPaths({ projects })
}
