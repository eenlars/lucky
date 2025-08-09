import { processStepsV2 } from "@core/messages/api/stepProcessor"
import { openrouter } from "@core/utils/clients/openrouter/openrouterClient"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import { generateText, tool } from "ai"
import { describe, expect, it } from "vitest"
import { z } from "zod"
const tool1 = tool({
  description: "nod-333",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }: { input: string }) => {
    return "555"
  },
})

const tool2 = tool({
  description: "mod-888",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }: { input: string }) => {
    return input === "555" ? "B" : "2"
  },
})

const tool3 = tool({
  description: "rod-999",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }: { input: string }) => {
    return input === "B" ? "9" : "C"
  },
})

describe("generateText with sequential tools", () => {
  it("should execute tools in sequence: tool1 -> tool2 -> tool3 with little extra context", async () => {
    const result = await generateText({
      model: openrouter("anthropic/claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "system",
          content:
            "You must first run nod-333, then mod-888 with nod-333's output, then rod-999 with mod-888's output.",
        },
        {
          role: "user",
          content: "Execute the three tools in sequence",
        },
      ],
      tools: {
        tool3,
        tool1,
        tool2,
      },
      maxSteps: 5,
    })

    // convert to v2
    const resultV2 = processStepsV2(result.steps, getDefaultModels().default)

    console.log(JSONN.show(resultV2))

    expect(resultV2?.agentSteps).toBeDefined()
    expect(resultV2?.agentSteps.length).toBeGreaterThan(0)

    const tool1Result = resultV2?.agentSteps.find((r) => r.name === "tool1")
    const tool2Result = resultV2?.agentSteps.find((r) => r.name === "tool2")
    const tool3Result = resultV2?.agentSteps.find((r) => r.name === "tool3")

    expect(tool1Result?.return).toEqual("555")
    expect(tool2Result?.return).toEqual("B")
    expect(tool3Result?.return).toEqual("9")
  }, 30000) //

  it("should execute tools in sequence despite large irrelevant context", async () => {
    const result = await generateText({
      model: openrouter("anthropic/claude-3-5-sonnet-20241022"),
      messages: [
        {
          role: "system",
          content:
            "You must first run nod-333, then mod-888 with nod-333's output, then rod-999 with mod-888's output. Execute the tools in this exact sequence.",
        },
        {
          role: "user",
          content: "Execute the three tools in sequence",
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
      tools: {
        tool3,
        tool1,
        tool2,
      },
      maxSteps: 5,
    })

    // convert to v2
    const resultV2 = processStepsV2(result.steps, getDefaultModels().default)

    console.log(JSONN.show(resultV2))

    expect(resultV2?.agentSteps).toBeDefined()
    expect(resultV2?.agentSteps.length).toBeGreaterThan(0)

    const tool1Result = resultV2?.agentSteps.find((r) => r.name === "tool1")
    const tool2Result = resultV2?.agentSteps.find((r) => r.name === "tool2")
    const tool3Result = resultV2?.agentSteps.find((r) => r.name === "tool3")

    expect(tool1Result?.return).toEqual("555")
    expect(tool2Result?.return).toEqual("B")
    expect(tool3Result?.return).toEqual("9")
  }, 30000)
})
