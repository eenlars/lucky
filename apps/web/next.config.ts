import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@lucky/shared", "@lucky/tools"],
  serverExternalPackages: [
    "bullmq",
    "glob",
    // Ensure puppeteer and stealth plugin resolve their internal dynamic requires at runtime
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin",
    "puppeteer-extra-plugin-stealth",
    // MCP stdio requires child_process (Node.js only)
    "ai/dist/mcp-stdio",
  ],
  /* config options here */
  webpack: (config, { isServer }) => {
    // Exclude scraping scripts from build (server-only scripts)
    config.module = config.module || {}
    config.module.rules = config.module.rules || []
    config.module.rules.push(
      {
        test: /src\/lib\/scraping\/.*/,
        use: "null-loader",
      },
      {
        test: /src\/app\/api\/help\/get-countries-operation\/.*/,
        use: "null-loader",
      },
      {
        test: /src\/app\/api\/url\/.*/,
        use: "null-loader",
      },
    )

    if (!isServer) {
      // Don't resolve these Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        url: false,
        module: false,
        perf_hooks: false,
        stream: false,
        events: false,
        crypto: false,
        glob: false,
        child_process: false,
      }
    }

    // Externalize problematic packages for server-side rendering
    config.externals = config.externals || []
    config.externals.push({
      "clone-deep": "commonjs clone-deep",
      "merge-deep": "commonjs merge-deep",
      "puppeteer-extra-plugin-stealth": "commonjs puppeteer-extra-plugin-stealth",
      "puppeteer-extra-plugin": "commonjs puppeteer-extra-plugin",
      "import-fresh": "commonjs import-fresh",
      cosmiconfig: "commonjs cosmiconfig",
      puppeteer: "commonjs puppeteer",
      typescript: "commonjs typescript",
    })

    return config
  },
}

export default nextConfig
