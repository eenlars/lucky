import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@lucky/shared"],
  serverExternalPackages: [
    "bullmq",
    // Ensure puppeteer and stealth plugin resolve their internal dynamic requires at runtime
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin",
    "puppeteer-extra-plugin-stealth",
  ],
  /* config options here */
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve these Node.js modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        url: false,
        module: false,
        perf_hooks: false,
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
