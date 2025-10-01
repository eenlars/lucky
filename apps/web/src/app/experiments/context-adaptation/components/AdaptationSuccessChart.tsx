"use client"

import { semantic } from "@/app/experiments/chartColors"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type DataRow = {
  model: string
  vague: number
  clear: number
}

export default function AdaptationSuccessChart({ data }: { data: DataRow[] }) {
  const palette = [semantic.neutralMuted, semantic.positive]
  const hasAnyRows = Array.isArray(data) ? data.length > 0 : false
  const hasAnyValue = hasAnyRows ? data.some(d => (d?.vague ?? 0) > 0 || (d?.clear ?? 0) > 0) : false

  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="model" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="vague" fill={palette[0]} name="Vague success %" />
          <Bar dataKey="clear" fill={palette[1]} name="Clear success %" />
        </BarChart>
      </ResponsiveContainer>

      {!hasAnyRows && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">No data yet.</div>
      )}
      {hasAnyRows && !hasAnyValue && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
          All values are 0%.
        </div>
      )}
    </div>
  )
}
