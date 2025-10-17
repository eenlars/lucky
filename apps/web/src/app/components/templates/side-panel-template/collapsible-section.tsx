"use client"

import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import { type ReactNode, useState } from "react"

export interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
  badge?: string | number
  icon?: ReactNode
}

export function CollapsibleSection({ title, defaultOpen = true, children, badge, icon }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="space-y-3">
      {/* Section Header - matches sidebar nav item style */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
            {title}
          </h3>
          {badge !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Section Content - staggered animation like sidebar submenu */}
      <div
        className={cn(
          "transition-all duration-300 ease-out",
          isOpen ? "max-h-[600px] opacity-100 overflow-y-auto" : "max-h-0 opacity-0 overflow-hidden",
        )}
      >
        <div className="space-y-3">{children}</div>
      </div>
    </div>
  )
}
