"use client"

import { useEffect, useState } from "react"
import PerfectRateChart from "./components/PerfectRateChart"
import SequentialResultsChart from "./components/SequentialResultsChart"

type RawResult = {
  model: string
  chain: string
  validation: { score: number }
}

function aggregateByModelAndChain(results: RawResult[]) {
  const chainSet = new Set<string>()
  const byModel: Record<string, Record<string, { sum: number; count: number; perfect: number }>> = {}

  for (const r of results) {
    chainSet.add(r.chain)
    if (!byModel[r.model]) byModel[r.model] = {}
    if (!byModel[r.model][r.chain]) byModel[r.model][r.chain] = { sum: 0, count: 0, perfect: 0 }
    const score = r.validation?.score ?? 0
    byModel[r.model][r.chain].sum += score
    byModel[r.model][r.chain].count += 1
    if (score === 1) byModel[r.model][r.chain].perfect += 1
  }

  const chains = Array.from(chainSet).sort((a, b) => {
    // Extract numeric part from strings like "2-step", "10-step"
    const na = Number.parseInt(a.replace(/[^0-9]/g, ""))
    const nb = Number.parseInt(b.replace(/[^0-9]/g, ""))
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b)
    return na - nb
  })

  // Average score dataset
  const dataAvg = Object.entries(byModel).map(([model, chainMap]) => {
    const row: Record<string, number | string> = { model }
    for (const c of chains) {
      const agg = chainMap[c]
      row[c] = agg ? Math.round((agg.sum / Math.max(1, agg.count)) * 100) / 100 : 0
    }
    return row
  })

  // Perfect rate dataset
  const dataPerfect = Object.entries(byModel).map(([model, chainMap]) => {
    const row: Record<string, number | string> = { model }
    for (const c of chains) {
      const agg = chainMap[c]
      row[c] = agg ? Math.round((agg.perfect / Math.max(1, agg.count)) * 100) / 100 : 0
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
    const aa = overall.find(o => o.model === a.model)?.avg ?? 0
    const bb = overall.find(o => o.model === b.model)?.avg ?? 0
    return bb - aa
  })
  // Keep perfect data in the same model order as dataAvg
  const modelOrder = dataAvg.map(r => r.model as string)
  dataPerfect.sort((a, b) => modelOrder.indexOf(a.model as string) - modelOrder.indexOf(b.model as string))

  overall.sort((a, b) => b.avg - a.avg)

  return { dataAvg, dataPerfect, chains, overall }
}

export default function SequentialResultsPage() {
  const [results, setResults] = useState<RawResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        const res = await fetch("/api/experiments/sequential-results", {
          cache: "no-store",
        })
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`)
        }
        const data = (await res.json()) as { results: RawResult[] }
        setResults(data.results || [])
      } catch (err) {
        console.error("Failed to fetch sequential results via API", err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-gray-600">Loading sequential results...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Error loading results: {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { dataAvg, dataPerfect, chains, overall } = aggregateByModelAndChain(results)

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sequential Chains — Results Overview</h1>
        <p className="text-gray-600 mb-6">
          Average score per model, broken down by chain complexity. Higher is better.
        </p>

        {overall.length > 0 ? (
          <div className="mb-6 text-sm text-gray-700">
            <span className="font-semibold">Top models:</span>{" "}
            {overall
              .slice(0, 5)
              .map(o => `${o.model} (${o.avg.toFixed(2)})`)
              .join(", ")}
          </div>
        ) : null}

        <div className="w-full h-[520px] bg-white rounded-lg shadow p-4 mb-8">
          <h2 className="text-xl font-semibold mb-2">Average Score per model</h2>
          <SequentialResultsChart data={dataAvg} chains={chains} />
        </div>

        <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-2">Perfect Runs (% of 1.0 scores)</h2>
          <PerfectRateChart data={dataPerfect} chains={chains} />
        </div>
      </div>
    </div>
  )
}
