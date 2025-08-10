"use client"

import { seriesPalette } from "@/app/experiments/chartColors"
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Row = { tools: number } & Record<string, number>
type SeriesDef = { key: string; label: string }
type Point = { tools: number; y: number; modelKey: string; label: string }

export default function AccuracyByToolCountChart({
  data,
  series,
  points: _points,
}: {
  data: Row[]
  series?: SeriesDef[]
  points?: Point[]
}) {
  const allModels = (
    series?.map((s) => s.key) || Object.keys(data?.[0] || {})
  ).filter((k) => k !== "tools")

  // Sort models to put specific ones at top
  const priorityOrder = [
    "google/gemini-2.5-flash-lite",
    "openai/gpt-3.5-turbo",
    "openai/gpt-4.1",
  ]
  const models = [
    ...priorityOrder.filter((m) => allModels.includes(m)),
    ...allModels.filter((m) => !priorityOrder.includes(m)),
  ]

  const palette = seriesPalette
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 40, right: 30, left: 20, bottom: 120 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="tools"
          allowDecimals={false}
          label={{
            value: "Number of Tools",
            position: "insideBottom",
            offset: -5,
          }}
        />
        <YAxis
          type="number"
          domain={[0, 100]}
          label={{ value: "Accuracy %", angle: -90, position: "insideLeft" }}
        />
        <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
        {models.map((m, idx) => (
          <Line
            key={m}
            type="monotone"
            dataKey={m}
            stroke={palette[idx % palette.length]}
            strokeWidth={2}
            name={series?.find((s) => s.key === m)?.label || m}
            connectNulls
            dot={false}
            activeDot={false}
          />
        ))}
        <Legend
          layout="vertical"
          verticalAlign="bottom"
          align="left"
          wrapperStyle={{ paddingTop: 10 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
