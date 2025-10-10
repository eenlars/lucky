/**
 * Shared runtime constants mock for tests
 * RE-EXPORTS from @lucky/contracts/fixtures
 */

import { createMinimalTestConfig } from "@lucky/contracts/fixtures"

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
    MODELS: minimal.models.defaults,
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
