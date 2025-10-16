/**
 * Package-specific Vitest config for @lucky/mcp-server
 * For DX: allows running `bunx vitest` inside the package directory
 */
import { baseConfig } from "@lucky/test-config/vitest.base"

export default baseConfig({
  test: {
    include: ["packages/mcp-server/src/**/*.test.{ts,tsx}", "packages/mcp-server/src/**/*.spec.test.{ts,tsx}"],
  },
})
