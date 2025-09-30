import { lgg } from "@core/utils/logging/Logger"
import { fetcher } from "@examples/code_tools/url-to-markdown/fetcher"
import { processHtmlToMarkdown, type ProcessHtmlToMarkdownResult } from "@examples/code_tools/url-to-markdown/process"

type HtmlToMarkdownOptions = {
  url: string
  preserveLinks?: "only-show-links" | "none" | "keep-links"
  preserveImages?: "only-show-images" | "none" | "keep-images"
}

async function tryJinaFallback(url: string): Promise<string> {
  lgg.log(`trying jina ai fallback for: ${url}`)

  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetcher(jinaUrl)

    if (response.status >= 400) {
      throw new Error(`jina ai returned ${response.status}`)
    }

    const markdown = await response.text()

    if (!markdown || markdown.trim().length === 0) {
      throw new Error("jina ai returned empty content")
    }

    lgg.log(`jina ai fallback successful, content length: ${markdown.length}`)
    return markdown
  } catch (error) {
    lgg.log(`jina ai fallback failed: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

export async function htmlToMarkdown({
  url,
  preserveLinks = "keep-links",
  preserveImages = "keep-images",
}: HtmlToMarkdownOptions): Promise<ProcessHtmlToMarkdownResult> {
  try {
    lgg.log(`attempting to fetch url: ${url}`)

    const response = await fetcher(url)

    // check if response is ok
    if (response.status >= 400) {
      throw new Error(`http error ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    if (!html || html.trim().length === 0) {
      throw new Error(`empty response from url: ${url}`)
    }

    lgg.log(`successfully fetched html, length: ${html.length}`)

    return processHtmlToMarkdown(html, preserveLinks, preserveImages, url)
  } catch (error) {
    lgg.error(`fetch error for url ${url}:`, String(error).substring(0, 200))

    // try jina ai fallback
    try {
      const markdown = await tryJinaFallback(url)
      return {
        markdown,
        originalLength: markdown.length,
        markdownLength: markdown.length,
        compressionRatio: 1,
        url,
        extractedFrom: url,
      }
    } catch (jinaError) {
      lgg.error(`jina fallback also failed:`, String(jinaError).substring(0, 200))
    }

    if (error instanceof Error) {
      // more specific error categorization
      if (error.message.includes("timeout")) {
        throw new Error(`timeout fetching ${url}: ${error.message.substring(0, 200)}`)
      }
      if (error.message.includes("invalid url")) {
        throw new Error(`invalid url: ${url}`)
      }
      if (error.message.includes("http error")) {
        throw new Error(`server error for ${url}: ${error.message.substring(0, 200)}`)
      }
      if (error.message.includes("Failed to fetch") || error.message.includes("network")) {
        throw new Error(`network error fetching ${url}: ${error.message.substring(0, 200)}`)
      }
    }

    throw new Error(
      `failed to convert html to markdown: ${error instanceof Error ? error.message.substring(0, 200) : "unknown error"}`,
    )
  }
}
