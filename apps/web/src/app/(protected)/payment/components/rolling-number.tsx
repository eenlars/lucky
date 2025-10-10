"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface RollingNumberProps {
  value: number
  className?: string
}

export function RollingNumber({ value, className }: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setDisplayValue(value)
        setTimeout(() => setIsAnimating(false), 500)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [value, displayValue])

  return (
    <div className={cn("flex items-baseline gap-1", className)}>
      <span
        className="text-6xl font-light transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: isAnimating ? "scale(1.05)" : "scale(1)" }}
      >
        ${displayValue.toFixed(2)}
      </span>
    </div>
  )
}
