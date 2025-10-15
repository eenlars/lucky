// tsup.config.ts
import { defineConfig } from "tsup"

export default defineConfig([
  // Browser-safe main and client builds
  {
    entry: {
      index: "src/index.ts",
      client: "src/client.ts",
      env: "src/env.ts",
      "env-models": "src/env-models.ts",
      "supabase-credentials.client": "src/supabase-credentials.client.ts",
      "contracts/agent": "src/contracts/agent.ts",
      "contracts/config": "src/contracts/config.ts",
      "contracts/evolution": "src/contracts/evolution.ts",
      "contracts/ingestion": "src/contracts/ingestion.ts",
      "contracts/invoke": "src/contracts/invoke.ts",
      "contracts/messages": "src/contracts/messages.ts",
      "contracts/providers": "src/contracts/providers.ts",
      "contracts/runtime": "src/contracts/runtime.ts",
      "contracts/tools": "src/contracts/tools.ts",
      "contracts/workflow": "src/contracts/workflow.ts",
      "contracts/fixtures": "src/contracts/fixtures.ts",
      "contracts/feedback": "src/contracts/feedback.ts",
      "contracts/mcp": "src/contracts/mcp.ts",
      "utils/validateJsonSchema": "src/utils/validateJsonSchema.ts",
    },
    format: ["esm"],
    platform: "browser",
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    target: "es2020",
    tsconfig: "./tsconfig.build.json",
    treeshake: true,
    external: ["@lucky/models"],
  },
  // Node.js-only subpaths
  {
    entry: {
      "fs/paths": "src/fs/paths.ts",
      "csv/index": "src/csv/index.ts",
      "supabase-credentials.server": "src/supabase-credentials.server.ts",
      "utils/fs/fileSaver": "src/utils/fs/fileSaver.ts",
      "utils/observability/obs": "src/utils/observability/obs.ts",
    },
    format: ["esm"],
    platform: "node",
    dts: false,
    sourcemap: true,
    clean: false,
    splitting: false,
    target: "node18",
    tsconfig: "./tsconfig.build.json",
    treeshake: true,
  },
])
