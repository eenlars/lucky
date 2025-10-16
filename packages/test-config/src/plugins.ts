import tsconfigPaths from "vite-tsconfig-paths"

export function tsPathsFor(...projects: string[]) {
  return tsconfigPaths({ projects })
}
