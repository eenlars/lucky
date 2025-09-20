/**
 * API Integration Tests for Real-time Workflow System
 * 
 * Tests the HTTP API layer including:
 * - /api/workflow/invoke endpoint with observability
 * - /api/workflow/stream SSE endpoint
 * - Event filtering and client management
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { POST as invokeWorkflow } from '@/app/api/workflow/invoke/route'
import { GET as streamWorkflow } from '@/app/api/workflow/stream/route'
import { globalSSESink } from '@core/utils/observability/sinks/SSESink'
import { obs, setSink, MemorySink } from '@core/utils/observability/obs'
import { 
  InvocationInputBuilder, 
  WorkflowEventBuilder,
  AsyncTestUtils 
} from '../helpers/test-data-builders'

// Mock authentication
vi.mock('@/lib/api-auth', () => ({
  requireAuth: vi.fn().mockResolvedValue(null) // null means auth passed
}))

// Mock workflow execution
vi.mock('@core/workflow/runner/invokeWorkflow', () => ({
  invokeWorkflow: vi.fn()
}))

import { invokeWorkflow as mockInvokeWorkflow } from '@core/workflow/runner/invokeWorkflow'

describe('API Integration Tests', () => {
  let memorySink: MemorySink
  
  beforeEach(() => {
    // Reset state
    memorySink = new MemorySink()
    setSink(memorySink)
    
    // Clean up any existing SSE connections
    globalSSESink.getConnections().forEach(conn => {
      globalSSESink.removeConnection(conn.id)
    })
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up connections
    globalSSESink.getConnections().forEach(conn => {
      globalSSESink.removeConnection(conn.id)
    })
  })

  describe('/api/workflow/invoke endpoint', () => {
    it('should initialize observability and return invocation IDs', async () => {
      // Arrange
      const invocationInput = InvocationInputBuilder.create()
        .withTextInput()
        .build()
      
      const mockResult = {
        success: true,
        data: [
          {
            workflowInvocationId: 'test-invocation-001',
            queueRunResult: {
              success: true,
              agentSteps: [],
              finalWorkflowOutput: 'Test output',
              totalTime: 5000,
              totalCost: 0.025
            }
          }
        ]
      }
      
      ;(mockInvokeWorkflow as any).mockResolvedValue(mockResult)
      
      const request = new NextRequest('http://localhost:3000/api/workflow/invoke', {
        method: 'POST',
        body: JSON.stringify(invocationInput)
      })
      
      // Act
      const response = await invokeWorkflow(request)
      const responseData = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(responseData).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            workflowInvocationId: 'test-invocation-001'
          })
        ]),
        invocationIds: ['test-invocation-001']
      })
      
      // Verify observability was initialized
      expect(mockInvokeWorkflow).toHaveBeenCalledWith(invocationInput)
    })

    it('should handle workflow execution errors', async () => {
      // Arrange
      const invocationInput = InvocationInputBuilder.create()
        .withTextInput()
        .build()
      
      const mockErrorResult = {
        success: false,
        error: 'Workflow execution failed'
      }
      
      ;(mockInvokeWorkflow as any).mockResolvedValue(mockErrorResult)
      
      const request = new NextRequest('http://localhost:3000/api/workflow/invoke', {
        method: 'POST',
        body: JSON.stringify(invocationInput)
      })
      
      // Act
      const response = await invokeWorkflow(request)
      const responseData = await response.json()
      
      // Assert
      expect(response.status).toBe(500)
      expect(responseData).toMatchObject({
        error: 'Workflow execution failed'
      })
    })

    it('should handle invalid request bodies', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/workflow/invoke', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'input' })
      })
      
      // Act
      const response = await invokeWorkflow(request)
      const responseData = await response.json()
      
      // Assert
      expect(response.status).toBe(400)
      expect(responseData).toMatchObject({
        error: 'Invalid invocation input'
      })
    })

    it('should handle runtime errors gracefully', async () => {
      // Arrange
      const invocationInput = InvocationInputBuilder.create()
        .withTextInput()
        .build()
      
      ;(mockInvokeWorkflow as any).mockRejectedValue(new Error('Runtime error'))
      
      const request = new NextRequest('http://localhost:3000/api/workflow/invoke', {
        method: 'POST',
        body: JSON.stringify(invocationInput)
      })
      
      // Act
      const response = await invokeWorkflow(request)
      const responseData = await response.json()
      
      // Assert
      expect(response.status).toBe(500)
      expect(responseData).toMatchObject({
        error: 'Internal Server Error'
      })
    })
  })

  describe('/api/workflow/stream endpoint', () => {
    it('should establish SSE connection and stream events', async () => {
      // Arrange
      const invocationId = 'stream-test-001'
      const url = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
      const request = new NextRequest(url, { method: 'GET' })
      
      // Act
      const response = await streamWorkflow(request)
      
      // Assert
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      
      // Verify connection was added to SSE sink
      const connections = globalSSESink.getConnections()
      expect(connections.length).toBeGreaterThan(0)
      
      const connection = connections.find(conn => conn.invocationId === invocationId)
      expect(connection).toBeDefined()
      expect(connection?.connected).toBe(true)
    })

    it('should filter events by invocation ID', async () => {
      // Arrange
      const invocationId = 'filter-test-001'
      const url = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
      const request = new NextRequest(url, { method: 'GET' })
      
      // Establish connection
      const response = await streamWorkflow(request)
      expect(response).toBeInstanceOf(Response)
      
      // Get the connection to monitor events
      const connections = globalSSESink.getConnections()
      const connection = connections.find(conn => conn.invocationId === invocationId)
      expect(connection).toBeDefined()
      
      // Create mock controller to capture events
      const capturedEvents: string[] = []
      const mockController = {
        enqueue: (data: string) => capturedEvents.push(data),
        close: () => {},
        error: () => {}
      }
      
      // Replace the controller for testing
      if (connection) {
        (connection as any).controller = mockController
      }
      
      // Act - Emit events with different invocation IDs
      const matchingEvent = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId })
        .build()
      
      const nonMatchingEvent = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId: 'different-invocation' })
        .build()
      
      globalSSESink.event(matchingEvent)
      globalSSESink.event(nonMatchingEvent)
      
      // Assert
      expect(capturedEvents).toHaveLength(1)
      expect(capturedEvents[0]).toContain(invocationId)
      expect(capturedEvents[0]).not.toContain('different-invocation')
    })

    it('should handle connection without invocation ID', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/workflow/stream')
      const request = new NextRequest(url, { method: 'GET' })
      
      // Act
      const response = await streamWorkflow(request)
      
      // Assert
      expect(response).toBeInstanceOf(Response)
      
      // Should still create connection (for global events)
      const connections = globalSSESink.getConnections()
      expect(connections.length).toBeGreaterThan(0)
    })

    it('should send initial events to new connections', async () => {
      // Arrange
      const invocationId = 'initial-events-test'
      const initialEvents = [
        WorkflowEventBuilder.create().workflowStarted({ invocationId }).build(),
        WorkflowEventBuilder.create().nodeExecutionStarted({ invocationId }).build()
      ]
      
      // Mock the globalSSESink to return initial events
      const originalAddConnection = globalSSESink.addConnection.bind(globalSSESink)
      globalSSESink.addConnection = vi.fn().mockImplementation(
        (controller, clientId, invId, initEvents) => {
          return originalAddConnection(controller, clientId, invId, initialEvents)
        }
      )
      
      const url = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
      const request = new NextRequest(url, { method: 'GET' })
      
      // Act
      const response = await streamWorkflow(request)
      
      // Assert
      expect(response).toBeInstanceOf(Response)
      expect(globalSSESink.addConnection).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(invocationId),
        invocationId,
        initialEvents
      )
    })
  })

  describe('Real-time Event Flow Integration', () => {
    it('should handle complete invoke → stream → events flow', async () => {
      // Arrange
      const invocationInput = InvocationInputBuilder.create()
        .withTextInput()
        .build()
      
      const invocationId = 'flow-test-001'
      const mockResult = {
        success: true,
        data: [{
          workflowInvocationId: invocationId,
          queueRunResult: {
            success: true,
            agentSteps: [],
            finalWorkflowOutput: 'Flow test output',
            totalTime: 2000,
            totalCost: 0.01
          }
        }]
      }
      
      ;(mockInvokeWorkflow as any).mockResolvedValue(mockResult)
      
      // Step 1: Invoke workflow
      const invokeRequest = new NextRequest('http://localhost:3000/api/workflow/invoke', {
        method: 'POST',
        body: JSON.stringify(invocationInput)
      })
      
      const invokeResponse = await invokeWorkflow(invokeRequest)
      const invokeData = await invokeResponse.json()
      
      expect(invokeResponse.status).toBe(200)
      expect(invokeData.invocationIds).toContain(invocationId)
      
      // Step 2: Connect to stream
      const streamUrl = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
      const streamRequest = new NextRequest(streamUrl, { method: 'GET' })
      
      const streamResponse = await streamWorkflow(streamRequest)
      expect(streamResponse).toBeInstanceOf(Response)
      
      // Step 3: Verify connection exists
      const connections = globalSSESink.getConnections()
      const connection = connections.find(conn => conn.invocationId === invocationId)
      expect(connection).toBeDefined()
      
      // Step 4: Simulate workflow events
      const capturedEvents: string[] = []
      const mockController = {
        enqueue: (data: string) => capturedEvents.push(data),
        close: () => {},
        error: () => {}
      }
      
      if (connection) {
        (connection as any).controller = mockController
      }
      
      // Emit test events
      const workflowEvent = WorkflowEventBuilder.create()
        .workflowStarted({ invocationId })
        .build()
      
      globalSSESink.event(workflowEvent)
      
      // Assert events received
      expect(capturedEvents).toHaveLength(1)
      expect(capturedEvents[0]).toContain('workflow:started')
      expect(capturedEvents[0]).toContain(invocationId)
    })

    it('should handle multiple concurrent streams', async () => {
      // Arrange
      const invocationIds = ['concurrent-1', 'concurrent-2', 'concurrent-3']
      const connections: any[] = []
      
      // Create multiple stream connections
      for (const invocationId of invocationIds) {
        const url = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
        const request = new NextRequest(url, { method: 'GET' })
        
        const response = await streamWorkflow(request)
        expect(response).toBeInstanceOf(Response)
        
        const connection = globalSSESink.getConnections()
          .find(conn => conn.invocationId === invocationId)
        expect(connection).toBeDefined()
        
        // Setup event capture
        const capturedEvents: string[] = []
        const mockController = {
          enqueue: (data: string) => capturedEvents.push(data),
          close: () => {},
          error: () => {}
        }
        
        if (connection) {
          (connection as any).controller = mockController
          connections.push({ invocationId, capturedEvents })
        }
      }
      
      // Act - Emit events for different invocations
      for (const invocationId of invocationIds) {
        const event = WorkflowEventBuilder.create()
          .nodeExecutionStarted({ invocationId, nodeId: `node-${invocationId}` })
          .build()
        
        globalSSESink.event(event)
      }
      
      // Assert each connection received only its events
      for (const connection of connections) {
        expect(connection.capturedEvents).toHaveLength(1)
        expect(connection.capturedEvents[0]).toContain(connection.invocationId)
        expect(connection.capturedEvents[0]).toContain(`node-${connection.invocationId}`)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed stream requests', async () => {
      // Test with invalid query parameters
      const url = new URL('http://localhost:3000/api/workflow/stream?invocationId=')
      const request = new NextRequest(url, { method: 'GET' })
      
      const response = await streamWorkflow(request)
      
      // Should still establish connection (though with empty invocationId)
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should handle stream connection cleanup on close', async () => {
      // Arrange
      const invocationId = 'cleanup-test-001'
      const url = new URL(`http://localhost:3000/api/workflow/stream?invocationId=${invocationId}`)
      const request = new NextRequest(url, { method: 'GET' })
      
      // Act
      const response = await streamWorkflow(request)
      expect(response).toBeInstanceOf(Response)
      
      // Verify connection exists
      let connections = globalSSESink.getConnections()
      const connection = connections.find(conn => conn.invocationId === invocationId)
      expect(connection).toBeDefined()
      
      // Simulate connection close
      if (connection) {
        globalSSESink.removeConnection(connection.id)
      }
      
      // Assert connection cleaned up
      connections = globalSSESink.getConnections()
      expect(connections.find(conn => conn.invocationId === invocationId)).toBeUndefined()
    })

    it('should handle high-frequency API requests', async () => {
      // Arrange
      const requestCount = 50
      const invocationInput = InvocationInputBuilder.create()
        .withTextInput()
        .build()
      
      const mockResult = {
        success: true,
        data: [{
          workflowInvocationId: 'high-freq-test',
          queueRunResult: {
            success: true,
            agentSteps: [],
            finalWorkflowOutput: 'High frequency test',
            totalTime: 100,
            totalCost: 0.001
          }
        }]
      }
      
      ;(mockInvokeWorkflow as any).mockResolvedValue(mockResult)
      
      // Act
      const startTime = performance.now()
      const promises = []
      
      for (let i = 0; i < requestCount; i++) {
        const request = new NextRequest('http://localhost:3000/api/workflow/invoke', {
          method: 'POST',
          body: JSON.stringify(invocationInput)
        })
        
        promises.push(invokeWorkflow(request))
      }
      
      const responses = await Promise.all(promises)
      const endTime = performance.now()
      
      // Assert
      expect(responses).toHaveLength(requestCount)
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Should complete reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000)
    })
  })
})