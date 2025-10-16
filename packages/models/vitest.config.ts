/**
 * Package-specific Vitest config for @lucky/models
 * For DX: allows running `bunx vitest` inside the package directory
 */
import { baseConfig } from "@lucky/test-config/vitest.base"

export default baseConfig({
  test: {
    include: ["packages/models/src/**/*.test.{ts,tsx}", "packages/models/src/**/*.spec.test.{ts,tsx}"],
  },
})
