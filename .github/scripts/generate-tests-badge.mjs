import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

function safeParseJson(jsonText) {
  try {
    return JSON.parse(jsonText)
  } catch (_err) {
    // Try to extract last JSON object if reporter printed extra logs
    const start = jsonText.lastIndexOf("{")
    const end = jsonText.lastIndexOf("}")
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(jsonText.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

function aggregateFromVitestJson(result) {
  // Support a few possible shapes
  // Shape A: { numTotalTests, numPassedTests, numFailedTests, numPendingTests, success }
  if (result && typeof result === "object" && "numTotalTests" in result) {
    const total = Number(result.numTotalTests ?? 0)
    const passed = Number(result.numPassedTests ?? 0)
    const failed = Number(result.numFailedTests ?? 0)
    const pending = Number(result.numPendingTests ?? 0)
    return { total, passed, failed, pending }
  }

  // Shape B (Jest-like): { testResults: [ { assertionResults: [{ status: 'passed'|'failed'|'pending' }] } ] }
  if (result && Array.isArray(result.testResults)) {
    let passed = 0
    let failed = 0
    let pending = 0
    for (const file of result.testResults) {
      const assertions = file.assertionResults || []
      for (const a of assertions) {
        if (a.status === "passed") passed++
        else if (a.status === "failed") failed++
        else pending++
      }
    }
    const total = passed + failed + pending
    return { total, passed, failed, pending }
  }

  // Shape C (Vitest summary): { results: { tests: [...] } }
  if (result?.results && Array.isArray(result.results.tests)) {
    let passed = 0
    let failed = 0
    let pending = 0
    for (const t of result.results.tests) {
      if (t.result === "pass" || t.state === "pass" || t.status === "passed") passed++
      else if (t.result === "fail" || t.state === "fail" || t.status === "failed") failed++
      else pending++
    }
    const total = passed + failed + pending
    return { total, passed, failed, pending }
  }

  return { total: 0, passed: 0, failed: 0, pending: 0 }
}

function createBadgeSvg({ label, message, color }) {
  // Simple dynamic width estimation
  const charWidth = 6
  const pad = 10
  const leftText = label
  const rightText = message
  const leftWidth = Math.max(40, leftText.length * charWidth + pad)
  const rightWidth = Math.max(60, rightText.length * charWidth + pad)
  const width = leftWidth + rightWidth
  const height = 20

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${label}: ${message}">
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-opacity=".1"/>
    <stop offset=".9" stop-opacity=".3"/>
    <stop offset="1" stop-opacity=".5"/>
  </linearGradient>
  <mask id="round">
    <rect width="${width}" height="${height}" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#round)">
    <rect width="${leftWidth}" height="${height}" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${color}"/>
    <rect width="${width}" height="${height}" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="14">${leftText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14">${rightText}</text>
  </g>
</svg>`
}

function main() {
  const resultsPath = resolve("vitest-results.json")
  let jsonText = ""
  try {
    jsonText = readFileSync(resultsPath, "utf8")
  } catch {
    // No results: produce unknown badge
    const svgUnknown = createBadgeSvg({
      label: "tests",
      message: "unknown",
      color: "#9f9f9f",
    })
    const outPath = resolve("docs/badges/tests.svg")
    if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, svgUnknown)
    return
  }

  const parsed = safeParseJson(jsonText) || {}
  const { total, passed, failed } = aggregateFromVitestJson(parsed)
  const message = total > 0 ? `${passed} passed, ${failed} failed` : "no tests"
  const color = failed > 0 ? "#e05d44" : total > 0 ? "#4c1" : "#9f9f9f"
  const svg = createBadgeSvg({ label: "tests", message, color })
  const outPath = resolve("docs/badges/tests.svg")
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, svg)
}

main()
