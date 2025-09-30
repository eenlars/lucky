import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"
import { createPrepareStepStrategy } from "@core/messages/pipeline/selectTool/selectToolStrategy"
import { openrouter } from "@core/utils/clients/openrouter/openrouterClient"
import { JSONN } from "@core/utils/json"
import { getDefaultModels } from "@core/core-config/compat"
import { generateText, tool, zodSchema, stepCountIs, type ToolSet } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"

const model = openrouter(getDefaultModels().medium)

// TODO: Comment "return F if it should never return that" is unclear
// Should explain what F represents and why it indicates failure
// return F if it should never return that

const nod_333 = tool({
  description: "nod_333",
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }: { input: string }) => {
    return "555"
  },
})

const mod_888 = tool({
  description: "mod_  888",
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }: { input: string }) => {
    return input === "555" ? "B" : "F"
  },
})

const rod_999 = tool({
  description: "rod_999",
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }: { input: string }) => {
    return input === "B" ? "9" : "F"
  },
})

// TODO: These "unnecessary tools" are actually used to test tool filtering
// Comment should explain their purpose in the test
// define a few unnecessary tools
const rod_333 = tool({
  description: "rod_333", // should be ignored, it's rod-333, not nod-333
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }: { input: string }) => {
    return "F"
  },
})

const mod_333 = tool({
  description: "mod_333", // should be ignored, it's mod-333, not nod-333
  inputSchema: zodSchema(
    z.object({
      input: z.string(),
    })
  ),
  execute: async ({ input }: { input: string }) => {
    return "F"
  },
})

// TODO: These integration tests make real API calls - should be excluded from main suite
// TODO: Missing error case testing - what if strategy selection fails?
describe("generateText with createPrepareStepStrategy", () => {
  it("should execute tools in sequence using step strategy: tool1 -> tool2 -> tool3", async () => {
    const tools: ToolSet = {
      nod_333,
      rod_333,
      mod_333,
      mod_888,
      rod_999,
    }

    const systemPrompt =
      "You must first run nod_333, then mod_888 with nod_333's output, then rod_999 with mod_888's output."
    const userPayload = "Execute the three tools in sequence"

    const prepareStep = createPrepareStepStrategy(tools, systemPrompt, userPayload)

    const result = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPayload,
        },
      ],
      tools,
      stopWhen: stepCountIs(5),
      experimental_prepareStep: prepareStep,
    })

    // convert to v2
    const resultV2 = processStepsV2(result.steps, getDefaultModels().medium)

    console.log(JSONN.show(resultV2))

    expect(resultV2?.agentSteps).toBeDefined()
    expect(resultV2?.agentSteps.length).toBeGreaterThan(0)

    const tool1Result = resultV2?.agentSteps.find((r) => r.name === "nod_333")
    const tool2Result = resultV2?.agentSteps.find((r) => r.name === "mod_888")
    const tool3Result = resultV2?.agentSteps.find((r) => r.name === "rod_999")

    expect(tool1Result?.return).toEqual("555")
    expect(tool2Result?.return).toEqual("B")
    expect(tool3Result?.return).toEqual("9")
  }, 30000)

  it("should execute tools in sequence with strategy despite large irrelevant context", async () => {
    const tools = {
      nod_333,
      rod_333,
      mod_333,
      mod_888,
      rod_999,
    }

    const systemPrompt =
      "You must first run nod_333, then mod_888 with nod_333's output, then rod_999 with mod_888's output. Execute the tools in this exact sequence."
    const userPayload = "Execute the three tools in sequence"

    const prepareStep = createPrepareStepStrategy(tools, systemPrompt, userPayload)

    const result = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPayload,
        },
        {
          role: "assistant",
          content: `The history of the internet is a fascinating journey that began in the late 1960s with ARPANET, a project funded by the United States Department of Defense. This groundbreaking network connected four universities and laid the foundation for what would become the global internet we know today. Throughout the 1970s, researchers developed crucial protocols like TCP/IP, which allowed different networks to communicate with each other, creating the concept of internetworking.

The 1980s saw significant expansion as the National Science Foundation created NSFNET, connecting academic institutions across the United States. During this period, the Domain Name System (DNS) was introduced, making it easier to navigate the growing network by using memorable names instead of numerical IP addresses. Email became increasingly popular, and the first Internet Service Providers began to emerge, though commercial use was still restricted.

The World Wide Web revolutionized the internet in the early 1990s when Tim Berners-Lee created HTML, HTTP, and the first web browser at CERN. This innovation transformed the internet from a text-based system primarily used by academics and researchers into a multimedia platform accessible to the general public. The removal of commercial restrictions in 1991 opened the floodgates for business and consumer adoption.

The mid-1990s witnessed explosive growth as companies like Netscape, Yahoo, and Amazon emerged. The browser wars between Netscape Navigator and Microsoft's Internet Explorer shaped how people accessed the web. Dial-up connections gave way to broadband, dramatically increasing connection speeds and enabling new applications. The dot-com boom created tremendous excitement and investment, though it would eventually lead to a significant market correction in 2000.

The early 2000s brought Web 2.0, emphasizing user-generated content and social interaction. Platforms like MySpace, Facebook, and YouTube transformed how people communicated and shared information online. Smartphones and mobile internet access became increasingly prevalent, with the iPhone's launch in 2007 marking a pivotal moment in mobile computing. Cloud computing emerged as a dominant paradigm, changing how data was stored and applications were delivered.

The 2010s saw the rise of social media as a dominant force in communication and politics. Streaming services like Netflix and Spotify revolutionized entertainment consumption. The Internet of Things began connecting everyday devices to the network, from thermostats to refrigerators. Concerns about privacy, security, and the power of tech companies became increasingly prominent in public discourse.

Today, the internet continues to evolve with emerging technologies like 5G networks, artificial intelligence, and blockchain. The COVID-19 pandemic accelerated digital transformation across industries, highlighting the internet's critical role in modern society. From remote work and education to telemedicine and e-commerce, the internet has become an indispensable part of daily life for billions of people worldwide.

The future of the internet promises even more dramatic changes with developments in quantum computing, augmented reality, and brain-computer interfaces. As we look ahead, questions about digital sovereignty, net neutrality, and equitable access remain crucial challenges that society must address. The internet's evolution from a small research network to a global communication platform represents one of humanity's most significant technological achievements.

Now, let me execute the tools as requested.`,
        },
      ],
      tools,
      stopWhen: stepCountIs(5),
      experimental_prepareStep: prepareStep,
    })

    // TODO: Using different model (nano) for processing than generation (medium)
    // This could cause cost calculation errors
    // convert to v2
    const resultV2 = processStepsV2(result.steps, getDefaultModels().nano)

    console.log(JSONN.show(resultV2))

    expect(resultV2?.agentSteps).toBeDefined()
    expect(resultV2?.agentSteps.length).toBeGreaterThan(0)

    const tool1Result = resultV2?.agentSteps.find((r) => r.name === "nod_333")
    const tool2Result = resultV2?.agentSteps.find((r) => r.name === "mod_888")
    const tool3Result = resultV2?.agentSteps.find((r) => r.name === "rod_999")

    expect(tool1Result?.return).toEqual("555")
    expect(tool2Result?.return).toEqual("B")
    expect(tool3Result?.return).toEqual("9")
  }, 30000)
})
