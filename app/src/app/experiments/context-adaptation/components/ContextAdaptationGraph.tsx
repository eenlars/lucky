"use client"

import { useEffect, useMemo, useState } from "react"
import AdaptationSuccessChart from "./AdaptationSuccessChart"

type DataRow = { model: string; vague: number; clear: number }
type DatasetKey = "final" | "baseline" | "v3" | "auto"

type ApiResponse = {
  ok: boolean
  source: "final" | "baseline" | "v3" | "none"
  chartData: DataRow[]
  datasets?: { final?: DataRow[]; baseline?: DataRow[]; v3?: DataRow[] }
  errors?: string[]
  info?: string[]
}

interface ContextAdaptationGraphProps {
  title?: string
  dataset?: DatasetKey
  height?: number
  className?: string
}

export default function ContextAdaptationGraph({
  title,
  dataset = "baseline",
  height = 520,
  className = "",
}: ContextAdaptationGraphProps) {
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/experiments/context-adaptation?t=${Date.now()}`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error("Request failed")
        const json = (await res.json()) as ApiResponse
        if (!cancelled) {
          setApiData(json)
          setErrors(json.errors ?? [])
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrors([e?.message ?? String(e)])
          setApiData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedData = useMemo<DataRow[]>(() => {
    if (!apiData) return []
    const ds = apiData.datasets ?? {}
    if (dataset === "baseline") return ds.baseline ?? apiData.chartData
    if (dataset === "v3") return ds.v3 ?? apiData.chartData
    // auto: pick the api's selected source first, then fallback
    if (apiData.source === "final") return ds.final ?? apiData.chartData
    if (apiData.source === "baseline") return ds.baseline ?? apiData.chartData
    if (apiData.source === "v3") return ds.v3 ?? apiData.chartData
    return apiData.chartData
  }, [apiData, dataset])

  const resolvedTitle =
    title ??
    (dataset === "baseline"
      ? "Baseline (aggregated)"
      : dataset === "final"
        ? "Final (aggregated)"
        : dataset === "v3"
          ? "V3 (aggregated)"
          : "Context Adaptation")

  const sourceLabel = useMemo(() => {
    if (!apiData) return dataset === "auto" ? "Source: —" : `Source: ${dataset}`
    if (dataset === "auto") return `Source: ${apiData.source}`
    return `Source: ${dataset}`
  }, [apiData, dataset])

  return (
    <div
      className={`w-full bg-white rounded-lg shadow p-4 ${className}`}
      style={{ height }}
    >
      <h2 className="text-xl font-semibold mb-1">{resolvedTitle}</h2>
      <p className="text-xs text-gray-500 mb-2">{sourceLabel}</p>

      <div className="w-full h-[calc(100%-3rem)]">
        <AdaptationSuccessChart data={selectedData} />
      </div>

      {loading ? (
        <div className="mt-2 text-xs text-gray-500">Loading…</div>
      ) : null}
      {errors.length ? (
        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          <strong>Errors:</strong> {errors.join("; ")}
        </div>
      ) : null}
    </div>
  )
}
