import {
  type ColorMode,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
  type XYPosition,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge as rfAddEdge,
} from "@xyflow/react"
import { create } from "zustand"
import { createJSONStorage, persist, subscribeWithSelector } from "zustand/middleware"

import { useModelPreferencesStore } from "@/features/provider-llm-setup/store/model-preferences-store"
import { setColorModeCookie } from "@/features/react-flow-visualization/components/actions/cookies"
import { type AppEdge, createEdge } from "@/features/react-flow-visualization/components/edges/edges"
import nodesConfig, {
  type AppNode,
  type AppNodeType,
  type WorkflowNodeData,
  createNodeByType,
} from "@/features/react-flow-visualization/components/nodes/nodes"
import { CITY_NAMES } from "@/features/react-flow-visualization/lib/city-names"
import { toFrontendWorkflowConfig } from "@/features/react-flow-visualization/lib/workflow-data"
import { requiresHandle } from "@/features/react-flow-visualization/store/edge-validation"
import { logException } from "@/lib/error-logger"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { layoutGraph } from "./layout"

export type WorkflowValidationError = {
  id: string
  title: string
  description: string
  severity: "error" | "warning"
}

export type AppState = {
  nodes: AppNode[]
  edges: AppEdge[]
  colorMode: ColorMode
  layout: "fixed" | "free"
  draggedNodes: Map<string, AppNode>
  connectionSites: Map<string, PotentialConnection>
  potentialConnection?: PotentialConnection
  draggedPaletteNodeType?: AppNodeType
  workflowLoading: boolean
  workflowError?: string
  workflowValidationErrors: WorkflowValidationError[]
  errorPanelOpen: boolean
  selectedNodeId?: string
  nodeDetailsOpen: boolean
  detailPanelExpanded: boolean
  // JSON editor state
  workflowJSON: string
  currentWorkflowId?: string
  // Chat messages state
  chatMessages: Array<{
    id: string
    text: string
    timestamp: number
    type: "system" | "result" | "error"
  }>
  // Execution logs panel state
  logPanelOpen: boolean
  // Hydration state
  _hasHydrated: boolean
}

/**
 * You can potentially connect to an already existing edge or to a free handle of a node.
 */
export type PotentialConnection = {
  id: string
  position: XYPosition
  type?: "source" | "target"
  source?: ConnectionHandle
  target?: ConnectionHandle
}
export type ConnectionHandle = {
  node: string
  handle?: string | null
}

export type AppActions = {
  toggleDarkMode: () => void
  toggleLayout: () => void
  onNodesChange: OnNodesChange<AppNode>
  setNodes: (nodes: AppNode[]) => void
  addNode: (node: AppNode) => void
  removeNode: (nodeId: string) => void
  addNodeByType: (type: AppNodeType, position: XYPosition) => null | string
  addNodeInBetween: ({
    type,
    source,
    target,
    sourceHandleId,
    targetHandleId,
    position,
  }: {
    type: AppNodeType
    source?: string
    target?: string
    sourceHandleId?: string | null
    targetHandleId?: string | null
    position: XYPosition
  }) => void
  getNodes: () => AppNode[]
  setEdges: (edges: AppEdge[]) => void
  getEdges: () => AppEdge[]
  addEdge: (edge: AppEdge) => void
  removeEdge: (edgeId: string) => void
  onConnect: OnConnect
  onEdgesChange: OnEdgesChange<AppEdge>
  onNodeDragStart: OnNodeDrag<AppNode>
  onNodeDragStop: OnNodeDrag<AppNode>
  checkForPotentialConnection: (
    position: XYPosition,
    options?: { exclude?: string[]; type?: "source" | "target" },
  ) => void
  resetPotentialConnection: () => void
  setDraggedPaletteNodeType: (type?: AppNodeType) => void
  loadWorkflowConfig: (mode?: "cultural" | "genetic") => Promise<void>
  loadWorkflowVersion: (workflowVersionId: string) => Promise<void>
  loadWorkflowFromData: (workflowData: WorkflowConfig, workflowVersionId?: string) => Promise<void>
  exportToJSON: () => string
  updateWorkflowJSON: (json: string) => void
  syncJSONToGraph: () => Promise<void>
  organizeLayout: () => Promise<void>

  openNodeDetails: (nodeId: string) => void
  closeNodeDetails: () => void
  toggleDetailPanelExpanded: () => void
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void
  addChatMessage: (text: string, type: "system" | "result" | "error") => void
  clearChatMessages: () => void
  toggleLogPanel: () => void
  setLogPanelOpen: (open: boolean) => void
  addValidationError: (error: WorkflowValidationError) => void
  addValidationErrors: (errors: WorkflowValidationError[]) => void
  clearValidationErrors: () => void
  removeValidationError: (errorId: string) => void
  toggleErrorPanel: () => void
  setErrorPanelOpen: (open: boolean) => void
}

export type AppStore = AppState & AppActions

export const defaultState: AppState = {
  nodes: [],
  edges: [],
  colorMode: "light",
  layout: "free",
  draggedNodes: new Map(),
  connectionSites: new Map(),
  potentialConnection: undefined,
  draggedPaletteNodeType: undefined,
  workflowLoading: false,
  workflowError: undefined,
  workflowValidationErrors: [],
  errorPanelOpen: false,
  selectedNodeId: undefined,
  nodeDetailsOpen: false,
  detailPanelExpanded: false,
  workflowJSON: JSON.stringify({ nodes: [], entryNodeId: "" }, null, 2),
  currentWorkflowId: undefined,
  chatMessages: [],
  logPanelOpen: false,
  _hasHydrated: false,
}

export const createAppStore = (initialState: AppState = defaultState) => {
  const store = create<AppStore>()(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        onNodesChange: async changes => {
          const dragged = get().draggedNodes
          const filteredChanges =
            dragged && dragged.size > 0
              ? changes.filter(change => {
                  if (change.type !== "position") return true
                  const nodeId = "id" in change ? (change as { id: string }).id : ""
                  return dragged.has(nodeId)
                })
              : changes

          const nextNodes = applyNodeChanges(filteredChanges, get().nodes)
          set({ nodes: nextNodes })

          if (get().layout === "fixed" && changes.some(change => change.type === "dimensions")) {
            const layoutedNodes = await layoutGraph(nextNodes, get().edges)
            set({ nodes: layoutedNodes })
          } else {
            set({ nodes: nextNodes })
          }
        },

        setNodes: nodes => set({ nodes }),

        addNode: node => {
          const nextNodes = [...get().nodes, node]
          set({ nodes: nextNodes })
        },

        removeNode: nodeId => {
          // Remove the node
          const filteredNodes = get().nodes.filter(node => node.id !== nodeId)
          // Remove all edges connected to this node
          const filteredEdges = get().edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
          set({ nodes: filteredNodes, edges: filteredEdges })
        },

        addNodeByType: (type, position) => {
          // Generate a unique city name for workflow nodes
          let nodeId: string | undefined = undefined
          if (type === "transform-node" || type === "branch-node" || type === "join-node") {
            const nodes = get().nodes
            const existingNodeIds = new Set(nodes.map(n => n.id))

            // Find first unused city name
            let cityName = CITY_NAMES.find(city => !existingNodeIds.has(city))

            // If all cities are used, add a number suffix
            if (!cityName) {
              for (const city of CITY_NAMES) {
                let suffix = 2
                while (existingNodeIds.has(`${city} ${suffix}`)) {
                  suffix++
                }
                cityName = `${city} ${suffix}`
                break
              }
            }

            nodeId = cityName
          }

          const newNode = createNodeByType({ type, position, id: nodeId })

          if (!newNode) return null

          get().addNode(newNode)

          return newNode.id
        },

        getNodes: () => get().nodes,

        addNodeInBetween: ({ source, target, type, sourceHandleId, targetHandleId, position }) => {
          const newNodeId = get().addNodeByType(type, position)
          if (!newNodeId) return

          get().removeEdge(`${source}-${sourceHandleId ?? ""}-${target}-${targetHandleId ?? ""}`)

          const nodeHandles = nodesConfig[type].handles
          const nodeSource = nodeHandles.find(handle => handle.type === "source")
          const nodeTarget = nodeHandles.find(handle => handle.type === "target")

          const edges = []
          if (nodeTarget && source) {
            edges.push(createEdge(source, newNodeId, sourceHandleId, nodeTarget.id))
          }

          if (nodeSource && target) {
            edges.push(createEdge(newNodeId, target, nodeSource.id, targetHandleId))
          }

          const nextEdges = [...get().edges, ...edges]
          set({ edges: nextEdges })
        },

        setEdges: edges => set({ edges }),

        getEdges: () => get().edges,

        addEdge: edge => {
          const nodes = get().nodes
          const sourceNode = nodes.find(n => n.id === edge.source)
          const targetNode = nodes.find(n => n.id === edge.target)

          if (requiresHandle(sourceNode?.type, "source") && !edge.sourceHandle) {
            console.error(
              `Edge rejected: missing sourceHandle for node '${edge.source}' which has multiple source handles`,
            )
            return
          }

          if (requiresHandle(targetNode?.type, "target") && !edge.targetHandle) {
            console.error(
              `Edge rejected: missing targetHandle for node '${edge.target}' which has multiple target handles`,
            )
            return
          }

          const nextEdges = rfAddEdge(edge, get().edges)
          set({ edges: nextEdges })
        },

        removeEdge: edgeId => {
          set({ edges: get().edges.filter(edge => edge.id !== edgeId) })
        },

        onEdgesChange: changes => {
          const nextEdges = applyEdgeChanges(changes, get().edges)
          set({ edges: nextEdges })
        },

        onConnect: connection => {
          const nodes = get().nodes
          const sourceNode = nodes.find(n => n.id === connection.source)
          const targetNode = nodes.find(n => n.id === connection.target)

          if (requiresHandle(sourceNode?.type, "source") && !connection.sourceHandle) {
            console.error(
              `Connection rejected: missing sourceHandle for node '${connection.source}' which has multiple source handles`,
            )
            return
          }

          if (requiresHandle(targetNode?.type, "target") && !connection.targetHandle) {
            console.error(
              `Connection rejected: missing targetHandle for node '${connection.target}' which has multiple target handles`,
            )
            return
          }

          const newEdge: AppEdge = {
            id: `${connection.source}-${connection.sourceHandle ?? ""}-${connection.target}-${connection.targetHandle ?? ""}`,
            source: connection.source!,
            target: connection.target!,
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined,
            type: "workflow",
            animated: true,
          }

          get().addEdge(newEdge)
        },

        toggleDarkMode: () =>
          set(state => ({
            colorMode: state.colorMode === "dark" ? "light" : "dark",
          })),

        toggleLayout: () =>
          set(state => ({
            layout: state.layout === "fixed" ? "free" : "fixed",
          })),

        checkForPotentialConnection: (position, options) => {
          const closest: {
            distance: number
            potentialConnection?: PotentialConnection
          } = {
            distance: Number.POSITIVE_INFINITY,
            potentialConnection: undefined,
          }

          for (const connectionSite of get().connectionSites.values()) {
            if (options?.exclude?.includes(connectionSite.id)) {
              continue
            }

            if (options?.type && options.type && options.type === connectionSite.type) {
              continue
            }

            const distance = Math.hypot(connectionSite.position.x - position.x, connectionSite.position.y - position.y)

            if (distance < closest.distance) {
              closest.distance = distance
              closest.potentialConnection = connectionSite
            }
          }

          set({
            potentialConnection: closest.distance < 150 ? closest.potentialConnection : undefined,
          })
        },

        resetPotentialConnection: () => {
          set({ potentialConnection: undefined })
        },

        setDraggedPaletteNodeType: type => {
          set({ draggedPaletteNodeType: type })
        },

        onNodeDragStart: (_, node) => {
          // Only allow dragging a single node at a time
          set({ draggedNodes: new Map([[node.id, node]]) })
        },
        onNodeDragStop: () => {
          set({ draggedNodes: new Map() })
          set({ potentialConnection: undefined })
        },

        loadWorkflowConfig: async (mode = "cultural") => {
          console.log("loadWorkflowConfig called with mode:", mode)
          set({ workflowLoading: true, workflowError: undefined })

          try {
            const response = await fetch(`/api/workflow/config?mode=${mode}`)

            if (!response.ok) {
              throw new Error(`Failed to load workflow config: ${response.statusText}`)
            }

            const workflowConfig = await response.json()
            console.log("Workflow config loaded:", workflowConfig)

            // Check if this is a fallback version loaded from database
            if (workflowConfig._fallbackVersion) {
              console.log(workflowConfig._fallbackMessage)
              // Set the current workflow ID for saving
              set({ currentWorkflowId: workflowConfig._fallbackVersion })
              // Update URL to reflect the loaded version
              if (typeof window !== "undefined") {
                const newUrl = `/trace/${workflowConfig._fallbackVersion}`
                window.history.replaceState(null, "", newUrl)
              }
            }

            // Get user preferences for model validation
            const userPreferences = useModelPreferencesStore.getState().preferences
            const setup = toFrontendWorkflowConfig(workflowConfig, userPreferences)
            console.log("Initial setup config:", setup)

            // Check if workflow has saved layout positions
            if (workflowConfig.ui?.layout?.nodes && workflowConfig.ui.layout.nodes.length > 0) {
              console.log("Restoring saved layout positions...")
              // Restore positions from saved layout
              const layoutMap = new Map(workflowConfig.ui.layout.nodes.map((n: any) => [n.nodeId, { x: n.x, y: n.y }]))

              const nodesWithPositions = setup.nodes.map(node => {
                const savedPosition = layoutMap.get(node.id)
                if (savedPosition) {
                  return {
                    ...node,
                    position: savedPosition,
                  } as AppNode
                }
                return {
                  ...node,
                  position: { x: 0, y: 0 },
                } as AppNode
              })

              set({
                nodes: nodesWithPositions,
                edges: setup.edges,
                workflowLoading: false,
              })
              console.log("Saved layout positions restored")
            } else {
              // Legacy workflow without layout - use auto-layout
              console.log("No saved layout found, applying auto-layout...")
              const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)
              console.log("Layout applied, positioned nodes:", layoutedNodes.length)

              set({
                nodes: layoutedNodes,
                edges: setup.edges,
                workflowLoading: false,
              })
              console.log("Workflow config loading completed")
            }
          } catch (error) {
            logException(error, {
              location: "/store/app-store",
            })
            console.error("Error loading workflow config:", error)
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            set({
              workflowLoading: false,
              workflowError: errorMessage,
            })
          }
        },

        loadWorkflowVersion: async (workflowVersionId: string) => {
          set({ workflowLoading: true, workflowError: undefined })

          try {
            const response = await fetch(`/api/workflow/version/${workflowVersionId}`)

            if (!response.ok) {
              throw new Error(`Failed to load workflow version: ${response.statusText}`)
            }

            const workflowConfig = await response.json()
            // Get user preferences for model validation
            const userPreferences = useModelPreferencesStore.getState().preferences
            const setup = toFrontendWorkflowConfig(workflowConfig, userPreferences)

            // Check if workflow has saved layout positions
            if (workflowConfig.ui?.layout?.nodes && workflowConfig.ui.layout.nodes.length > 0) {
              // Restore positions from saved layout
              const layoutMap = new Map(workflowConfig.ui.layout.nodes.map((n: any) => [n.nodeId, { x: n.x, y: n.y }]))

              const nodesWithPositions = setup.nodes.map(node => {
                const savedPosition = layoutMap.get(node.id)
                if (savedPosition) {
                  return {
                    ...node,
                    position: savedPosition,
                  } as AppNode
                }
                return {
                  ...node,
                  position: { x: 0, y: 0 },
                } as AppNode
              })

              set({
                nodes: nodesWithPositions,
                edges: setup.edges,
                workflowLoading: false,
                currentWorkflowId: workflowVersionId,
              })
            } else {
              // Legacy workflow without layout - use auto-layout
              const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)

              set({
                nodes: layoutedNodes,
                edges: setup.edges,
                workflowLoading: false,
                currentWorkflowId: workflowVersionId,
              })
            }
          } catch (error) {
            logException(error, {
              location: "/store/app-store",
            })
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            set({
              workflowLoading: false,
              workflowError: errorMessage,
            })
          }
        },

        loadWorkflowFromData: async (workflowData: WorkflowConfig, workflowVersionId?: string) => {
          set({ workflowLoading: true, workflowError: undefined })

          try {
            console.log("🟢 loadWorkflowFromData: Received workflowData with ui:", workflowData.ui)
            // Get user preferences for model validation
            const userPreferences = useModelPreferencesStore.getState().preferences
            const setup = toFrontendWorkflowConfig(workflowData, userPreferences)

            // Check if workflow has saved layout positions
            if (workflowData.ui?.layout?.nodes && workflowData.ui.layout.nodes.length > 0) {
              console.log(
                "🟢 loadWorkflowFromData: Found saved layout with",
                workflowData.ui.layout.nodes.length,
                "nodes",
              )
              // Restore positions from saved layout
              const layoutMap = new Map(workflowData.ui.layout.nodes.map(n => [n.nodeId, { x: n.x, y: n.y }]))

              const nodesWithPositions = setup.nodes.map(node => {
                const savedPosition = layoutMap.get(node.id)
                if (savedPosition) {
                  console.log(`🟢 loadWorkflowFromData: Restoring position for ${node.id}:`, savedPosition)
                  return {
                    ...node,
                    position: savedPosition,
                  }
                }
                console.log(`⚠️ loadWorkflowFromData: No saved position for ${node.id}, using default (0, 0)`)
                return {
                  ...node,
                  position: { x: 0, y: 0 },
                }
              })

              console.log("🟢 loadWorkflowFromData: Restored positions for all nodes")
              set({
                nodes: nodesWithPositions,
                edges: setup.edges,
                workflowLoading: false,
                ...(workflowVersionId && { currentWorkflowId: workflowVersionId }),
              })
            } else {
              console.log("🟠 loadWorkflowFromData: No saved layout found, using auto-layout")
              // Legacy workflow without layout - use auto-layout
              const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)

              set({
                nodes: layoutedNodes,
                edges: setup.edges,
                workflowLoading: false,
                ...(workflowVersionId && { currentWorkflowId: workflowVersionId }),
              })
            }
          } catch (error) {
            logException(error, {
              location: "/store/app-store",
            })
            const errorMessage = error instanceof Error ? error.message : "Unknown error"
            set({
              workflowLoading: false,
              workflowError: errorMessage,
            })
          }
        },

        exportToJSON: () => {
          const { nodes, edges } = get()

          // Filter out start/end nodes and convert to WorkflowNodeConfig
          const workflowNodes = nodes
            .filter(node => node.id !== "start" && node.id !== "end")
            .map(node => {
              // Remove UI-only fields, keep all WorkflowNodeConfig fields
              const {
                label: _label,
                icon: _icon,
                status: _status,
                messageCount: _messageCount,
                nodeId: _nodeId,
                description,
                systemPrompt,
                gatewayModelId,
                mcpTools,
                codeTools,
                handOffs,
                memory,
                waitingFor,
                waitFor,
                handOffType,
                useClaudeSDK,
                sdkConfig,
                gateway,
              } = node.data

              return {
                nodeId: node.id, // Ensure nodeId matches the graph node id
                description,
                systemPrompt,
                gatewayModelId,
                mcpTools,
                codeTools,
                handOffs,
                gateway,
                ...(memory !== undefined && { memory }),
                ...(waitingFor !== undefined && { waitingFor }),
                ...(waitFor !== undefined && { waitFor }),
                ...(handOffType !== undefined && { handOffType }),
                ...(useClaudeSDK !== undefined && { useClaudeSDK }),
                ...(sdkConfig !== undefined && { sdkConfig }),
              }
            })

          // Find entry node (connected from start)
          const entryEdge = edges.find(edge => edge.source === "start")

          // Build handOffs from visual connections (simple approach)
          const workflowNodesWithConnections = workflowNodes.map(node => {
            const nodeEdges = edges.filter(edge => edge.source === node.nodeId)
            return {
              ...node,
              handOffs: nodeEdges.map(edge => edge.target),
            }
          })

          // Extract layout positions from ALL visual nodes (including start/end)
          const layoutNodes = nodes.map(node => ({
            nodeId: node.id,
            x: node.position.x,
            y: node.position.y,
          }))

          console.log("🔵 exportToJSON: Extracted layout positions for nodes:", layoutNodes)

          const workflow: WorkflowConfig = {
            nodes: workflowNodesWithConnections,
            entryNodeId: entryEdge?.target || "",
            ui: {
              layout: {
                nodes: layoutNodes,
              },
            },
          }

          console.log("🔵 exportToJSON: Created workflow with ui.layout:", workflow.ui)

          const jsonString = JSON.stringify(workflow, null, 2)

          // Auto-update the store's JSON state
          set({ workflowJSON: jsonString })

          return jsonString
        },

        updateWorkflowJSON: (json: string) => {
          set({ workflowJSON: json })
        },

        syncJSONToGraph: async () => {
          try {
            const workflowData = JSON.parse(get().workflowJSON)
            await get().loadWorkflowFromData(workflowData)
          } catch (error) {
            logException(error, {
              location: "/store/app-store",
            })
            console.error("Error syncing JSON to graph:", error)
          }
        },

        organizeLayout: async () => {
          const { nodes, edges } = get()
          const layoutedNodes = await layoutGraph(nodes, edges)
          set({ nodes: layoutedNodes })
        },

        openNodeDetails: nodeId => {
          set({ selectedNodeId: nodeId, nodeDetailsOpen: true })
        },

        closeNodeDetails: () => {
          set({ selectedNodeId: undefined, nodeDetailsOpen: false })
        },

        toggleDetailPanelExpanded: () => {
          set(state => ({ detailPanelExpanded: !state.detailPanelExpanded }))
        },

        updateNode: (nodeId, updates) => {
          const currentNodes = get().nodes
          const currentEdges = get().edges
          const targetNode = currentNodes.find(n => n.id === nodeId)
          if (!targetNode) return

          const requestedNewId = updates.nodeId?.trim()
          const isRename = !!requestedNewId && requestedNewId !== nodeId

          if (isRename) {
            // Prevent renaming special nodes
            if (targetNode.type === "initial-node" || targetNode.type === "output-node") {
              console.warn("Renaming is disabled for initial/output nodes")
            } else if (currentNodes.some(n => n.id === requestedNewId)) {
              console.error("Cannot rename: node ID already exists:", requestedNewId)
            } else {
              const newId = requestedNewId as string
              // Update nodes and edges to reflect new ID
              const nextNodes = currentNodes.map(n =>
                n.id === nodeId
                  ? {
                      ...n,
                      id: newId,
                      data: { ...n.data, ...updates, nodeId: newId },
                    }
                  : n,
              )
              const nextEdges = currentEdges.map(e => {
                const newSource = e.source === nodeId ? newId : e.source
                const newTarget = e.target === nodeId ? newId : e.target
                const newEdgeId = `${newSource}-${e.sourceHandle ?? ""}-${newTarget}-${e.targetHandle ?? ""}`
                return {
                  ...e,
                  id: newEdgeId,
                  source: newSource,
                  target: newTarget,
                }
              })

              set({
                nodes: nextNodes,
                edges: nextEdges,
                selectedNodeId: get().selectedNodeId === nodeId ? newId : get().selectedNodeId,
              })
            }
          } else {
            // Simple data update
            set({
              nodes: currentNodes.map(n => (n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n)),
            })
          }

          // Save to database in background if we have a workflow ID
          const workflowId = get().currentWorkflowId
          if (workflowId) {
            const workflowJSON = get().exportToJSON()
            const workflow = JSON.parse(workflowJSON)

            // Use API route instead of server action
            fetch("/api/workflow/save", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                dsl: workflow,
                commitMessage: isRename ? `Renamed node ${nodeId} -> ${updates.nodeId}` : `Updated node ${nodeId}`,
                workflowId,
                iterationBudget: 50,
                timeBudgetSeconds: 3600,
              }),
            }).catch(error => {
              logException(error, {
                location: "/store/app-store",
              })
              console.error("Failed to save node update:", error)
            })
          }
        },

        addChatMessage: (text, type) => {
          const newMessage = {
            id: `${Date.now()}-${Math.random()}`,
            text,
            timestamp: Date.now(),
            type,
          }
          set(state => ({ chatMessages: [...state.chatMessages, newMessage] }))
        },
        clearChatMessages: () => {
          set({ chatMessages: [] })
        },
        toggleLogPanel: () => {
          set(state => ({ logPanelOpen: !state.logPanelOpen }))
        },
        setLogPanelOpen: open => {
          set({ logPanelOpen: open })
        },
        addValidationError: error => {
          set(state => ({
            workflowValidationErrors: [...state.workflowValidationErrors, error],
            errorPanelOpen: true,
          }))
        },
        addValidationErrors: errors => {
          set(state => ({
            workflowValidationErrors: [...state.workflowValidationErrors, ...errors],
            ...(errors.length > 0 && { errorPanelOpen: true }),
          }))
        },
        clearValidationErrors: () => {
          set({ workflowValidationErrors: [] })
        },
        removeValidationError: errorId => {
          set(state => ({
            workflowValidationErrors: state.workflowValidationErrors.filter(e => e.id !== errorId),
          }))
        },
        toggleErrorPanel: () => {
          set(state => ({ errorPanelOpen: !state.errorPanelOpen }))
        },
        setErrorPanelOpen: open => {
          set({ errorPanelOpen: open })
        },
      })),
      {
        name: "workflow-editor-state",
        storage: createJSONStorage(() => localStorage),
        partialize: state => ({
          // Only persist the essential workflow data
          nodes: state.nodes,
          edges: state.edges,
          workflowJSON: state.workflowJSON,
          currentWorkflowId: state.currentWorkflowId,
          layout: state.layout,
          colorMode: state.colorMode,
          // Exclude chatMessages from persistence
        }),
        onRehydrateStorage: () => {
          console.log("💾 Zustand: Starting hydration from localStorage")
          return (state, error) => {
            if (error) {
              console.error("💾 Zustand: Hydration failed:", error)
            } else {
              console.log("💾 Zustand: Hydration complete, nodes:", state?.nodes?.length || 0)
              // Mark as hydrated
              if (state) {
                state._hasHydrated = true
              }
            }
          }
        },
      },
    ),
  )

  store.subscribe(
    state => state.colorMode,
    async (colorMode: ColorMode) => {
      document.querySelector("html")?.classList.toggle("dark", colorMode === "dark")

      await setColorModeCookie(colorMode)
    },
  )

  return store
}
