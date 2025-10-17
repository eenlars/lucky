"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  showValue?: boolean
  formatValue?: (value: number) => string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  showValue = false,
  formatValue = v => v.toString(),
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const percentage = ((localValue - min) / (max - min)) * 100

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    updateValue(e.clientX)
  }

  const updateValue = (clientX: number) => {
    if (!sliderRef.current) return

    const rect = sliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100))
    const newValue = min + (percentage / 100) * (max - min)

    // Round to step
    const steppedValue = Math.round(newValue / step) * step
    const clampedValue = Math.min(max, Math.max(min, steppedValue))

    setLocalValue(clampedValue)
    onChange(clampedValue)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging])

  return (
    <div className={cn("relative", className)}>
      {/* Track */}
      <div ref={sliderRef} className="relative h-6 cursor-pointer group" onMouseDown={handleMouseDown}>
        {/* Clickable area */}
        <div className="absolute inset-0" />

        {/* Visual track */}
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Filled portion */}
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Thumb */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-100 border-2 border-blue-500 rounded-full shadow-sm transition-all",
            isDragging && "scale-125 shadow-md",
            "hover:scale-110",
          )}
          style={{ left: `${percentage}%`, marginLeft: "-8px" }}
        >
          {/* Value tooltip on drag */}
          {(isDragging || showValue) && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap pointer-events-none">
              {formatValue(localValue)}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
