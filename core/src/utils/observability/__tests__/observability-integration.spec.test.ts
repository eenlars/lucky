/**
 * Integration Tests for Observability System
 * 
 * Tests the complete observability flow including:
 * - obs → SSESink → client broadcasting
 * - Workflow execution with real-time events
 * - Multiple client scenarios
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { obs, setSink } from '@core/utils/observability/obs'
import { SSESink, globalSSESink } from '@core/utils/observability/sinks/SSESink'
import { WorkflowEventContext } from '@core/utils/observability/WorkflowEventContext'
import { initializeObservability } from '@core/utils/observability/setup'
import {
  WorkflowEventBuilder,
  ContextBuilder,
  AsyncTestUtils,
  InvocationInputBuilder,
  WorkflowConfigBuilder
} from '@core/__tests__/test-data-builders'

// Mock controllers for testing SSE connections
class MockSSEController {
  public messages: string[] = []
  public closed = false
  private onCloseCallback?: () => void

  enqueue(data: string) {
    if (this.closed) return
    this.messages.push(data)
  }

  close() {
    this.closed = true
    if (this.onCloseCallback) {
      this.onCloseCallback()
    }
  }

  onClose(callback: () => void) {
    this.onCloseCallback = callback
  }

  getLatestEvent() {
    if (this.messages.length === 0) return null
    const latestMessage = this.messages[this.messages.length - 1]
    const jsonData = latestMessage.replace(/^data: /, '').replace(/\n\n$/, '')
    return JSON.parse(jsonData)
  }

  getAllEvents() {
    return this.messages.map(msg => {
      const jsonData = msg.replace(/^data: /, '').replace(/\n\n$/, '')
      return JSON.parse(jsonData)
    })
  }
}

describe.skip('Observability Integration Tests', () => {
  let sseSink: SSESink
  let client1: MockSSEController
  let client2: MockSSEController
  let client3: MockSSEController

  beforeEach(() => {
    // Reset observability system
    sseSink = new SSESink()
    setSink(sseSink)
    
    // Create mock clients
    client1 = new MockSSEController()
    client2 = new MockSSEController()
    client3 = new MockSSEController()
  })

  afterEach(() => {
    // Clean up connections
    sseSink.getConnections().forEach(conn => {
      sseSink.removeConnection(conn.id)
    })
    vi.clearAllMocks()
  })

  describe('Complete Event Flow Integration', () => {
    it('should flow events from obs through SSESink to clients', async () => {
      // Arrange
      const invocationId = 'integration-test-001'
      
      // Connect clients to different invocations
      sseSink.addConnection(client1 as any, 'client-1', invocationId, [])
      sseSink.addConnection(client2 as any, 'client-2', invocationId, [])
      sseSink.addConnection(client3 as any, 'client-3', 'different-invocation', [])
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act - Emit events through obs within workflow context
      await obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        // Emit workflow lifecycle events
        eventContext.workflowStarted({
          nodeCount: 3,
          entryNodeId: 'start-node',
          goal: 'Integration test workflow'
        })
        
        await eventContext.withNodeContext('node-1', async () => {
          eventContext.nodeExecutionStarted({
            nodeId: 'node-1',
            nodeType: 'test-node',
            attempt: 1
          })
          
          // Simulate some processing
          await new Promise(resolve => setTimeout(resolve, 10))
          
          eventContext.nodeExecutionCompleted({
            nodeId: 'node-1',
            nodeType: 'test-node',
            duration: 1500,
            cost: 0.001,
            status: 'success'
          })
        })
        
        eventContext.workflowCompleted({
          duration: 5000,
          totalCost: 0.005,
          nodeInvocations: 1,
          status: 'success'
        })
      })
      
      // Assert
      // Clients 1 & 2 should receive events (same invocationId)
      expect(client1.messages).toHaveLength(4) // workflow:started, node:started, node:completed, workflow:completed
      expect(client2.messages).toHaveLength(4)
      expect(client3.messages).toHaveLength(0) // Different invocationId
      
      // Verify event content
      const client1Events = client1.getAllEvents()
      expect(client1Events[0].event).toBe('workflow:started')
      expect(client1Events[1].event).toBe('node:execution:started')
      expect(client1Events[2].event).toBe('node:execution:completed')
      expect(client1Events[3].event).toBe('workflow:completed')
      
      // Verify context propagation
      client1Events.forEach(event => {
        expect(event.invocationId).toBe(invocationId)
        expect(event.wfId).toBe('test-workflow-001')
      })
    })

    it('should handle real-time event streaming during workflow execution', async () => {
      // Arrange
      const invocationId = 'real-time-test-001'
      const eventCollector: any[] = []
      
      sseSink.addConnection(client1 as any, 'real-time-client', invocationId, [])
      
      // Monitor events as they arrive
      const originalEnqueue = client1.enqueue.bind(client1)
      client1.enqueue = (data: string) => {
        originalEnqueue(data)
        const jsonData = data.replace(/^data: /, '').replace(/\n\n$/, '')
        eventCollector.push({
          timestamp: Date.now(),
          event: JSON.parse(jsonData)
        })
      }
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act - Simulate real workflow execution
      const startTime = Date.now()
      
      await obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        eventContext.workflowStarted({
          nodeCount: 2,
          entryNodeId: 'real-time-start',
          goal: 'Real-time streaming test'
        })
        
        // Simulate node execution with delays
        for (const nodeId of ['real-time-node-1', 'real-time-node-2']) {
          await eventContext.withNodeContext(nodeId, async () => {
            eventContext.nodeExecutionStarted({
              nodeId,
              nodeType: 'real-time-node',
              attempt: 1
            })
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 50))
            
            eventContext.nodeExecutionCompleted({
              nodeId,
              nodeType: 'real-time-node',
              duration: 50,
              cost: 0.001,
              status: 'success'
            })
          })
        }
        
        eventContext.workflowCompleted({
          duration: Date.now() - startTime,
          totalCost: 0.002,
          nodeInvocations: 2,
          status: 'success'
        })
      })
      
      // Assert real-time characteristics
      expect(eventCollector).toHaveLength(5) // 1 workflow:started + 2*(node:started + node:completed) + 1 workflow:completed
      
      // Verify events arrived in chronological order
      for (let i = 1; i < eventCollector.length; i++) {
        expect(eventCollector[i].timestamp).toBeGreaterThanOrEqual(eventCollector[i-1].timestamp)
      }
      
      // Verify event sequence
      const eventTypes = eventCollector.map(item => item.event.event)
      expect(eventTypes).toEqual([
        'workflow:started',
        'node:execution:started',
        'node:execution:completed',
        'node:execution:started', 
        'node:execution:completed',
        'workflow:completed'
      ])
    })
  })

  describe('Multiple Client Scenarios', () => {
    it('should handle concurrent clients for the same workflow', async () => {
      // Arrange
      const invocationId = 'concurrent-test-001'
      const clientCount = 10
      const clients: MockSSEController[] = []
      
      // Connect multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new MockSSEController()
        clients.push(client)
        sseSink.addConnection(client as any, `concurrent-client-${i}`, invocationId, [])
      }
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act - Emit events rapidly
      await obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        eventContext.workflowStarted({
          nodeCount: 1,
          entryNodeId: 'concurrent-node',
          goal: 'Concurrent client test'
        })
        
        // Emit many node events rapidly
        for (let i = 0; i < 50; i++) {
          eventContext.nodeExecutionStarted({
            nodeId: `rapid-node-${i}`,
            nodeType: 'rapid-node',
            attempt: 1
          })
          
          eventContext.nodeExecutionCompleted({
            nodeId: `rapid-node-${i}`,
            nodeType: 'rapid-node',
            duration: 10,
            cost: 0.0001,
            status: 'success'
          })
        }
        
        eventContext.workflowCompleted({
          duration: 1000,
          totalCost: 0.005,
          nodeInvocations: 50,
          status: 'success'
        })
      })
      
      // Assert all clients received all events
      const expectedEventCount = 1 + (50 * 2) + 1 // workflow:started + 50*(node:started + node:completed) + workflow:completed
      
      clients.forEach((client, index) => {
        expect(client.messages).toHaveLength(expectedEventCount)
        
        // Verify first and last events
        const events = client.getAllEvents()
        expect(events[0].event).toBe('workflow:started')
        expect(events[events.length - 1].event).toBe('workflow:completed')
      })
    })

    it('should handle clients connecting at different times', async () => {
      // Arrange
      const invocationId = 'staggered-test-001'
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Start workflow execution
      const executionPromise = obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        eventContext.workflowStarted({
          nodeCount: 3,
          entryNodeId: 'staggered-start',
          goal: 'Staggered client connection test'
        })
        
        // Connect first client immediately
        sseSink.addConnection(client1 as any, 'early-client', invocationId, [])
        
        await new Promise(resolve => setTimeout(resolve, 25))
        
        eventContext.nodeExecutionStarted({
          nodeId: 'staggered-node-1',
          nodeType: 'staggered-node',
          attempt: 1
        })
        
        // Connect second client mid-execution
        sseSink.addConnection(client2 as any, 'mid-client', invocationId, [])
        
        await new Promise(resolve => setTimeout(resolve, 25))
        
        eventContext.nodeExecutionCompleted({
          nodeId: 'staggered-node-1',
          nodeType: 'staggered-node',
          duration: 50,
          cost: 0.001,
          status: 'success'
        })
        
        // Connect third client near end
        sseSink.addConnection(client3 as any, 'late-client', invocationId, [])
        
        await new Promise(resolve => setTimeout(resolve, 25))
        
        eventContext.workflowCompleted({
          duration: 100,
          totalCost: 0.001,
          nodeInvocations: 1,
          status: 'success'
        })
      })
      
      await executionPromise
      
      // Assert different clients received different event counts
      expect(client1.messages.length).toBeGreaterThan(client2.messages.length)
      expect(client2.messages.length).toBeGreaterThan(client3.messages.length)
      
      // All should receive the final workflow:completed event
      expect(client1.getLatestEvent().event).toBe('workflow:completed')
      expect(client2.getLatestEvent().event).toBe('workflow:completed')
      expect(client3.getLatestEvent().event).toBe('workflow:completed')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle client disconnections gracefully', async () => {
      // Arrange
      const invocationId = 'disconnect-test-001'
      
      sseSink.addConnection(client1 as any, 'stable-client', invocationId, [])
      sseSink.addConnection(client2 as any, 'unstable-client', invocationId, [])
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act
      await obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        eventContext.workflowStarted({
          nodeCount: 2,
          entryNodeId: 'disconnect-test',
          goal: 'Test client disconnection handling'
        })
        
        // Disconnect one client mid-stream
        client2.close()
        sseSink.removeConnection('unstable-client')
        
        eventContext.nodeExecutionStarted({
          nodeId: 'disconnect-node',
          nodeType: 'disconnect-test',
          attempt: 1
        })
        
        eventContext.nodeExecutionCompleted({
          nodeId: 'disconnect-node',
          nodeType: 'disconnect-test',
          duration: 100,
          cost: 0.001,
          status: 'success'
        })
        
        eventContext.workflowCompleted({
          duration: 200,
          totalCost: 0.001,
          nodeInvocations: 1,
          status: 'success'
        })
      })
      
      // Assert
      // Stable client should receive all events
      expect(client1.messages).toHaveLength(4)
      expect(client1.getLatestEvent().event).toBe('workflow:completed')
      
      // Unstable client should only receive initial event
      expect(client2.messages).toHaveLength(1)
      expect(client2.getLatestEvent().event).toBe('workflow:started')
    })

    it('should handle errors in event emission gracefully', async () => {
      // Arrange
      const invocationId = 'error-test-001'
      const faultyClient = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error('Client error')
        })
      }
      
      sseSink.addConnection(faultyClient as any, 'faulty-client', invocationId, [])
      sseSink.addConnection(client1 as any, 'stable-client', invocationId, [])
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act & Assert - Should not throw despite faulty client
      await expect(
        obs.scope(context, async () => {
          const eventContext = new WorkflowEventContext(context)
          
          eventContext.workflowStarted({
            nodeCount: 1,
            entryNodeId: 'error-test',
            goal: 'Test error handling'
          })
          
          eventContext.workflowCompleted({
            duration: 100,
            totalCost: 0.001,
            nodeInvocations: 0,
            status: 'success'
          })
        })
      ).resolves.not.toThrow()
      
      // Stable client should still receive events
      expect(client1.messages).toHaveLength(2)
    })
  })

  describe('Memory Management and Performance', () => {
    it('should handle high-frequency events without memory leaks', async () => {
      // Arrange
      const invocationId = 'memory-test-001'
      const eventCount = 5000
      
      sseSink.addConnection(client1 as any, 'memory-client', invocationId, [])
      
      const context = ContextBuilder.create()
        .withWorkflowContext({ invocationId })
        .build()
      
      // Act
      const startMemory = process.memoryUsage().heapUsed
      const startTime = performance.now()
      
      await obs.scope(context, async () => {
        const eventContext = new WorkflowEventContext(context)
        
        eventContext.workflowStarted({
          nodeCount: eventCount,
          entryNodeId: 'memory-start',
          goal: 'Memory test workflow'
        })
        
        // Emit many events rapidly
        for (let i = 0; i < eventCount; i++) {
          eventContext.nodeExecutionStarted({
            nodeId: `memory-node-${i}`,
            nodeType: 'memory-node',
            attempt: 1
          })
        }
        
        eventContext.workflowCompleted({
          duration: 10000,
          totalCost: 0.1,
          nodeInvocations: eventCount,
          status: 'success'
        })
      })
      
      const endTime = performance.now()
      const endMemory = process.memoryUsage().heapUsed
      
      // Assert performance
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(client1.messages).toHaveLength(eventCount + 2) // All events + workflow start/end
      
      // Memory growth should be reasonable (less than 100MB for this test)
      const memoryGrowth = endMemory - startMemory
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024)
    })

    it('should clean up resources properly', async () => {
      // Arrange
      const connectionCount = 100
      const clients: MockSSEController[] = []
      
      // Create many connections
      for (let i = 0; i < connectionCount; i++) {
        const client = new MockSSEController()
        clients.push(client)
        sseSink.addConnection(client as any, `cleanup-client-${i}`, `invocation-${i}`, [])
      }
      
      expect(sseSink.getConnectionCount()).toBe(connectionCount)
      
      // Act - Remove all connections
      for (let i = 0; i < connectionCount; i++) {
        sseSink.removeConnection(`cleanup-client-${i}`)
      }
      
      // Assert
      expect(sseSink.getConnectionCount()).toBe(0)
      expect(sseSink.getConnections()).toHaveLength(0)
    })
  })

  describe('Observability Setup Integration', () => {
    it('should initialize complete observability system correctly', () => {
      // Act
      const obsStats = initializeObservability({
        enableConsoleLogging: true,
        enableSSEStreaming: true
      })
      
      // Assert
      expect(obsStats.sseConnectionCount).toBeDefined()
      expect(obsStats.sseConnections).toBeDefined()
      expect(typeof obsStats.sseConnectionCount()).toBe('number')
      expect(Array.isArray(obsStats.sseConnections())).toBe(true)
    })

    it('should configure SSE-only mode correctly', () => {
      // Act
      const obsStats = initializeObservability({
        enableConsoleLogging: false,
        enableSSEStreaming: true
      })
      
      // Test that events flow to SSE
      const testInvocationId = 'sse-only-test'
      sseSink.addConnection(client1 as any, 'sse-only-client', testInvocationId, [])
      
      obs.event('sse-only-event', { message: 'SSE only test' })
      
      // Assert
      expect(client1.messages).toHaveLength(1)
      expect(client1.getLatestEvent()).toMatchObject({
        message: 'SSE only test'
      })
    })
  })
})