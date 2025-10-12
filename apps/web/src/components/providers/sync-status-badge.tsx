"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react"

interface SyncStatusBadgeProps {
  lastSynced: Date | null
  isStale: boolean
  isLoading?: boolean
  onRefresh: () => void
}

export function SyncStatusBadge({ lastSynced, isStale, isLoading, onRefresh }: SyncStatusBadgeProps) {
  const getRelativeTime = () => {
    if (!lastSynced) return null
    const secondsAgo = Math.floor((Date.now() - lastSynced.getTime()) / 1000)
    if (secondsAgo < 60) return "just now"
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`
    return `${Math.floor(secondsAgo / 3600)}h ago`
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={isStale ? "outline" : "secondary"}
        className={isStale ? "bg-yellow-50 dark:bg-yellow-950/30" : ""}
      >
        {isStale ? (
          <>
            <AlertCircle className="text-yellow-600 dark:text-yellow-500" />
            Stale
          </>
        ) : (
          <>
            <CheckCircle2 className="text-green-600 dark:text-green-500" />
            Synced {getRelativeTime()}
          </>
        )}
      </Badge>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      </Button>
    </div>
  )
}
