import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@lucky/shared", "@lucky/tools", "@lucky/models"],
  outputFileTracingExcludes: {
    "/api/*": [".next/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  serverExternalPackages: [
    "bullmq",
    "glob",
    "clone-deep",
    "merge-deep",
    "import-fresh",
    "cosmiconfig",
    "typescript",
    // Ensure puppeteer and stealth plugin resolve their internal dynamic requires at runtime
    "puppeteer",
    "puppeteer-extra",
    "puppeteer-extra-plugin",
    "puppeteer-extra-plugin-stealth",
    // MCP stdio requires child_process (Node.js only)
    "ai/dist/mcp-stdio",
  ],
}

export default nextConfig
