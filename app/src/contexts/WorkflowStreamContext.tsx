/**
 * React Context for managing workflow event streams globally
 * 
 * Provides a centralized way to manage multiple workflow streams,
 * subscription management, and event aggregation across the app.
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { WorkflowEvent } from '@core/utils/observability/events/WorkflowEvents'

export interface WorkflowStreamSubscription {
  id: string
  invocationId?: string
  nodeId?: string
  events?: string[]
  callback: (event: WorkflowEvent) => void
  active: boolean
}

export interface ActiveWorkflow {
  invocationId: string
  status: 'running' | 'completed' | 'failed'
  progress: {
    completedNodes: number
    totalNodes: number
    percentage: number
  }
  lastActivity: Date
  events: WorkflowEvent[]
}

interface WorkflowStreamContextValue {
  // Active workflows being tracked
  activeWorkflows: Map<string, ActiveWorkflow>
  
  // Connection state
  isConnected: boolean
  connectionError: string | null
  
  // Subscription management
  subscribe: (subscription: Omit<WorkflowStreamSubscription, 'id' | 'active'>) => string
  unsubscribe: (subscriptionId: string) => void
  
  // Workflow management
  startTracking: (invocationId: string) => void
  stopTracking: (invocationId: string) => void
  
  // Event access
  getWorkflowEvents: (invocationId: string) => WorkflowEvent[]
  getLatestEvent: (invocationId: string) => WorkflowEvent | null
  
  // Connection control
  connect: () => void
  disconnect: () => void
  
  // Statistics
  getTotalEventCount: () => number
  getActiveWorkflowCount: () => number
}

const WorkflowStreamContext = createContext<WorkflowStreamContextValue | null>(null)

interface WorkflowStreamProviderProps {
  children: React.ReactNode
  maxEventsPerWorkflow?: number
  cleanupInactiveAfter?: number // milliseconds
}

export function WorkflowStreamProvider({ 
  children, 
  maxEventsPerWorkflow = 500,
  cleanupInactiveAfter = 5 * 60 * 1000, // 5 minutes
}: WorkflowStreamProviderProps) {
  const [activeWorkflows, setActiveWorkflows] = useState<Map<string, ActiveWorkflow>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const subscriptionsRef = useRef<Map<string, WorkflowStreamSubscription>>(new Map())
  const eventSourceRef = useRef<EventSource | null>(null)
  const subscriptionIdCounter = useRef(0)

  // Generate unique subscription ID
  const generateSubscriptionId = useCallback(() => {
    return `sub_${++subscriptionIdCounter.current}_${Date.now()}`
  }, [])

  // Connect to global SSE stream
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionError(null)
    
    const eventSource = new EventSource('/api/workflow/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Skip heartbeat and connection events
        if (data.event === 'heartbeat' || data.event === 'connection:established') {
          return
        }

        const workflowEvent = data as WorkflowEvent

        // Update active workflows
        setActiveWorkflows(prev => {
          const updated = new Map(prev)
          const invocationId = workflowEvent.invocationId
          
          if (invocationId) {
            const existing = updated.get(invocationId)
            const newEvents = existing 
              ? [...existing.events, workflowEvent].slice(-maxEventsPerWorkflow)
              : [workflowEvent]

            // Calculate progress
            const nodeStartEvents = newEvents.filter(e => e.event === 'node:execution:started')
            const nodeCompleteEvents = newEvents.filter(e => e.event === 'node:execution:completed')
            const workflowStartEvent = newEvents.find(e => e.event === 'workflow:started') as any
            const workflowCompleteEvent = newEvents.find(e => e.event === 'workflow:completed')

            const totalNodes = workflowStartEvent?.nodeCount || existing?.progress.totalNodes || 0
            const completedNodes = nodeCompleteEvents.length
            const percentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

            let status: 'running' | 'completed' | 'failed' = 'running'
            if (workflowCompleteEvent) {
              status = (workflowCompleteEvent as any).status === 'failed' ? 'failed' : 'completed'
            }

            updated.set(invocationId, {
              invocationId,
              status,
              progress: {
                completedNodes,
                totalNodes,
                percentage: workflowCompleteEvent ? 100 : percentage,
              },
              lastActivity: new Date(),
              events: newEvents,
            })
          }
          
          return updated
        })

        // Notify subscribers
        for (const subscription of subscriptionsRef.current.values()) {
          if (!subscription.active) continue

          // Check if event matches subscription filters
          let matches = true
          
          if (subscription.invocationId && workflowEvent.invocationId !== subscription.invocationId) {
            matches = false
          }
          
          if (subscription.nodeId && (workflowEvent as any).nodeId !== subscription.nodeId) {
            matches = false
          }
          
          if (subscription.events && subscription.events.length > 0) {
            matches = subscription.events.includes(workflowEvent.event)
          }

          if (matches) {
            try {
              subscription.callback(workflowEvent)
            } catch (error) {
              console.error('Error in workflow event subscription callback:', error)
            }
          }
        }
      } catch (error) {
        console.error('Failed to parse workflow event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Workflow stream connection error:', error)
      setIsConnected(false)
      setConnectionError('Connection error occurred')
    }
  }, [maxEventsPerWorkflow])

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
  }, [])

  // Subscribe to workflow events
  const subscribe = useCallback((subscription: Omit<WorkflowStreamSubscription, 'id' | 'active'>) => {
    const id = generateSubscriptionId()
    subscriptionsRef.current.set(id, {
      ...subscription,
      id,
      active: true,
    })
    return id
  }, [generateSubscriptionId])

  // Unsubscribe from workflow events
  const unsubscribe = useCallback((subscriptionId: string) => {
    const subscription = subscriptionsRef.current.get(subscriptionId)
    if (subscription) {
      subscription.active = false
      subscriptionsRef.current.delete(subscriptionId)
    }
  }, [])

  // Start tracking a specific workflow
  const startTracking = useCallback((invocationId: string) => {
    setActiveWorkflows(prev => {
      if (!prev.has(invocationId)) {
        const updated = new Map(prev)
        updated.set(invocationId, {
          invocationId,
          status: 'running',
          progress: { completedNodes: 0, totalNodes: 0, percentage: 0 },
          lastActivity: new Date(),
          events: [],
        })
        return updated
      }
      return prev
    })
  }, [])

  // Stop tracking a specific workflow
  const stopTracking = useCallback((invocationId: string) => {
    setActiveWorkflows(prev => {
      const updated = new Map(prev)
      updated.delete(invocationId)
      return updated
    })
  }, [])

  // Get events for a specific workflow
  const getWorkflowEvents = useCallback((invocationId: string) => {
    return activeWorkflows.get(invocationId)?.events || []
  }, [activeWorkflows])

  // Get latest event for a specific workflow
  const getLatestEvent = useCallback((invocationId: string) => {
    const events = getWorkflowEvents(invocationId)
    return events[events.length - 1] || null
  }, [getWorkflowEvents])

  // Get total event count across all workflows
  const getTotalEventCount = useCallback(() => {
    let total = 0
    for (const workflow of activeWorkflows.values()) {
      total += workflow.events.length
    }
    return total
  }, [activeWorkflows])

  // Get number of active workflows
  const getActiveWorkflowCount = useCallback(() => {
    return Array.from(activeWorkflows.values()).filter(w => w.status === 'running').length
  }, [activeWorkflows])

  // Cleanup inactive workflows periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now()
      setActiveWorkflows(prev => {
        const updated = new Map(prev)
        for (const [id, workflow] of updated.entries()) {
          if (workflow.status !== 'running' && 
              now - workflow.lastActivity.getTime() > cleanupInactiveAfter) {
            updated.delete(id)
          }
        }
        return updated
      })
    }

    const interval = setInterval(cleanup, cleanupInactiveAfter)
    return () => clearInterval(interval)
  }, [cleanupInactiveAfter])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  const value: WorkflowStreamContextValue = {
    activeWorkflows,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
    startTracking,
    stopTracking,
    getWorkflowEvents,
    getLatestEvent,
    connect,
    disconnect,
    getTotalEventCount,
    getActiveWorkflowCount,
  }

  return (
    <WorkflowStreamContext.Provider value={value}>
      {children}
    </WorkflowStreamContext.Provider>
  )
}

/**
 * Hook to access the workflow stream context
 */
export function useWorkflowStreamContext() {
  const context = useContext(WorkflowStreamContext)
  if (!context) {
    throw new Error('useWorkflowStreamContext must be used within a WorkflowStreamProvider')
  }
  return context
}