"use client"

import { useState, useEffect } from "react"
import { Button } from "@/ui/button"

interface Dataset {
  datasetId: string
  name: string
  description?: string
  createdAt: string
  type?: string
}

interface DatasetSelectorProps {
  onSelect: (datasetId: string) => void
  selectedDatasetId?: string
}

export default function DatasetSelector({ onSelect, selectedDatasetId }: DatasetSelectorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/ingestions/list")
      const data = await response.json()
      if (data.success) {
        setDatasets(data.datasets || [])
      }
    } catch (error) {
      console.error("Failed to load datasets:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedDataset = datasets.find(d => d.datasetId === selectedDatasetId)

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={loading}
        className="w-full justify-between"
      >
        {loading ? "Loading..." : selectedDataset ? selectedDataset.name : "Select Dataset"}
        <span className="ml-2">▼</span>
      </Button>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {datasets.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No datasets found</div>
          ) : (
            datasets.map((dataset) => (
              <button
                key={dataset.datasetId}
                onClick={() => {
                  onSelect(dataset.datasetId)
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
              >
                <div className="font-medium">{dataset.name}</div>
                <div className="text-xs text-gray-500">
                  {dataset.description} • {new Date(dataset.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}