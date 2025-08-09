"use client"

import { semantic } from "@/app/experiments/chartColors"
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

type Row = { model: string; accuracy: number }

export default function AccuracyByModelChart({ data }: { data: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="model" />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
        <Legend />
        <Bar dataKey="accuracy" fill={semantic.info} name="Accuracy %" />
      </BarChart>
    </ResponsiveContainer>
  )
}
