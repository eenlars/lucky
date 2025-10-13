/**
 * Shared runtime constants mock for tests
 * RE-EXPORTS from @lucky/shared/contracts/fixtures
 */

import { createMinimalTestConfig } from "@lucky/shared/contracts/fixtures"

export const mockRuntimeConstants = () => {
  // Create fresh copy for each invocation to avoid test contamination
  const minimal = createMinimalTestConfig()

  return {
    CONFIG: {
      ...minimal,
      // Add legacy fields that tests expect
      tools: {
        ...minimal.tools,
        inactive: new Set(),
        defaultTools: new Set(),
      },
      models: {
        ...minimal.models,
        inactive: new Set(),
      },
    } as any,
    // Mock model defaults for tests (no longer in runtime config)
    MODELS: {
      summary: "gpt-4o-mini",
      nano: "gpt-5-nano",
      low: "gpt-4o-mini",
      medium: "gpt-4o",
      high: "gpt-4o",
      default: "gpt-5-nano",
      fitness: "gpt-4o-mini",
      reasoning: "gpt-4o",
      fallback: "gpt-4o-mini",
    },
    PATHS: {
      root: "/test/root",
      app: "/test/app",
      runtime: "/test/runtime",
      codeTools: "/test/codeTools",
      setupFile: "/test/setup.json",
      improver: "/test/improver",
      node: {
        logging: "/test/node/logging",
        memory: {
          root: "/test/memory/root",
          workfiles: "/test/memory/workfiles",
        },
        error: "/test/node/error",
      },
    },
  }
}
