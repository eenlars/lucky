/**
 * Generate test fixtures using Vercel AI SDK v5
 *
 * Simple script that makes real API calls and saves responses
 * Run with: bun run core/scripts/generate-fixtures.ts
 */

import { generateText, stepCountIs, tool, zodSchema } from "ai"
import { mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { z } from "zod"
import { getDefaultModels } from "../../runtime/settings/models"
import { getLanguageModel } from "../src/messages/api/modelFactory"

// Output directory
const OUTPUT_DIR = join(__dirname, "generated-fixtures")

// Mock tools for testing
const tool1 = tool({
  description: "first tool - returns fixed value",
  inputSchema: zodSchema(
    z.object({
      input: z.string().optional(),
    })
  ),
  execute: async () => "result1",
})

const tool2 = tool({
  description: "second tool - processes input",
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }) => `processed_${input}`,
})

const tool3 = tool({
  description: "third tool - returns final result",
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }) => `final_${input}`,
})

const saveFixture = (filename: string, data: any) => {
  mkdirSync(OUTPUT_DIR, { recursive: true })
  const filepath = join(OUTPUT_DIR, filename)
  writeFileSync(filepath, JSON.stringify(data, null, 2))
  console.log(`✓ Saved ${filename}`)
}

const generateFixtures = async () => {
  console.log("Generating v5 fixtures...")
  const model = getLanguageModel(getDefaultModels().default)

  try {
    // 1. Text-only response
    console.log("Generating text-only response...")
    const textResult = await generateText({
      model,
      messages: [{ role: "user", content: "Say 'I understand. not possible.'" }],
    })
    saveFixture("text-response.json", textResult)

    // 2. Single tool call
    console.log("Generating single tool response...")
    const singleToolResult = await generateText({
      model,
      messages: [{ role: "user", content: "Use the first tool to get a result" }],
      tools: { tool1 },
    })
    saveFixture("single-tool.json", singleToolResult)

    // 3. Tool chain (sequential)
    console.log("Generating tool chain response...")
    const toolChainResult = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: "Use tool1 first, then tool2 with tool1's result, then tool3 with tool2's result",
        },
        { role: "user", content: "Execute the tools in sequence" },
      ],
      tools: { tool1, tool2, tool3 },
      stopWhen: stepCountIs(5),
    })
    saveFixture("tool-chain.json", toolChainResult)

    // 4. Multiple parallel tools
    console.log("Generating multiple tools response...")
    const multiToolResult = await generateText({
      model,
      messages: [{ role: "user", content: "Use both tool1 and tool3 to get results" }],
      tools: { tool1, tool3 },
      stopWhen: stepCountIs(3),
    })
    saveFixture("multi-tools.json", multiToolResult)

    console.log("\n✅ All fixtures generated successfully!")
    console.log(`Output directory: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error("❌ Error generating fixtures:", error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  generateFixtures()
}

export { generateFixtures }
