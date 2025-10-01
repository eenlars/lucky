"use client"

import { useState } from "react"
import {
  Play,
  Copy,
  Check,
  Terminal,
  Braces,
  ArrowRight,
  Mail,
  Github,
  Database,
  Search,
  HardDrive,
} from "lucide-react"
import { Button } from "@/ui/button"
import { cn } from "@/lib/utils"

interface MCPTool {
  id: string
  name: string
  icon: React.ReactNode
  active: boolean
  schema: object
  example: object
}

const tools: MCPTool[] = [
  {
    id: "gmail",
    name: "Gmail",
    icon: <Mail className="size-4" />,
    active: true,
    schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "send", "search"] },
        query: { type: "string" },
        to: { type: "string", format: "email" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["action"],
    },
    example: {
      action: "search",
      query: "from:important@example.com",
    },
  },
  {
    id: "github",
    name: "GitHub",
    icon: <Github className="size-4" />,
    active: false,
    schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list_repos", "create_issue", "get_pr"] },
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
      },
      required: ["action"],
    },
    example: {
      action: "list_repos",
      owner: "vercel",
    },
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    icon: <Database className="size-4" />,
    active: true,
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        params: { type: "array" },
      },
      required: ["query"],
    },
    example: {
      query: "SELECT * FROM users LIMIT 10",
    },
  },
  {
    id: "search",
    name: "Web Search",
    icon: <Search className="size-4" />,
    active: false,
    schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
    example: {
      query: "latest AI developments",
      limit: 5,
    },
  },
  {
    id: "filesystem",
    name: "Filesystem",
    icon: <HardDrive className="size-4" />,
    active: true,
    schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["read", "write", "list"] },
        path: { type: "string" },
      },
      required: ["action", "path"],
    },
    example: {
      action: "list",
      path: "/workspace",
    },
  },
]

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState<MCPTool>(tools[0])
  const [input, setInput] = useState(JSON.stringify(tools[0].example, null, 2))
  const [output, setOutput] = useState("")
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [outputCopied, setOutputCopied] = useState(false)

  const handleRun = async () => {
    setIsRunning(true)
    setOutput("")

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    const mockOutput = {
      success: true,
      data:
        selectedTool.id === "gmail"
          ? [
              {
                id: "msg_001",
                from: "important@example.com",
                subject: "Q4 Planning Review",
                preview: "Hi team, attached is the Q4 planning doc...",
              },
              {
                id: "msg_002",
                from: "important@example.com",
                subject: "Budget Approval Needed",
                preview: "Please review and approve the attached budget...",
              },
            ]
          : selectedTool.id === "postgres"
            ? {
                rows: [
                  { id: 1, name: "Alice Johnson", email: "alice@example.com" },
                  { id: 2, name: "Bob Smith", email: "bob@example.com" },
                ],
                rowCount: 2,
              }
            : {
                result: "Operation completed successfully",
              },
      timestamp: new Date().toISOString(),
      duration: "1.2s",
    }

    setOutput(JSON.stringify(mockOutput, null, 2))
    setIsRunning(false)
  }

  const handleCopy = (text: string, setCopiedState: (val: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopiedState(true)
    setTimeout(() => setCopiedState(false), 2000)
  }

  const handleToolSelect = (tool: MCPTool) => {
    setSelectedTool(tool)
    setInput(JSON.stringify(tool.example, null, 2))
    setOutput("")
  }

  const isValidJSON = (str: string) => {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-sidebar/30">
        <div className="p-6 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">MCP Tools</h1>
          <p className="text-xs text-muted-foreground mt-1">Test your connections</p>
        </div>

        <div className="p-3">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer",
                selectedTool.id === tool.id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar/50",
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-md",
                  selectedTool.id === tool.id ? "bg-primary/10 text-primary" : "bg-muted/50",
                )}
              >
                {tool.icon}
              </div>
              <span className="font-medium">{tool.name}</span>
              {tool.active && <div className="ml-auto size-2 rounded-full bg-green-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">{selectedTool.icon}</div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selectedTool.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedTool.active ? "Connected" : "Disconnected"}</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-2 gap-px bg-border overflow-hidden">
          {/* Input Panel */}
          <div className="bg-background flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Braces className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Input</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInput(JSON.stringify(selectedTool.example, null, 2))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Load Example
                </button>
                <button
                  onClick={() => handleCopy(input, setCopied)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex-1 p-6">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                className={cn(
                  "w-full h-full font-mono text-sm bg-transparent resize-none outline-none",
                  !isValidJSON(input) && input.length > 0 && "text-destructive",
                )}
                placeholder="Enter JSON input..."
                spellCheck={false}
              />
            </div>

            <div className="px-6 py-4 border-t border-border">
              <Button onClick={handleRun} disabled={!isValidJSON(input) || isRunning} className="w-full">
                {isRunning ? (
                  <>
                    <div className="size-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Run Test
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-background flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Output</span>
              </div>
              {output && (
                <button
                  onClick={() => handleCopy(output, setOutputCopied)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {outputCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {outputCopied ? "Copied" : "Copy"}
                </button>
              )}
            </div>

            <div className="flex-1 p-6 overflow-auto">
              {output ? (
                <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">{output}</pre>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="size-12 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <ArrowRight className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Run a test to see output</p>
                  </div>
                </div>
              )}
            </div>

            {/* Schema Preview */}
            <div className="px-6 py-4 border-t border-border bg-muted/10">
              <details className="group">
                <summary className="text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  View Schema
                </summary>
                <pre className="mt-3 text-xs font-mono text-muted-foreground overflow-auto">
                  {JSON.stringify(selectedTool.schema, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
