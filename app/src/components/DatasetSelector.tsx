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
  disabled?: boolean
}

export default function DatasetSelector({ onSelect, selectedDatasetId, disabled = false }: DatasetSelectorProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  // Close dropdown when disabled
  useEffect(() => {
    if (disabled) {
      setShowDropdown(false)
    }
  }, [disabled])

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/ingestions/list")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      if (data.success) {
        setDatasets(data.datasets || [])
      } else {
        throw new Error(data.error || "Failed to load datasets")
      }
    } catch (error) {
      console.error("Failed to load datasets:", error)
      setError(error instanceof Error ? error.message : "Failed to load datasets")
      setDatasets([])
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
        disabled={loading || disabled}
        className="w-full justify-between"
        data-testid="dataset-selector-trigger"
      >
        {loading ? "Loading..." : selectedDataset ? selectedDataset.name : error ? "Error loading datasets" : "Select Dataset"}
        <span className="ml-2">▼</span>
      </Button>

      {error && (
        <div className="mt-1 text-xs text-red-600">
          {error}
          <button 
            onClick={loadDatasets} 
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto" data-testid="dataset-selector-dropdown">
          {datasets.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              {error ? "Failed to load datasets" : "No datasets found"}
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  onSelect("")
                  setShowDropdown(false)
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b italic text-gray-500"
                data-testid="dataset-selector-clear"
              >
                Clear selection
              </button>
              {datasets.map((dataset) => (
                <button
                  key={dataset.datasetId}
                  onClick={() => {
                    onSelect(dataset.datasetId)
                    setShowDropdown(false)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  data-testid={`dataset-option-${dataset.datasetId}`}
                >
                  <div className="font-medium">{dataset.name}</div>
                  <div className="text-xs text-gray-500">
                    {dataset.description} • {new Date(dataset.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}