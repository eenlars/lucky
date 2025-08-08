"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Row = Record<string, number | string>

export default function PerfectRateChart({
  data,
  chains,
}: {
  data: Row[]
  chains: string[]
}) {
  const palette = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
        barGap={4}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="model" tick={{ fontSize: 12 }} />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
        />
        <Tooltip
          formatter={(v: any) =>
            typeof v === "number" ? `${(v * 100).toFixed(1)}%` : v
          }
        />
        <Legend />
        {chains.map((chain, idx) => (
          <Bar
            key={chain}
            dataKey={chain}
            fill={palette[idx % palette.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
