/**
 * Real-time node status indicator for React Flow nodes
 * 
 * Shows live execution status with visual indicators:
 * - Idle: Gray circle
 * - Running: Pulsing blue circle
 * - Completed: Green checkmark
 * - Failed: Red X
 */

'use client'

import React from 'react'
import { useNodeEvents } from '@/hooks/useWorkflowStream'
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react'

interface NodeStatusIndicatorProps {
  nodeId: string
  invocationId?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function NodeStatusIndicator({ 
  nodeId, 
  invocationId,
  size = 'md',
  showLabel = false,
  className = "" 
}: NodeStatusIndicatorProps) {
  const { isExecuting, lastExecution, toolCalls, llmCalls } = useNodeEvents(nodeId, invocationId)

  const getStatus = () => {
    if (isExecuting) return 'running'
    if (lastExecution) {
      return (lastExecution as any).status === 'failed' ? 'failed' : 'completed'
    }
    return 'idle'
  }

  const status = getStatus()

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  }

  const getStatusDisplay = () => {
    switch (status) {
      case 'running':
        return {
          icon: <Activity className={`${sizeClasses[size]} text-blue-500 animate-pulse`} />,
          label: 'Running',
          color: 'text-blue-500'
        }
      case 'completed':
        return {
          icon: <CheckCircle className={`${sizeClasses[size]} text-green-500`} />,
          label: 'Completed',
          color: 'text-green-500'
        }
      case 'failed':
        return {
          icon: <XCircle className={`${sizeClasses[size]} text-red-500`} />,
          label: 'Failed',
          color: 'text-red-500'
        }
      default:
        return {
          icon: <Clock className={`${sizeClasses[size]} text-gray-400`} />,
          label: 'Idle',
          color: 'text-gray-400'
        }
    }
  }

  const { icon, label, color } = getStatusDisplay()

  if (!showLabel) {
    return (
      <div className={`inline-flex items-center ${className}`} title={`${nodeId}: ${label}`}>
        {icon}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {icon}
      <span className={`text-xs font-medium ${color}`}>
        {label}
      </span>
      {(toolCalls.length > 0 || llmCalls.length > 0) && (
        <div className="text-xs text-gray-500">
          {toolCalls.length > 0 && `${toolCalls.length / 2} tools`}
          {toolCalls.length > 0 && llmCalls.length > 0 && ', '}
          {llmCalls.length > 0 && `${llmCalls.length / 2} LLM`}
        </div>
      )}
    </div>
  )
}