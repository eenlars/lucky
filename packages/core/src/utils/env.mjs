import { createEnv } from "@t3-oss/env-nextjs"
import { supabaseServer, aiProviders, searchProviders, toolProviders, coreToggles } from "@lucky/shared/env-models"

/**
 * Core package environment validation (server-only).
 * Uses shared schemas from @lucky/shared/env-models as the single source of truth.
 *
 * NOTE: This package has no client-side code, so client section is empty.
 * Import from this module instead of using process.env directly.
 */
export const envi = createEnv({
  server: {
    ...supabaseServer.shape,
    ...aiProviders.shape,
    ...searchProviders.shape,
    ...toolProviders.shape,
    ...coreToggles.shape,
  },
  client: {},
  runtimeEnv: process.env,
})
