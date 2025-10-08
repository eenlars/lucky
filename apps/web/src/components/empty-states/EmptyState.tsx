"use client"

import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  icon?: LucideIcon | string
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  const IconComponent = typeof icon === "string" ? null : icon

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            {IconComponent ? (
              <IconComponent className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            ) : typeof icon === "string" ? (
              <span className="text-3xl">{icon}</span>
            ) : (
              <span className="text-3xl">📋</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
          </div>
          {(action || secondaryAction) && (
            <div className="flex gap-3 pt-2">
              {action &&
                (action.href ? (
                  <Button asChild>
                    <Link href={action.href}>{action.label}</Link>
                  </Button>
                ) : (
                  <Button onClick={action.onClick}>{action.label}</Button>
                ))}
              {secondaryAction &&
                (secondaryAction.href ? (
                  <Button variant="outline" asChild>
                    <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={secondaryAction.onClick}>
                    {secondaryAction.label}
                  </Button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
