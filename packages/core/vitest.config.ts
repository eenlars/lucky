/**
 * Package-specific Vitest config for @lucky/core
 *
 * For DX: allows running `bunx vitest` inside the package directory
 * Uses shared config from @lucky/test-config
 */
import { baseConfig } from "@lucky/test-config/vitest.base"

export default baseConfig({
  test: {
    include: ["packages/core/src/**/*.test.{ts,tsx}", "packages/core/src/**/*.spec.test.{ts,tsx}"],
    exclude: ["**/e2e/**", "**/.core-data/**", "**/logs/**", "**/backups/**", "**/*.tmp"],
    coverage: {
      include: ["packages/core/src/**/*.{ts}"],
      exclude: [
        "**/.core-data/**",
        "**/logs/**",
        "**/backups/**",
        "**/*.tmp",
        "**/*.d.ts",
        "**/__mocks__/**",
        "**/debug/**",
        "**/*.debug.*",
        "**/mocks/**",
        "**/examples/**",
        "**/scripts/**",
      ],
    },
    server: {
      deps: {
        inline: [/(?!.*)/],
        external: ["puppeteer", "puppeteer-extra", "puppeteer-extra-plugin", "puppeteer-extra-plugin-stealth"],
      },
      watch: {
        ignored: ["**/.core-data/**", "**/logs/**", "**/backups/**", "**/*.tmp"],
      },
    },
  },
})
