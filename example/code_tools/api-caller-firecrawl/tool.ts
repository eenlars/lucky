import FirecrawlApp, { type ExtractParams } from "@mendable/firecrawl-js"
import { defineTool } from "@core/tools/toolFactory"
import { z } from "zod"

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
})

/**
 * Simple file saver tool using the new defineTool approach
 */
const firecrawlTool = defineTool({
  name: "firecrawlAPI",
  params: z.object({
    url: z.string(),
    prompt: z.string(),
    schema: z.any().nullish(),
  }),
  async execute(params) {
    const options: ExtractParams = {
      prompt:
        params.prompt ||
        `extract all store locations in the Netherlands with complete addresses from this page. 
        Include all types of stores (normal stores, body spas, shop-in-shop). 
        Provide the data in JSON format with fields: store_name, address, postal_code, city, store_type.
        The data should be in the following format:
        `,
      schema: params.schema || {
        type: "object",
        properties: {
          store_name: { type: "string" },
          address: { type: "string" },
          postal_code: { type: "string" },
          city: { type: "string" },
          store_type: { type: "string" },
          phone: { type: "string" },
        },
        required: [
          "store_name",
          "address",
          "postal_code",
          "city",
          "store_type",
          "phone",
        ],
      },
      agent: { model: "fire-1" },
    }
    const response = await app.extract([params.url], options)
    if (!response.success) {
      return { success: false, data: response.error }
    }
    return { success: true, data: response.data }
  },
})

export const tool = firecrawlTool
