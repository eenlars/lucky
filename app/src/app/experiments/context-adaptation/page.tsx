import AdaptationMetricsChart from "@/app/experiments/context-adaptation/components/AdaptationMetricsChart"
import AdaptationV3Connected from "@/app/experiments/context-adaptation/components/AdaptationV3Connected"
import AdaptationV3Special from "@/app/experiments/context-adaptation/components/AdaptationV3Special"
import AdaptationSuccessChart from "./components/AdaptationSuccessChart"

type DataRow = { model: string; vague: number; clear: number }

async function fetchChartData() {
  try {
    const res = await fetch(`/api/experiments/context-adaptation`, {
      cache: "no-store",
    })
    if (!res.ok)
      return {
        ok: false,
        source: "none" as const,
        chartData: [] as DataRow[],
        datasets: {
          final: [] as DataRow[],
          baseline: [] as DataRow[],
          v3: [] as DataRow[],
        },
        errors: ["Request failed"],
        info: [] as string[],
      }
    return (await res.json()) as {
      ok: boolean
      source: "final" | "baseline" | "v3" | "none"
      chartData: DataRow[]
      datasets?: {
        final?: DataRow[]
        baseline?: DataRow[]
        v3?: DataRow[]
        metrics?: any[]
      }
      errors?: string[]
      info?: string[]
    }
  } catch (e: any) {
    return {
      ok: false,
      source: "none" as const,
      chartData: [] as DataRow[],
      datasets: {
        final: [] as DataRow[],
        baseline: [] as DataRow[],
        v3: [] as DataRow[],
      },
      errors: [e?.message ?? String(e)],
      info: [] as string[],
    }
  }
}

export default async function ContextAdaptationPage() {
  const {
    chartData: _chartData,
    datasets,
    errors,
    info,
  } = await fetchChartData()
  const baselineData = datasets?.baseline ?? []
  const finalData = datasets?.final ?? []
  const metricsData = (datasets as any)?.metrics ?? []

  const baselineTitle = "Baseline (aggregated)"

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Context Adaptation — Results
        </h1>
        <p className="text-gray-600 mb-6">
          Success rate by model for vague vs clear prompts (excluding control
          scenario).
        </p>

        {errors?.length || info?.length ? (
          <div className="mb-4 space-y-1">
            {errors?.length ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                <strong>Errors:</strong> {errors.join("; ")}
              </div>
            ) : null}
            {info?.length ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <strong>Info:</strong> {info.join("; ")}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Row 1: 3 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">{baselineTitle}</h2>
            <p className="text-xs text-gray-500 mb-2">Source: baseline</p>
            <AdaptationSuccessChart data={baselineData} />
          </div>
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">Time per model (avg)</h2>
            <p className="text-xs text-gray-500 mb-2">Y-axis: time in ms</p>
            <AdaptationMetricsChart data={metricsData} metric="time" />
          </div>
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">Cost per trace (avg)</h2>
            <p className="text-xs text-gray-500 mb-2">Y-axis: USD</p>
            <AdaptationMetricsChart data={metricsData} metric="cost" />
          </div>
        </div>

        {/* Row 2: 3 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">
              Calls per trace (avg)
            </h2>
            <p className="text-xs text-gray-500 mb-2">Y-axis: calls</p>
            <AdaptationMetricsChart data={metricsData} metric="calls" />
          </div>
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">Time per item (avg)</h2>
            <p className="text-xs text-gray-500 mb-2">Y-axis: ms per item</p>
            <AdaptationMetricsChart data={metricsData} metric="msPerItem" />
          </div>
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">Cost per item (avg)</h2>
            <p className="text-xs text-gray-500 mb-2">Y-axis: $ per item</p>
            <AdaptationMetricsChart data={metricsData} metric="costPerItem" />
          </div>
        </div>

        <div className="w-full bg-white rounded-lg shadow p-4 mt-6">
          <AdaptationV3Special />
        </div>

        {/* Big combined graph with connections */}
        <div className="w-full bg-white rounded-lg shadow p-4 mt-6">
          <AdaptationV3Connected />
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6">
          <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-1">Final (aggregated)</h2>
            <p className="text-xs text-gray-500 mb-2">Source: final</p>
            <AdaptationSuccessChart data={finalData} />
          </div>
        </div>
      </div>
    </div>
  )
}
