import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq"],
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
      "puppeteer-extra-plugin-stealth":
        "commonjs puppeteer-extra-plugin-stealth",
      "puppeteer-extra-plugin": "commonjs puppeteer-extra-plugin",
    })

    return config
  },
}

export default nextConfig
