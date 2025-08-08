import { promises as fs } from "fs"
import path from "path"
import PerfectRateChart from "./components/PerfectRateChart"
import SequentialResultsChart from "./components/SequentialResultsChart"

type RawResult = {
  model: string
  chain: string
  validation: { score: number }
}

async function loadResults() {
  // Next.js app cwd is the Next app root: together/app
  // The results file lives under app/src/... → use cwd + src/... (no leading "app/")
  const resultsPath = path.resolve(
    process.cwd(),
    "src/research-experiments/tool-real/experiments/02-sequential-chains/sequential-results.json"
  )

  try {
    const raw = await fs.readFile(resultsPath, "utf-8")
    const results = JSON.parse(raw) as RawResult[]
    return results
  } catch (err) {
    console.error("Failed to read sequential-results.json", err)
    return [] as RawResult[]
  }
}

function aggregateByModelAndChain(results: RawResult[]) {
  const chainSet = new Set<string>()
  const byModel: Record<
    string,
    Record<string, { sum: number; count: number; perfect: number }>
  > = {}

  for (const r of results) {
    chainSet.add(r.chain)
    if (!byModel[r.model]) byModel[r.model] = {}
    if (!byModel[r.model][r.chain])
      byModel[r.model][r.chain] = { sum: 0, count: 0, perfect: 0 }
    const score = r.validation?.score ?? 0
    byModel[r.model][r.chain].sum += score
    byModel[r.model][r.chain].count += 1
    if (score === 1) byModel[r.model][r.chain].perfect += 1
  }

  const chains = Array.from(chainSet).sort((a, b) => {
    const na = parseInt(a)
    const nb = parseInt(b)
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b)
    return na - nb
  })

  // Average score dataset
  const dataAvg = Object.entries(byModel).map(([model, chainMap]) => {
    const row: Record<string, number | string> = { model }
    for (const c of chains) {
      const agg = chainMap[c]
      row[c] = agg
        ? Math.round((agg.sum / Math.max(1, agg.count)) * 100) / 100
        : 0
    }
    return row
  })

  // Perfect rate dataset
  const dataPerfect = Object.entries(byModel).map(([model, chainMap]) => {
    const row: Record<string, number | string> = { model }
    for (const c of chains) {
      const agg = chainMap[c]
      row[c] = agg
        ? Math.round((agg.perfect / Math.max(1, agg.count)) * 100) / 100
        : 0
    }
    return row
  })

  // Compute overall model averages for header display
  const overall = Object.entries(byModel).map(([model, chainMap]) => {
    let total = 0
    let count = 0
    for (const c of Object.values(chainMap)) {
      total += c.sum
      count += c.count
    }
    const avg = count ? Math.round((total / count) * 100) / 100 : 0
    return { model, avg }
  })

  // Sort models by average desc for nicer presentation
  dataAvg.sort((a, b) => {
    const aa = overall.find((o) => o.model === a.model)?.avg ?? 0
    const bb = overall.find((o) => o.model === b.model)?.avg ?? 0
    return bb - aa
  })
  // Keep perfect data in the same model order as dataAvg
  const modelOrder = dataAvg.map((r) => r.model as string)
  dataPerfect.sort(
    (a, b) =>
      modelOrder.indexOf(a.model as string) -
      modelOrder.indexOf(b.model as string)
  )

  overall.sort((a, b) => b.avg - a.avg)

  return { dataAvg, dataPerfect, chains, overall }
}

export default async function SequentialResultsPage() {
  const results = await loadResults()
  const { dataAvg, dataPerfect, chains, overall } =
    aggregateByModelAndChain(results)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sequential Chains — Results Overview
        </h1>
        <p className="text-gray-600 mb-6">
          Average score per model, broken down by chain complexity. Higher is
          better.
        </p>

        {overall.length > 0 ? (
          <div className="mb-6 text-sm text-gray-700">
            <span className="font-semibold">Top models:</span>{" "}
            {overall
              .slice(0, 5)
              .map((o) => `${o.model} (${o.avg.toFixed(2)})`)
              .join(", ")}
          </div>
        ) : null}

        <div className="w-full h-[520px] bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-2">Average Score by Chain</h2>
          <SequentialResultsChart data={dataAvg} chains={chains} />
        </div>

        <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">
            Perfect Runs (% of 1.0 scores)
          </h2>
          <PerfectRateChart data={dataPerfect} chains={chains} />
        </div>
      </div>
    </div>
  )
}
