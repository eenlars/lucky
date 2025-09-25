"use client"

import Link from "next/link"

type GPNode = {
  id: string
  accuracy: number
  fitness: number
  status: string
  operation: string
  timestamp: string
  isTarget?: boolean
  duration?: number
  cost?: number
}

export function GPEvolutionGraph({ nodes }: { nodes?: GPNode[] }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Genetic Programming Graph</h3>
        <div className="text-gray-500">No GP nodes available.</div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Genetic Programming Graph</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Invocation</th>
              <th className="py-2 pr-4">Op</th>
              <th className="py-2 pr-4">Accuracy</th>
              <th className="py-2 pr-4">Fitness</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Cost</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id} className="border-b last:border-0">
                <td className="py-2 pr-4">
                  <Link href={`/trace/${n.id}`} className="hover:underline">
                    <code className={`text-xs px-1 rounded ${n.isTarget ? "bg-green-100" : "bg-gray-100"}`}>
                      {n.id}
                    </code>
                  </Link>
                </td>
                <td className="py-2 pr-4">{n.operation}</td>
                <td className="py-2 pr-4">{n.accuracy?.toFixed(1)}%</td>
                <td className="py-2 pr-4">{n.fitness?.toFixed(3)}</td>
                <td className="py-2 pr-4">{n.status}</td>
                <td className="py-2 pr-4">{new Date(n.timestamp).toLocaleString()}</td>
                <td className="py-2 pr-4">{n.cost ? `$${n.cost.toFixed(4)}` : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
