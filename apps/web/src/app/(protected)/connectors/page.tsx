"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useConnectorsUIStore } from "@/stores/connectors-ui-store"
import {
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Github,
  Lock,
  Package,
  Power,
  Search,
  Settings,
  Shield,
  X,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { MCPServersConfig } from "./mcp-servers"
import { type Connector, mockConnectors } from "./mock-data"

export default function ConnectorsPage() {
  const activeTab = useConnectorsUIStore(state => state.activeTab)
  const setActiveTab = useConnectorsUIStore(state => state.setActiveTab)
  const searchQuery = useConnectorsUIStore(state => state.searchQuery)
  const setSearchQuery = useConnectorsUIStore(state => state.setSearchQuery)

  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null)
  const [configuring, setConfiguring] = useState(false)
  const [connectors, setConnectors] = useState(mockConnectors)

  const installedConnectors = connectors.filter(c => c.status === "installed")

  const handleToggleEnabled = (connId: string) => {
    setConnectors(prev => prev.map(c => (c.conn_id === connId ? { ...c, enabled: !c.enabled } : c)))
  }

  // TODO: Replace with LLM-powered search API
  // The search should use an LLM to understand natural language queries like:
  // - "email tool" → matches Gmail, Outlook, etc.
  // - "send messages" → matches Slack, Discord, etc.
  // - "database" → matches PostgreSQL, MySQL, etc.
  // This will provide intelligent, semantic search for connectors
  const filteredMarketplace = connectors.filter(
    c =>
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.short_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const filteredInstalled = installedConnectors.filter(
    c =>
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.short_description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Coming Soon UI
  return (
    <div className="flex h-full bg-background relative">
      {/* Blurred Background Content */}
      <div className="flex h-full w-full blur-[8px] pointer-events-none">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with Search */}
          <div className="border-b border-border px-8 py-8 bg-gradient-to-b from-background to-muted/20">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl font-semibold text-foreground mb-3">What do you want to connect?</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Search by name, capability, or describe what you want to do
              </p>

              {/* Large Search Bar */}
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder='Try "email tool", "send messages", "database", or "GitHub"...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-border bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all shadow-sm hover:shadow-md"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex-1 flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={tab => setActiveTab(tab as "marketplace" | "my-connectors" | "mcp-servers")}
              className="flex-1 flex flex-col"
            >
              <div className="border-b border-border px-8">
                <TabsList className="bg-transparent border-0 p-0 h-auto">
                  <TabsTrigger
                    value="marketplace"
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all",
                      "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground",
                      "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Marketplace
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-connectors"
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all",
                      "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground",
                      "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    My Connectors
                    {installedConnectors.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {installedConnectors.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="mcp-servers"
                    className={cn(
                      "rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all",
                      "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground",
                      "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    MCP Servers
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Marketplace Tab */}
              <TabsContent value="marketplace" className="flex-1 m-0 p-8 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMarketplace.map(connector => (
                    <ConnectorCard
                      key={connector.conn_id}
                      connector={connector}
                      onClick={() => setSelectedConnector(connector)}
                    />
                  ))}
                </div>
                {filteredMarketplace.length === 0 && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Package className="size-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No connectors found</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* My Connectors Tab */}
              <TabsContent value="my-connectors" className="flex-1 m-0 p-8 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInstalled.map(connector => (
                    <InstalledConnectorCard
                      key={connector.conn_id}
                      connector={connector}
                      onToggleEnabled={() => handleToggleEnabled(connector.conn_id)}
                      onClick={() => {
                        setSelectedConnector(connector)
                        setConfiguring(true)
                      }}
                    />
                  ))}
                </div>
                {filteredInstalled.length === 0 && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Package className="size-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "No installed connectors found" : "No connectors installed yet"}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => setActiveTab("marketplace")}
                          variant="outline"
                          className="mt-4"
                          size="sm"
                        >
                          Browse Marketplace
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* MCP Servers Tab */}
              <TabsContent value="mcp-servers" className="flex-1 m-0 p-8 overflow-auto">
                <MCPServersConfig />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Connector Detail Modal */}
        {selectedConnector && (
          <ConnectorDetailModal
            connector={selectedConnector}
            configuring={configuring}
            onToggleEnabled={() => handleToggleEnabled(selectedConnector.conn_id)}
            onClose={() => {
              setSelectedConnector(null)
              setConfiguring(false)
            }}
          />
        )}
      </div>

      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center max-w-md px-6 pointer-events-auto">
          <div className="size-20 rounded-2xl bg-background/95 backdrop-blur-sm border border-border flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock className="size-10 text-muted-foreground" />
          </div>
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-foreground mb-3">Coming Soon</h2>
            <p className="text-muted-foreground mb-6">
              Connectors are currently under development. This feature will be available soon.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium">
              <Lock className="size-4" />
              Feature in Development
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConnectorCard({
  connector,
  onClick,
}: {
  connector: Connector
  onClick: () => void
}) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={onClick}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          {connector.logo_url ? (
            <Image
              src={connector.logo_url}
              alt={connector.display_name}
              width={48}
              height={48}
              className="size-12 rounded-lg object-contain flex-shrink-0"
            />
          ) : (
            <div className="size-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Package className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{connector.display_name}</h3>
              {connector.publisher.verified && (
                <span title="Verified Publisher">
                  <Shield className="size-4 text-primary flex-shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{connector.publisher.display_name}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{connector.short_description}</p>

        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {connector.tags.slice(0, 2).map(tag => (
            <Badge key={tag.tag_id} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {connector.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{connector.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <span className="text-xs text-muted-foreground">{connector.tools.length} tools</span>
          {connector.status === "installed" ? (
            <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20">
              <CheckCircle2 className="size-3 mr-1" />
              Installed
            </Badge>
          ) : (
            <Button size="sm" variant="ghost" className="group-hover:text-primary">
              View Details
              <ChevronRight className="size-4 ml-1 transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

function InstalledConnectorCard({
  connector,
  onClick,
  onToggleEnabled,
}: {
  connector: Connector
  onClick: () => void
  onToggleEnabled: () => void
}) {
  const isEnabled = connector.enabled !== false

  return (
    <Card
      className={cn(
        "group transition-all hover:shadow-md",
        isEnabled ? "hover:border-primary/50" : "opacity-60 hover:border-muted-foreground/30",
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 cursor-pointer" onClick={onClick}>
            {connector.logo_url ? (
              <Image
                src={connector.logo_url}
                alt={connector.display_name}
                width={48}
                height={48}
                className="size-12 rounded-lg object-contain flex-shrink-0"
              />
            ) : (
              <div className="size-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{connector.display_name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{connector.tools.length} tools available</p>
            </div>
          </div>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onToggleEnabled()
            }}
            className={cn(
              "size-8 rounded-md flex items-center justify-center transition-colors flex-shrink-0",
              isEnabled
                ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted-foreground/10",
            )}
            title={isEnabled ? "Disable connector" : "Enable connector"}
          >
            <Power className="size-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{connector.short_description}</p>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-2 rounded-full flex-shrink-0",
                connector.health === "healthy" && "bg-green-500",
                connector.health === "warning" && "bg-yellow-500",
                connector.health === "error" && "bg-red-500",
              )}
              title={connector.health}
            />
            <span className="text-xs text-muted-foreground capitalize">
              {isEnabled ? connector.health : "Disabled"}
            </span>
          </div>
          <Button size="sm" variant="ghost" className="group-hover:text-primary" onClick={onClick}>
            <Settings className="size-4 mr-1" />
            Configure
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ConnectorDetailModal({
  connector,
  configuring,
  onToggleEnabled,
  onClose,
}: {
  connector: Connector
  configuring: boolean
  onToggleEnabled: () => void
  onClose: () => void
}) {
  const [activeSection, setActiveSection] = useState(configuring ? "config" : "overview")
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)

  const isMountedRef = useRef(true)
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([])

  const isInstalled = connector.status === "installed"
  const isEnabled = connector.enabled !== false

  // Cleanup timeouts on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Clear all pending timeouts to prevent state updates on unmounted component
      timeoutIdsRef.current.forEach(id => clearTimeout(id))
      timeoutIdsRef.current = []
    }
  }, [])

  const handleTest = async () => {
    setIsSaving(true)
    setTestResult(null)

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        setTestResult("success")
        setIsSaving(false)
      }
    }, 1500)

    timeoutIdsRef.current.push(timeoutId)
  }

  const handleSave = async () => {
    setIsSaving(true)

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        setIsSaving(false)
        onClose()
      }
    }, 1000)

    timeoutIdsRef.current.push(timeoutId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-start gap-4 flex-1">
            {connector.logo_url ? (
              <Image
                src={connector.logo_url}
                alt={connector.display_name}
                width={64}
                height={64}
                className="size-16 rounded-lg object-contain flex-shrink-0"
              />
            ) : (
              <div className="size-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="size-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{connector.display_name}</h2>
                {connector.publisher.verified && (
                  <span title="Verified Publisher">
                    <Shield className="size-5 text-primary" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">by {connector.publisher.display_name}</p>
              <div className="flex items-center gap-3 mt-2">
                {connector.homepage_url && (
                  <a
                    href={connector.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Website
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {connector.repo_url && (
                  <a
                    href={connector.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Github className="size-3" />
                    Repository
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeSection === "overview"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("tools")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeSection === "tools"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Tools ({connector.tools.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("config")}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeSection === "config"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Configuration
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {connector.long_description || connector.short_description}
                </p>
              </div>

              {connector.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Tags</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {connector.tags.map(tag => (
                      <Badge key={tag.tag_id} variant="secondary">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {isInstalled && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Status</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-2 rounded-full",
                          connector.health === "healthy" && "bg-green-500",
                          connector.health === "warning" && "bg-yellow-500",
                          connector.health === "error" && "bg-red-500",
                        )}
                      />
                      <span className="text-sm text-muted-foreground capitalize">
                        {isEnabled ? connector.health : "Disabled"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleEnabled}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                        isEnabled
                          ? "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                          : "bg-muted text-muted-foreground hover:bg-muted-foreground/10",
                      )}
                    >
                      <Power className="size-3" />
                      {isEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === "tools" && (
            <div className="space-y-3">
              {connector.tools.map(tool => (
                <Card key={tool.tool_id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-foreground">{tool.name}</code>
                        {tool.status === "approved" ? (
                          <Badge className="text-xs bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                            <CheckCircle2 className="size-3 mr-1" />
                            Verified
                          </Badge>
                        ) : tool.status === "pending" ? (
                          <Badge variant="secondary" className="text-xs">
                            Pending Review
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Rejected
                          </Badge>
                        )}
                      </div>
                      {tool.description && <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeSection === "config" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-4">Credentials</h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm text-muted-foreground mb-2 block">API Key</span>
                    <div className="relative">
                      <input
                        type={showCredentials.apiKey ? "text" : "password"}
                        placeholder="Enter your API key"
                        value={credentials.apiKey || ""}
                        onChange={e =>
                          setCredentials({
                            ...credentials,
                            apiKey: e.target.value,
                          })
                        }
                        autoComplete="off"
                        className="w-full px-3 py-2 pr-10 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCredentials({
                            ...showCredentials,
                            apiKey: !showCredentials.apiKey,
                          })
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        {showCredentials.apiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-sm text-muted-foreground mb-2 block">API Secret (optional)</span>
                    <div className="relative">
                      <input
                        type={showCredentials.apiSecret ? "text" : "password"}
                        placeholder="Enter your API secret"
                        value={credentials.apiSecret || ""}
                        onChange={e =>
                          setCredentials({
                            ...credentials,
                            apiSecret: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 pr-10 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCredentials({
                            ...showCredentials,
                            apiSecret: !showCredentials.apiSecret,
                          })
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        {showCredentials.apiSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </label>
                </div>
              </div>

              {testResult && (
                <div
                  className={cn(
                    "p-4 rounded-lg flex items-center gap-2",
                    testResult === "success" && "bg-green-500/10 text-green-700",
                    testResult === "error" && "bg-red-500/10 text-red-700",
                  )}
                >
                  {testResult === "success" ? (
                    <>
                      <Check className="size-4" />
                      <span className="text-sm font-medium">Connection successful!</span>
                    </>
                  ) : (
                    <>
                      <X className="size-4" />
                      <span className="text-sm font-medium">Connection failed. Please check your credentials.</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleTest} variant="outline" disabled={isSaving} size="sm">
                  {isSaving ? "Testing..." : "Test Connection"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex items-center justify-end gap-3">
          <Button onClick={onClose} variant="outline" size="sm">
            Cancel
          </Button>
          {!isInstalled ? (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? "Installing..." : "Install Connector"}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
