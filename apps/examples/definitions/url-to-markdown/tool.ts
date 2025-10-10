import { htmlToMarkdown } from "@examples/definitions/url-to-markdown/function"
import { Tools } from "@lucky/shared"
import { type CodeToolResult, defineTool } from "@lucky/tools"
import { z } from "zod"

const toolName = "urlToMarkdown"
/**
 * html to markdown converter tool - strips unnecessary content and converts to clean markdown
 */
const htmlToMarkdownTool = defineTool({
  name: "urlToMarkdown",
  description:
    "Convert URL content to clean markdown, removing ads/navigation/scripts. Preserves main content, links, images. Falls back to Jina AI if direct fetch fails. CANNOT: handle authentication-required pages, extract from PDFs/videos, preserve complex layouts/tables, or handle JavaScript-rendered content.",
  params: z.object({
    url: z.string().describe("The URL to convert to markdown"),
    preserveLinks: z.boolean().nullish().default(true).describe("Whether to preserve links in markdown"),
    preserveImages: z.boolean().nullish().default(true).describe("Whether to preserve images in markdown"),
  }),
  async execute(params): Promise<CodeToolResult<string>> {
    const { url, preserveLinks = true, preserveImages = true } = params

    if (!url) {
      return Tools.createFailure(toolName, {
        location: "urlToMarkdown:!url",
        error: "URL is required",
      })
    }

    try {
      const result = await htmlToMarkdown({
        url,
        preserveLinks: preserveLinks ? "only-show-links" : "none",
        preserveImages: preserveImages ? "only-show-images" : "none",
      })
      return Tools.createSuccess(toolName, result.markdown)
    } catch (error) {
      return Tools.createFailure(toolName, {
        location: "urlToMarkdown:error",
        error: error,
      })
    }
  },
})

export default htmlToMarkdownTool
