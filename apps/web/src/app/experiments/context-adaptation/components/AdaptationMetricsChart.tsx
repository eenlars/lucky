"use client"

import { semantic } from "@/app/experiments/chartColors"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type MetricsRow = {
  model: string
  vagueMs?: number
  clearMs?: number
  vagueCost?: number
  clearCost?: number
  vagueCalls?: number
  clearCalls?: number
  vagueItems?: number
  clearItems?: number
  vagueMsPerItem?: number
  clearMsPerItem?: number
  vagueCostPerItem?: number
  clearCostPerItem?: number
}

type Props = {
  data: MetricsRow[]
  metric: "time" | "cost" | "calls" | "items" | "msPerItem" | "costPerItem"
}

export default function AdaptationMetricsChart({ data, metric }: Props) {
  const palette = [semantic.neutral, semantic.positiveEmphasis]
  const hasAnyRows = Array.isArray(data) ? data.length > 0 : false
  const keyA =
    metric === "time"
      ? ("vagueMs" as const)
      : metric === "cost"
        ? ("vagueCost" as const)
        : metric === "calls"
          ? ("vagueCalls" as const)
          : metric === "items"
            ? ("vagueItems" as const)
            : metric === "msPerItem"
              ? ("vagueMsPerItem" as const)
              : ("vagueCostPerItem" as const)
  const keyB =
    metric === "time"
      ? ("clearMs" as const)
      : metric === "cost"
        ? ("clearCost" as const)
        : metric === "calls"
          ? ("clearCalls" as const)
          : metric === "items"
            ? ("clearItems" as const)
            : metric === "msPerItem"
              ? ("clearMsPerItem" as const)
              : ("clearCostPerItem" as const)
  const unit =
    metric === "time" || metric === "msPerItem" ? "ms" : metric === "cost" || metric === "costPerItem" ? "$" : ""

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}${unit}`} />
          <Tooltip
            formatter={(v: any) => {
              const decimals =
                metric === "time" || metric === "msPerItem" ? 1 : metric === "cost" || metric === "costPerItem" ? 6 : 2
              return `${Number(v).toFixed(decimals)}${unit}`
            }}
          />
          <Legend />
          <Bar
            dataKey={keyA}
            fill={palette[0]}
            name={
              metric === "time"
                ? "Vague avg ms"
                : metric === "cost"
                  ? "Vague avg cost"
                  : metric === "calls"
                    ? "Vague avg calls"
                    : metric === "items"
                      ? "Vague avg items"
                      : metric === "msPerItem"
                        ? "Vague ms/item"
                        : "Vague $/item"
            }
          />
          <Bar
            dataKey={keyB}
            fill={palette[1]}
            name={
              metric === "time"
                ? "Clear avg ms"
                : metric === "cost"
                  ? "Clear avg cost"
                  : metric === "calls"
                    ? "Clear avg calls"
                    : metric === "items"
                      ? "Clear avg items"
                      : metric === "msPerItem"
                        ? "Clear ms/item"
                        : "Clear $/item"
            }
          />
        </BarChart>
      </ResponsiveContainer>

      {!hasAnyRows && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">No data yet.</div>
      )}
    </div>
  )
}
