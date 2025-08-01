"use client"

import React from "react"

export default function TestGraphPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Evolution Graph Test</h1>
      <p>If you can see this, the page routing works!</p>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Next Steps:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Verify this test page works at <code>/test-graph</code>
          </li>
          <li>
            Then try <code>/evolution-graph</code> for the actual visualization
          </li>
          <li>If there are import errors, we&apos;ll fix them step by step</li>
        </ol>
      </div>
    </div>
  )
}
