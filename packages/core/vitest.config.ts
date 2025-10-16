/**
 * Package-specific Vitest config for @lucky/core
 * For DX: allows running `bunx vitest` inside the package directory
 */
import { baseConfig } from "@repo/test-config/vitest.base"

export default baseConfig({
  test: {
    include: ["packages/core/src/**/*.test.{ts,tsx}", "packages/core/src/**/*.spec.test.{ts,tsx}"],
  },
})
