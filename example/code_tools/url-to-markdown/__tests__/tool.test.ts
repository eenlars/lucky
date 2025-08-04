import { describe, expect, it } from "vitest"
import { processHtmlToMarkdown } from "../process"

describe("html to markdown converter", () => {
  it("should convert basic html to markdown", async () => {
    const html = `
      <html>
        <head><title>test</title></head>
        <body>
          <script>lgg.log('remove me')</script>
          <nav>navigation</nav>
          <article>
            <h1>main heading</h1>
            <p>this is a <strong>paragraph</strong> with <em>emphasis</em>.</p>
            <ul>
              <li>list item 1</li>
              <li>list item 2</li>
            </ul>
          </article>
          <footer>footer content</footer>
        </body>
      </html>
    `

    const result = await processHtmlToMarkdown(html)

    expect(result.markdown).toContain("# main heading")
    expect(result.markdown).toContain("**paragraph**")
    expect(result.markdown).toContain("*emphasis*")
    expect(result.markdown).toContain("- list item 1")
    expect(result.markdown).not.toContain("lgg.log")
    expect(result.markdown).not.toContain("navigation")
    expect(result.markdown).not.toContain("footer content")
    expect(result.originalLength).toBeGreaterThan(0)
    expect(result.markdownLength).toBeGreaterThan(0)
    expect(result.compressionRatio).toBeGreaterThan(0)
  })

  it("should handle links and images based on options", async () => {
    const html = `
      <article>
        <p>check out <a href="https://example.com">this link</a></p>
        <img src="image.jpg" alt="test image" />
      </article>
    `

    const withLinks = await processHtmlToMarkdown(html, "only-show-links")
    const withoutLinks = await processHtmlToMarkdown(html, "none")

    expect(withLinks.markdown).toContain("[this link](https://example.com)")
    expect(withoutLinks.markdown).toContain("this link")
    expect(withoutLinks.markdown).not.toContain("https://example.com")
  })

  it("should fallback to body when no main content found", async () => {
    const html = `
      <html>
        <body>
          <div>some content here</div>
        </body>
      </html>
    `

    const result = await processHtmlToMarkdown(html)
    expect(result.extractedFrom).toBe("body")
    expect(result.markdown).toContain("some content here")
  })
})
