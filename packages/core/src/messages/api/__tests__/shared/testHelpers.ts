import { getDefaultModels } from "@core/core-config/coreConfig"
/**
 * Shared test helper functions for API integration tests
 * Consolidates duplicate test patterns and eliminates verbose boilerplate
 */
import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"

import { JSONN } from "@lucky/shared"
import type { GenerateTextResult, ToolSet } from "ai"

/**
 * Processes and validates test results with common assertions
 * Replaces repeated processStepsV2 + assertion patterns across 25+ test files
 */
export const processAndValidateSteps = (
  result: GenerateTextResult<ToolSet, unknown>,
  model?: string,
  options?: {
    skipConsoleLog?: boolean
    minSteps?: number
  },
): ReturnType<typeof processStepsV2> => {
  const { skipConsoleLog = false, minSteps = 1 } = options || {}

  const resultV2 = processStepsV2(result.steps, model || getDefaultModels().default)

  // Optional debug output (controlled to reduce console noise)
  if (!skipConsoleLog) {
    console.log(JSONN.show(resultV2))
  }

  // Standard validations
  expect(resultV2?.agentSteps).toBeDefined()
  expect(resultV2?.agentSteps.length).toBeGreaterThan(minSteps - 1)

  return resultV2
}

/**
 * Validates sequential tool execution results
 * Consolidates the repeated pattern of finding and asserting tool results
 */
export const validateSequentialExecution = (
  resultV2: any,
  expectedResults: Record<string, string>,
  toolNames?: string[],
) => {
  const defaultNames = ["tool1", "tool2", "tool3"]
  const names = toolNames || defaultNames

  const toolResults = names.map(name => resultV2?.agentSteps.find((r: any) => r.name === name))

  // Validate all tools executed
  toolResults.forEach((result, index) => {
    expect(result).toBeDefined()
    expect(result?.return).toEqual(expectedResults[names[index]])
  })

  return toolResults
}

/**
 * Creates test timeout configuration
 * Standardizes timeout values and provides documentation
 */
export const TEST_TIMEOUTS = {
  // For tests that make real API calls to language models
  integration: 30000,
  // For unit tests with mocked dependencies
  unit: 5000,
  // For E2E tests
  e2e: 60000,
} as const

/**
 * Standard test messages with context variations
 * Reduces duplication of large context blocks in tests
 */
export const createTestMessages = (systemPrompt: string, userMessage: string, includeContext = false) => {
  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: userMessage,
    },
  ]

  if (includeContext) {
    messages.push({
      role: "user" as const,
      content: LARGE_CONTEXT_BLOCK,
    })
  }

  return messages
}

/**
 * Large context block for testing model behavior with irrelevant context
 * Consolidates the repeated internet history text across test files
 */
const LARGE_CONTEXT_BLOCK = `The history of the internet is a fascinating journey that began in the late 1960s with ARPANET, a project funded by the United States Department of Defense. This groundbreaking network connected four universities and laid the foundation for what would become the global internet we know today. Throughout the 1970s, researchers developed crucial protocols like TCP/IP, which allowed different networks to communicate with each other, creating the concept of internetworking.

The 1980s saw significant expansion as the National Science Foundation created NSFNET, connecting academic institutions across the United States. During this period, the Domain Name System (DNS) was introduced, making it easier to navigate the growing network by using memorable names instead of numerical IP addresses. Email became increasingly popular, and the first Internet Service Providers began to emerge, though commercial use was still restricted.

The World Wide Web revolutionized the internet in the early 1990s when Tim Berners-Lee created HTML, HTTP, and the first web browser at CERN. This innovation transformed the internet from a text-based system primarily used by academics and researchers into a multimedia platform accessible to the general public. The removal of commercial restrictions in 1991 opened the floodgates for business and consumer adoption.

The mid-1990s witnessed explosive growth as companies like Netscape, Yahoo, and Amazon emerged. The browser wars between Netscape Navigator and Microsoft's Internet Explorer shaped how people accessed the web. Dial-up connections gave way to broadband, dramatically increasing connection speeds and enabling new applications. The dot-com boom created tremendous excitement and investment, though it would eventually lead to a significant market correction in 2000.

The early 2000s brought Web 2.0, emphasizing user-generated content and social interaction. Platforms like MySpace, Facebook, and YouTube transformed how people communicated and shared information online. Smartphones and mobile internet access became increasingly prevalent, with the iPhone's launch in 2007 marking a pivotal moment in mobile computing. Cloud computing emerged as a dominant paradigm, changing how data was stored and applications were delivered.

The 2010s saw the rise of social media as a dominant force in communication and politics. Streaming services like Netflix and Spotify revolutionized entertainment consumption. The Internet of Things began connecting everyday devices to the network, from thermostats to refrigerators. Concerns about privacy, security, and the power of tech companies became increasingly prominent in public discourse.

Today, the internet continues to evolve with emerging technologies like 5G networks, artificial intelligence, and blockchain. The COVID-19 pandemic accelerated digital transformation across industries, highlighting the internet's critical role in modern society. From remote work and education to telemedicine and e-commerce, the internet has become an indispensable part of daily life for billions of people worldwide.

The future of the internet promises even more dramatic changes with developments in quantum computing, augmented reality, and brain-computer interfaces. As we look ahead, questions about digital sovereignty, net neutrality, and equitable access remain crucial challenges that society must address. The internet's evolution from a small research network to a global communication platform represents one of humanity's most significant technological achievements.

Now, let me execute the tools as requested.`

/**
 * Helper for creating test configurations with common patterns
 */
export const createTestConfig = (
  tools: ToolSet,
  messages: any[],
  options?: {
    stepCount?: number
    timeout?: number
    prepareStep?: any
  },
) => {
  const { stepCount = 5, timeout = TEST_TIMEOUTS.integration, prepareStep } = options || {}

  return {
    tools,
    messages,
    stepCount,
    timeout,
    prepareStep,
  }
}
