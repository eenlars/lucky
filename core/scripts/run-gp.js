#!/usr/bin/env node

import { execSync } from "child_process"

// Build the command with all arguments passed through
const args = process.argv.slice(2)

// Ensure --mode=GP is included if not specified
if (!args.some(arg => arg.startsWith("--mode="))) {
  args.push("--mode=GP")
}

const command = ["rm -rf src/examples/logging_folder", "&&", "tsx --env-file=.env src/main.ts", ...args].join(" ")

// Execute the command
try {
  execSync(command, { stdio: "inherit" })
} catch (error) {
  process.exit(1)
}
