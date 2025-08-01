import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ColorMode,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  XYPosition,
} from "@xyflow/react"
import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

import { setColorModeCookie } from "@/react-flow-visualization/components/actions/cookies"
import {
  createEdge,
  type AppEdge,
} from "@/react-flow-visualization/components/edges"
import nodesConfig, {
  createNodeByType,
  type AppNode,
  type AppNodeType,
  type WorkflowNodeData,
} from "@/react-flow-visualization/components/nodes"
import { initialSetupConfig } from "@/react-flow-visualization/lib/workflow-data"
import { layoutGraph } from "./layout"
import type { WorkflowConfig } from "@/core/workflow/schema/workflow.types"
import { saveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"

export type AppState = {
  nodes: AppNode[]
  edges: AppEdge[]
  colorMode: ColorMode
  layout: "fixed" | "free"
  draggedNodes: Map<string, AppNode>
  connectionSites: Map<string, PotentialConnection>
  potentialConnection?: PotentialConnection
  workflowLoading: boolean
  workflowError?: string
  selectedNodeId?: string
  nodeDetailsOpen: boolean
  // JSON editor state
  workflowJSON: string
  currentWorkflowId?: string
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
    options?: { exclude?: string[]; type?: "source" | "target" }
  ) => void
  resetPotentialConnection: () => void
  loadWorkflowConfig: (mode?: "cultural" | "genetic") => Promise<void>
  loadWorkflowVersion: (workflowVersionId: string) => Promise<void>
  loadWorkflowFromData: (workflowData: any) => Promise<void>
  exportToJSON: () => string
  updateWorkflowJSON: (json: string) => void
  syncJSONToGraph: () => Promise<void>
  organizeLayout: () => Promise<void>

  openNodeDetails: (nodeId: string) => void
  closeNodeDetails: () => void
  updateNode: (nodeId: string, updates: Partial<WorkflowNodeData>) => void
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
  workflowLoading: false,
  workflowError: undefined,
  selectedNodeId: undefined,
  nodeDetailsOpen: false,
  workflowJSON: JSON.stringify({ nodes: [], entryNodeId: "" }, null, 2),
  currentWorkflowId: undefined,
}

export const createAppStore = (initialState: AppState = defaultState) => {
  const store = create<AppStore>()(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      onNodesChange: async (changes) => {
        const nextNodes = applyNodeChanges(changes, get().nodes)
        set({ nodes: nextNodes })

        if (
          get().layout === "fixed" &&
          changes.some((change) => change.type === "dimensions")
        ) {
          const layoutedNodes = await layoutGraph(nextNodes, get().edges)
          set({ nodes: layoutedNodes })
        } else {
          set({ nodes: nextNodes })
        }
      },

      setNodes: (nodes) => set({ nodes }),

      addNode: (node) => {
        const nextNodes = [...get().nodes, node]
        set({ nodes: nextNodes })
      },

      removeNode: (nodeId) => {
        // Remove the node
        const filteredNodes = get().nodes.filter((node) => node.id !== nodeId)
        // Remove all edges connected to this node
        const filteredEdges = get().edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        )
        set({ nodes: filteredNodes, edges: filteredEdges })
      },

      addNodeByType: (type, position) => {
        const newNode = createNodeByType({ type, position })

        if (!newNode) return null

        get().addNode(newNode)

        return newNode.id
      },

      getNodes: () => get().nodes,

      addNodeInBetween: ({
        source,
        target,
        type,
        sourceHandleId,
        targetHandleId,
        position,
      }) => {
        const newNodeId = get().addNodeByType(type, position)
        if (!newNodeId) return

        get().removeEdge(
          `${source}-${sourceHandleId}-${target}-${targetHandleId}`
        )

        const nodeHandles = nodesConfig[type].handles
        const nodeSource = nodeHandles.find(
          (handle) => handle.type === "source"
        )
        const nodeTarget = nodeHandles.find(
          (handle) => handle.type === "target"
        )

        const edges = []
        if (nodeTarget && source) {
          edges.push(
            createEdge(source, newNodeId, sourceHandleId, nodeTarget.id)
          )
        }

        if (nodeSource && target) {
          edges.push(
            createEdge(newNodeId, target, nodeSource.id, targetHandleId)
          )
        }

        const nextEdges = [...get().edges, ...edges]
        set({ edges: nextEdges })
      },

      setEdges: (edges) => set({ edges }),

      getEdges: () => get().edges,

      addEdge: (edge) => {
        const nextEdges = addEdge(edge, get().edges)
        set({ edges: nextEdges })
      },

      removeEdge: (edgeId) => {
        set({ edges: get().edges.filter((edge) => edge.id !== edgeId) })
      },

      onEdgesChange: (changes) => {
        const nextEdges = applyEdgeChanges(changes, get().edges)
        set({ edges: nextEdges })
      },

      onConnect: (connection) => {
        const newEdge: AppEdge = {
          ...connection,
          type: "workflow",
          id: `${connection.source}-${connection.target}`,
          animated: true,
        }

        get().addEdge(newEdge)
      },

      toggleDarkMode: () =>
        set((state) => ({
          colorMode: state.colorMode === "dark" ? "light" : "dark",
        })),

      toggleLayout: () =>
        set((state) => ({
          layout: state.layout === "fixed" ? "free" : "fixed",
        })),

      checkForPotentialConnection: (position, options) => {
        const closest: {
          distance: number
          potentialConnection?: PotentialConnection
        } = {
          distance: Infinity,
          potentialConnection: undefined,
        }

        for (const connectionSite of get().connectionSites.values()) {
          if (options?.exclude?.includes(connectionSite.id)) {
            continue
          }

          if (
            options?.type &&
            options.type &&
            options.type === connectionSite.type
          ) {
            continue
          }

          const distance = Math.hypot(
            connectionSite.position.x - position.x,
            connectionSite.position.y - position.y
          )

          if (distance < closest.distance) {
            closest.distance = distance
            closest.potentialConnection = connectionSite
          }
        }

        set({
          potentialConnection:
            closest.distance < 150 ? closest.potentialConnection : undefined,
        })
      },

      resetPotentialConnection: () => {
        set({ potentialConnection: undefined })
      },

      onNodeDragStart: (_, __, nodes) => {
        set({ draggedNodes: new Map(nodes.map((node) => [node.id, node])) })
      },
      onNodeDragStop: () => {
        set({ draggedNodes: new Map() })
        set({ potentialConnection: undefined })
      },

      loadWorkflowConfig: async (mode = "cultural") => {
        set({ workflowLoading: true, workflowError: undefined })

        try {
          const response = await fetch(`/api/workflow/config?mode=${mode}`)

          if (!response.ok) {
            throw new Error(
              `Failed to load workflow config: ${response.statusText}`
            )
          }

          const workflowConfig = await response.json()

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

          const setup = initialSetupConfig(workflowConfig)

          // apply layout to position nodes properly
          const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)

          set({
            nodes: layoutedNodes,
            edges: setup.edges,
            workflowLoading: false,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error"
          set({
            workflowLoading: false,
            workflowError: errorMessage,
          })
        }
      },

      loadWorkflowVersion: async (workflowVersionId: string) => {
        set({ workflowLoading: true, workflowError: undefined })

        try {
          const response = await fetch(
            `/api/workflow/version/${workflowVersionId}`
          )

          if (!response.ok) {
            throw new Error(
              `Failed to load workflow version: ${response.statusText}`
            )
          }

          const workflowConfig = await response.json()
          const setup = initialSetupConfig(workflowConfig)

          // apply layout to position nodes properly
          const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)

          set({
            nodes: layoutedNodes,
            edges: setup.edges,
            workflowLoading: false,
            currentWorkflowId: workflowVersionId, // Set workflow ID for saving
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error"
          set({
            workflowLoading: false,
            workflowError: errorMessage,
          })
        }
      },

      loadWorkflowFromData: async (workflowData: any) => {
        set({ workflowLoading: true, workflowError: undefined })

        try {
          const setup = initialSetupConfig(workflowData)

          // apply layout to position nodes properly
          const layoutedNodes = await layoutGraph(setup.nodes, setup.edges)

          set({
            nodes: layoutedNodes,
            edges: setup.edges,
            workflowLoading: false,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error"
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
          .filter((node) => node.id !== "start" && node.id !== "end")
          .map((node) => {
            const { title, label, icon, status, messageCount, ...coreData } =
              node.data
            return {
              ...coreData,
              nodeId: node.id, // Ensure nodeId matches the graph node id
            }
          })

        // Find entry node (connected from start)
        const entryEdge = edges.find((edge) => edge.source === "start")

        // Build handOffs from visual connections (simple approach)
        const workflowNodesWithConnections = workflowNodes.map((node) => {
          const nodeEdges = edges.filter((edge) => edge.source === node.nodeId)
          return {
            ...node,
            handOffs: nodeEdges.map((edge) => edge.target),
          }
        })

        const workflow: WorkflowConfig = {
          nodes: workflowNodesWithConnections,
          entryNodeId: entryEdge?.target || "",
        }

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
          console.error("Error syncing JSON to graph:", error)
        }
      },

      organizeLayout: async () => {
        const { nodes, edges } = get()
        const layoutedNodes = await layoutGraph(nodes, edges)
        set({ nodes: layoutedNodes })
      },

      openNodeDetails: (nodeId) => {
        set({ selectedNodeId: nodeId, nodeDetailsOpen: true })
      },

      closeNodeDetails: () => {
        set({ selectedNodeId: undefined, nodeDetailsOpen: false })
      },

      updateNode: (nodeId, updates) => {
        // Update in-memory state
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          ),
        })

        // Save to database in background if we have a workflow ID
        const workflowId = get().currentWorkflowId
        if (workflowId) {
          const workflowJSON = get().exportToJSON()
          const workflow = JSON.parse(workflowJSON)

          saveWorkflowVersion({
            dsl: workflow,
            commitMessage: `Updated node ${nodeId}`,
            workflowId,
            iterationBudget: 50,
            timeBudgetSeconds: 3600,
          }).catch((error) => {
            console.error("Failed to save node update:", error)
          })
        }
      },
    }))
  )

  store.subscribe(
    (state) => state.colorMode,
    async (colorMode: ColorMode) => {
      document
        .querySelector("html")
        ?.classList.toggle("dark", colorMode === "dark")

      await setColorModeCookie(colorMode)
    }
  )

  return store
}
