import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { FilterState } from "../lib/types"

interface FiltersPanelProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onClearFilters: () => void
}

export function FiltersPanel({ filters, onFilterChange, onClearFilters }: FiltersPanelProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={e => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="rolled_back">Rolled Back</option>
          </select>
        </div>

        <div>
          <label htmlFor="min-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min Cost ($)
          </label>
          <input
            id="min-cost"
            type="number"
            step="0.000001"
            value={filters.minCost}
            onChange={e => onFilterChange({ ...filters, minCost: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="0.000001"
          />
        </div>

        <div>
          <label htmlFor="max-cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Cost ($)
          </label>
          <input
            id="max-cost"
            type="number"
            step="0.000001"
            value={filters.maxCost}
            onChange={e => onFilterChange({ ...filters, maxCost: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="1.000000"
          />
        </div>

        <div>
          <label htmlFor="min-accuracy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min Accuracy
          </label>
          <input
            id="min-accuracy"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={filters.minAccuracy}
            onChange={e => onFilterChange({ ...filters, minAccuracy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="0.000"
          />
        </div>

        <div>
          <label htmlFor="max-accuracy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Accuracy
          </label>
          <input
            id="max-accuracy"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={filters.maxAccuracy}
            onChange={e => onFilterChange({ ...filters, maxAccuracy: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="1.000"
          />
        </div>

        <div>
          <label htmlFor="min-fitness" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Min Fitness Score
          </label>
          <input
            id="min-fitness"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={filters.minFitnessScore}
            onChange={e => onFilterChange({ ...filters, minFitnessScore: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="0.000"
          />
        </div>

        <div>
          <label htmlFor="max-fitness" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Max Fitness Score
          </label>
          <input
            id="max-fitness"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={filters.maxFitnessScore}
            onChange={e => onFilterChange({ ...filters, maxFitnessScore: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text"
            placeholder="1.000"
          />
        </div>

        <div>
          <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date From
          </label>
          <input
            id="date-from"
            type="datetime-local"
            value={filters.dateFrom}
            onChange={e => onFilterChange({ ...filters, dateFrom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          />
        </div>

        <div>
          <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date To
          </label>
          <input
            id="date-to"
            type="datetime-local"
            value={filters.dateTo}
            onChange={e => onFilterChange({ ...filters, dateTo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          />
        </div>

        <div className="flex items-end">
          <Button onClick={onClearFilters} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
