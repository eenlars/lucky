"use client"

import { seriesPalette } from "@/app/experiments/chartColors"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Row = Record<string, number | string>

export default function SequentialResultsChart({ data, chains }: { data: Row[]; chains: string[] }) {
  // Unified palette
  const palette = seriesPalette

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 48 }} barGap={4} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="model" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round((v as number) * 100)}%`} />
        <Tooltip formatter={(v: any) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : v)} />
        <Legend
          content={(props) => {
            const { payload } = props
            if (!payload) return null

            // Sort payload to match chains order
            const sortedPayload = chains.map((chain) => payload.find((p: any) => p.dataKey === chain)).filter(Boolean)

            return (
              <div className="flex justify-center gap-4 mt-4">
                {sortedPayload.map((entry: any) => (
                  <div key={entry.dataKey} className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm">{entry.value}</span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        {chains.map((chain, idx) => (
          <Bar key={chain} dataKey={chain} fill={palette[idx % palette.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
