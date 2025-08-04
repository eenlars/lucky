import { findFromTags } from "../findFromTags"

describe("findFromTags – core & edge cases", () => {
  // Basic and parameterized cases
  test.each([
    // [description, html, tagName, expectedResult]
    ["simple extraction", "<title>hello world</title>", "title", "hello world"],
    ["tag with attributes", '<tag foo="bar" data-test>xyz</tag>', "tag", "xyz"],
    ["hyphenated tag name", "<data-1>num</data-1>", "data-1", "num"],
    ["namespaced tag (colon)", "<ns:tag>space</ns:tag>", "ns:tag", "space"],
    ["numeric-only tag", "<123>one two three</123>", "123", "one two three"],
    ["preserve whitespace", "<w>  padded  </w>", "w", "  padded  "],
    ["multiline content", "<c>\nline1\nline2\n</c>", "c", "\nline1\nline2\n"],
    [
      "nested different tags",
      "<outer><inner>x</inner></outer>",
      "outer",
      "<inner>x</inner>",
    ],
    [
      "nested same tags (should return whole inner block)",
      "<t>start <t>inner</t> end</t>",
      "t",
      "start <t>inner</t> end",
    ],
    ["multiple matches—first only", "<x>ONE</x><x>TWO</x>", "x", "ONE"],
    ["tags with similar names", "<a>1</a><aa>2</aa>", "a", "1"],
    ["tags with similar names (the longer)", "<a>1</a><aa>2</aa>", "aa", "2"],
  ])("%s", (_desc, html, tagName, expected) => {
    expect(findFromTags(html, tagName)).toBe(expected)
  })

  // Non-existent / malformed inputs
  test.each([
    ["non-existent tag", "<a>1</a>", "b", null],
    ["empty input string", "", "sequential", null],
    ["self-closing tag only", '<img src="foo.jpg"/>', "img", null],
    ["missing closing tag", "<tag>oops", "tag", null],
    ["invalid regex in tagName", "<tag>1</tag>", "[tag", null],
  ])("%s → null", (_desc, html, tagName, _expected) => {
    expect(findFromTags(html, tagName)).toBeNull()
  })

  // Case sensitivity
  test("is case-sensitive (matches Title vs title)", () => {
    expect(findFromTags("<Title>Case</Title>", "title")).toBe("Case")
  })

  // Deep nesting
  test("deeply nested different tags", () => {
    const html = "<a><b><c>deep!</c></b></a>"
    expect(findFromTags(html, "b")).toBe("<c>deep!</c>")
  })

  // Performance / large input
  test("handles very large content without timing out or crashing", () => {
    const huge = "x".repeat(50_000)
    const html = `<big>${huge}</big>`
    expect(findFromTags(html, "big")).toBe(huge)
  })

  // Overlapping names and ensuring non-greedy match
  test("does not greedily span multiple tag pairs", () => {
    const html = "<p>first</p> junk <p>second</p>"
    expect(findFromTags(html, "p")).toBe("first")
  })
})

describe("findFromTags – LLM-specific stress cases", () => {
  // ────────────────────────────────────────────────────────────
  // Weird tag identifiers you really do see in model dumps
  test.each([
    ["dot-qualified name", "<sys.role>admin</sys.role>", "sys.role", "admin"],
    ["emoji tag", "<🔥>hot</🔥>", "🔥", "hot"],
    ["underscore + dash mix", "<_temp-id>ok</_temp-id>", "_temp-id", "ok"],
    ["leading dot (LLM mistakes)", "<.meta>m</.meta>", ".meta", "m"],
  ])("%s", (_d, txt, tag, expected) => {
    expect(findFromTags(txt, tag)).toBe(expected)
  })

  // ────────────────────────────────────────────────────────────
  // Whitespace & newline weirdness frequently emitted by streams
  test.each([
    [
      "newline right after < and before name",
      "<\nstream>line</stream>",
      "stream",
      "line",
    ],
    ["newline right before </", "<block>foo\n</block>", "block", "foo\n"],
    [
      "carriage-return pair",
      "<tag>\r\nhello\r\n</tag>",
      "tag",
      "\r\nhello\r\n",
    ],
  ])("%s", (_d, txt, tag, expected) => {
    expect(findFromTags(txt, tag)).toBe(expected)
  })

  // ────────────────────────────────────────────────────────────
  // Nested & overlapping edge cases typical of hallucinations
  test("overlapping same-name tags → null (invalid)", () => {
    const txt = "<a>one <a>two</a> three</a></a>"
    // The second </a> closes nothing; treat as malformed
    expect(findFromTags(txt, "a")).toBeNull()
  })

  test("crossed tags (a before b closed in wrong order) → null", () => {
    const txt = "<a>1<b>2</a></b>"
    expect(findFromTags(txt, "a")).toBeNull()
    expect(findFromTags(txt, "b")).toBeNull()
  })

  // ────────────────────────────────────────────────────────────
  // Huge generation blocks
  test("≥1 MB content without stack/timeout", () => {
    const payload = "y".repeat(1_048_576) // 1 MiB
    const txt = `<big>${payload}</big>`
    expect(findFromTags(txt, "big")).toBe(payload)
  })

  // ────────────────────────────────────────────────────────────
  // Tags embedded inside Markdown / JSON scaffolding
  test.each([
    [
      "inside fenced Markdown code",
      '```json\n{"msg":"<x>hi</x>"}\n```',
      "x",
      "hi",
    ],
    [
      "inside triple-quoted string (Python style)",
      'text = """<note>hello</note>"""',
      "note",
      "hello",
    ],
  ])("%s", (_d, txt, tag, expected) => {
    expect(findFromTags(txt, tag)).toBe(expected)
  })

  // ────────────────────────────────────────────────────────────
  // No closing tag at all – must return null quickly
  test("stream cut-off mid-tag", () => {
    const txt = "<cut halfway>"
    expect(findFromTags(txt, "cut halfway")).toBeNull()
  })

  // ────────────────────────────────────────────────────────────
  // whitespace handling in extracted content
  test("preserves whitespace exactly as in original content", () => {
    const txt = "<tools>  tool1  ,  tool2  ,  tool3  </tools>"
    expect(findFromTags(txt, "tools")).toBe("  tool1  ,  tool2  ,  tool3  ")
  })
})
