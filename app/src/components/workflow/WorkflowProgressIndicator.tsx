/**
 * Real-time workflow progress indicator component
 *
 * Displays live updates of workflow execution including:
 * - Overall progress percentage
 * - Current executing node
 * - Node status indicators
 * - Execution timeline
 */

"use client"

import React from "react"
import {
  useWorkflowProgress,
  useWorkflowStream,
} from "@/hooks/useWorkflowStream"
import { Badge } from "@/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card"
import { Activity, CheckCircle, Clock, AlertCircle, Zap } from "lucide-react"

interface WorkflowProgressIndicatorProps {
  invocationId: string
  className?: string
}

export function WorkflowProgressIndicator({
  invocationId,
  className = "",
}: WorkflowProgressIndicatorProps) {
  const progress = useWorkflowProgress(invocationId)
  const { connectionState, lastEvent, isConnected, eventCount } =
    useWorkflowStream({
      invocationId,
      events: [
        "workflow:started",
        "workflow:completed",
        "workflow:error",
        "node:execution:started",
        "node:execution:completed",
      ],
    })

  const getStatusColor = () => {
    if (!isConnected) return "text-gray-500"
    if (progress.percentage === 100) return "text-green-600"
    if (progress.currentNodeId) return "text-blue-600"
    return "text-yellow-600"
  }

  const getStatusIcon = () => {
    if (!isConnected) return <AlertCircle className="h-4 w-4" />
    if (progress.percentage === 100) return <CheckCircle className="h-4 w-4" />
    if (progress.currentNodeId)
      return <Activity className="h-4 w-4 animate-pulse" />
    return <Clock className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (!isConnected) return "Disconnected"
    if (progress.percentage === 100) return "Completed"
    if (progress.currentNodeId) return `Executing: ${progress.currentNodeId}`
    return "Initializing"
  }

  const formatEstimatedCompletion = (estimatedCompletion?: number) => {
    if (!estimatedCompletion) return null

    const minutes = Math.ceil(estimatedCompletion / 60000)
    if (minutes < 1) return "Less than 1 minute remaining"
    if (minutes === 1) return "1 minute remaining"
    return `${minutes} minutes remaining`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Workflow Progress</span>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className="text-xs"
          >
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Zap className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {isConnected ? "Live" : "Offline"}
            </div>
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              {progress.completedNodes} of {progress.totalNodes} nodes
            </span>
            {progress.estimatedCompletion && (
              <span>
                {formatEstimatedCompletion(progress.estimatedCompletion)}
              </span>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={getStatusColor()}>{getStatusIcon()}</div>
          <span className={getStatusColor()}>{getStatusText()}</span>
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">{eventCount}</span>
            <span className="ml-1">events received</span>
          </div>
          <div>
            <span className="font-medium">{connectionState}</span>
            <span className="ml-1">connection</span>
          </div>
        </div>

        {/* Last Event Preview */}
        {lastEvent && (
          <div className="border-t pt-3">
            <div className="text-xs text-gray-500 mb-1">Latest Event</div>
            <div className="text-xs font-mono bg-gray-50 p-2 rounded border">
              <div className="flex justify-between">
                <span className="font-medium">{lastEvent.event}</span>
                <span className="text-gray-400">
                  {new Date(lastEvent.ts).toLocaleTimeString()}
                </span>
              </div>
              {(lastEvent as any).nodeId && (
                <div className="text-gray-600 mt-1">
                  Node: {(lastEvent as any).nodeId}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
