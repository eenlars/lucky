/**
 * Comprehensive workflow execution dashboard with real-time updates
 * 
 * Features:
 * - Live node execution status
 * - Event timeline
 * - Performance metrics
 * - Error tracking
 * - Tool and LLM call monitoring
 */

'use client'

import React, { useState, useMemo } from 'react'
import { useWorkflowStream, useNodeEvents } from '@/hooks/useWorkflowStream'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { ScrollArea } from '@/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs'
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database,
  DollarSign,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import type { WorkflowEvent } from '@core/utils/observability/events/WorkflowEvents'

interface WorkflowExecutionDashboardProps {
  invocationId: string
  workflowVersionId?: string
  className?: string
}

interface NodeStatus {
  nodeId: string
  status: 'idle' | 'running' | 'completed' | 'failed'
  duration?: number
  cost?: number
  error?: string
  lastActivity?: Date
}

export function WorkflowExecutionDashboard({ 
  invocationId, 
  workflowVersionId,
  className = "" 
}: WorkflowExecutionDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview')
  const [isPaused, setIsPaused] = useState(false)

  const { 
    events, 
    lastEvent, 
    isConnected, 
    connectionState,
    eventCount,
    clearEvents,
    connect,
    disconnect 
  } = useWorkflowStream({
    invocationId,
    autoReconnect: true,
  })

  // Calculate node statuses from events
  const nodeStatuses = useMemo(() => {
    const statuses = new Map<string, NodeStatus>()
    
    for (const event of events) {
      const nodeId = (event as any).nodeId
      if (!nodeId) continue

      const existing: NodeStatus = statuses.get(nodeId) || {
        nodeId,
        status: 'idle' as const,
        lastActivity: new Date(event.ts),
        duration: undefined,
        cost: undefined,
        error: undefined,
      }

      switch (event.event) {
        case 'node:execution:started':
          existing.status = 'running'
          existing.lastActivity = new Date(event.ts)
          break
        case 'node:execution:completed':
          const completedEvent = event as any
          existing.status = completedEvent.status === 'failed' ? 'failed' : 'completed'
          existing.duration = completedEvent.duration
          existing.cost = completedEvent.cost
          existing.error = completedEvent.error
          existing.lastActivity = new Date(event.ts)
          break
      }

      statuses.set(nodeId, existing)
    }

    return Array.from(statuses.values())
  }, [events])

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCost = nodeStatuses.reduce((sum, node) => sum + (node.cost || 0), 0)
    const completedNodes = nodeStatuses.filter(n => n.status === 'completed').length
    const failedNodes = nodeStatuses.filter(n => n.status === 'failed').length
    const runningNodes = nodeStatuses.filter(n => n.status === 'running').length
    
    const toolEvents = events.filter(e => e.event.startsWith('tool:'))
    const llmEvents = events.filter(e => e.event.startsWith('llm:'))
    const errorEvents = events.filter(e => e.event === 'workflow:error')

    const workflowStarted = events.find(e => e.event === 'workflow:started')
    const workflowCompleted = events.find(e => e.event === 'workflow:completed')
    
    let duration = 0
    if (workflowStarted) {
      const endTime = workflowCompleted 
        ? new Date(workflowCompleted.ts)
        : new Date()
      duration = endTime.getTime() - new Date(workflowStarted.ts).getTime()
    }

    return {
      totalCost,
      completedNodes,
      failedNodes,
      runningNodes,
      totalNodes: nodeStatuses.length,
      toolCallCount: toolEvents.length / 2, // start + complete
      llmCallCount: llmEvents.length / 2,   // start + complete
      errorCount: errorEvents.length,
      duration,
      isComplete: !!workflowCompleted,
    }
  }, [events, nodeStatuses])

  const getNodeStatusIcon = (status: NodeStatus['status']) => {
    switch (status) {
      case 'running': return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with connection status and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Workflow Execution</h2>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <><Zap className="h-3 w-3 mr-1" />Live</>
            ) : (
              <><AlertTriangle className="h-3 w-3 mr-1" />Offline</>
            )}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            disabled={!isConnected}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearEvents}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress</p>
                <p className="text-2xl font-bold">
                  {metrics.totalNodes > 0 
                    ? Math.round((metrics.completedNodes / metrics.totalNodes) * 100)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold">
                  {formatDuration(metrics.duration)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.totalCost)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Events</p>
                <p className="text-2xl font-bold">{eventCount}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Node Status Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Node Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Running</span>
                    <Badge variant="default">{metrics.runningNodes}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Completed</span>
                    <Badge variant="secondary">{metrics.completedNodes}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Failed</span>
                    <Badge variant="destructive">{metrics.failedNodes}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tool Calls</span>
                    <Badge variant="outline">{metrics.toolCallCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">LLM Calls</span>
                    <Badge variant="outline">{metrics.llmCallCount}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Errors</span>
                    <Badge variant={metrics.errorCount > 0 ? "destructive" : "outline"}>
                      {metrics.errorCount}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nodes">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Node Execution Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {nodeStatuses.map((node) => (
                    <div key={node.nodeId} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getNodeStatusIcon(node.status)}
                        <span className="font-medium">{node.nodeId}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {node.duration && (
                          <span>{formatDuration(node.duration)}</span>
                        )}
                        {node.cost && (
                          <span>{formatCurrency(node.cost)}</span>
                        )}
                        {node.error && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-1">
                  {events.slice(-20).reverse().map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-2 text-xs border-b">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {event.event}
                        </Badge>
                        {(event as any).nodeId && (
                          <span className="text-gray-600">{(event as any).nodeId}</span>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {new Date(event.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Duration</span>
                    <span className="font-medium">{formatDuration(metrics.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Node Duration</span>
                    <span className="font-medium">
                      {nodeStatuses.length > 0 
                        ? formatDuration(
                            nodeStatuses
                              .filter(n => n.duration)
                              .reduce((sum, n) => sum + (n.duration || 0), 0) / 
                            nodeStatuses.filter(n => n.duration).length
                          )
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Events/sec</span>
                    <span className="font-medium">
                      {metrics.duration > 0 
                        ? (eventCount / (metrics.duration / 1000)).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Cost</span>
                    <span className="font-medium">{formatCurrency(metrics.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Cost/Node</span>
                    <span className="font-medium">
                      {metrics.completedNodes > 0 
                        ? formatCurrency(metrics.totalCost / metrics.completedNodes)
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection Status</span>
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {connectionState}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}