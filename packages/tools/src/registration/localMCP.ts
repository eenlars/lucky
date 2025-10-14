import { type CodeToolDefinition, type CodeToolGroups, createToolGroup } from "./codeToolsRegistration"

type TransportCommon = {
  type: string
}

export type LocalMCPTransportStdio = TransportCommon & {
  type: "stdio"
  command: string
  args?: string[]
  env?: Record<string, string>
}

export type LocalMCPTransportOAuth = TransportCommon & {
  type: "oauth"
  provider: string
  token: string
  scopes?: string[]
}

export type LocalMCPTransport = LocalMCPTransportStdio | LocalMCPTransportOAuth

export type LocalMCPTool = {
  name: string
  description: string
  definition: CodeToolDefinition["toolFunc"]
  env?: Record<string, string>
}

export type LocalMCPServer = {
  id: string
  label: string
  description: string
  transport: LocalMCPTransport
  env?: Record<string, string>
  tools: LocalMCPTool[]
}

type Snapshot = {
  codeToolGroups: CodeToolGroups
  servers: Record<string, LocalMCPServer>
  toolToServer: Record<string, string>
}

type LocalMCPRegistryConfig = {
  servers: LocalMCPServer[]
}

type LocalMCPRegistryOptions = {
  validate?: boolean
}

const isTransport = (value: LocalMCPTransport): boolean => {
  if (!value || typeof value !== "object") return false
  if (value.type === "stdio") {
    return typeof value.command === "string" && value.command.length > 0
  }
  if (value.type === "oauth") {
    return typeof value.provider === "string" && typeof value.token === "string"
  }
  return false
}

export class LocalMCPRegistry {
  private snapshot: Snapshot | null = null

  constructor(
    private readonly config: LocalMCPRegistryConfig,
    private readonly options: LocalMCPRegistryOptions = {},
  ) {
    if (this.options.validate !== false) {
      this.validateConfig()
    }
  }

  private validateConfig(): void {
    if (!Array.isArray(this.config.servers) || this.config.servers.length === 0) {
      throw new Error("LocalMCPRegistry requires at least one server")
    }

    const ids = new Set<string>()
    const toolNames = new Set<string>()

    for (const server of this.config.servers) {
      if (!server.id || server.id.trim().length === 0) {
        throw new Error("Each server needs a non-empty id")
      }

      if (ids.has(server.id)) {
        throw new Error(`Duplicate server id: ${server.id}`)
      }
      ids.add(server.id)

      if (!server.label || server.label.trim().length === 0) {
        throw new Error(`Server ${server.id} missing label`)
      }

      if (!server.description || server.description.trim().length === 0) {
        throw new Error(`Server ${server.id} missing description`)
      }

      if (!isTransport(server.transport)) {
        throw new Error(`Server ${server.id} has invalid transport configuration`)
      }

      if (!Array.isArray(server.tools) || server.tools.length === 0) {
        throw new Error(`Server ${server.id} needs at least one tool`)
      }

      for (const tool of server.tools) {
        if (!tool.name || tool.name.trim().length === 0) {
          throw new Error(`Server ${server.id} has a tool with missing name`)
        }

        if (toolNames.has(tool.name)) {
          throw new Error(`Duplicate tool name across servers: ${tool.name}`)
        }
        toolNames.add(tool.name)

        if (!tool.description || tool.description.trim().length === 0) {
          throw new Error(`Tool ${tool.name} missing description`)
        }

        if (typeof tool.definition !== "function" && typeof tool.definition !== "object") {
          throw new Error(`Tool ${tool.name} in server ${server.id} has an invalid definition`)
        }
      }
    }
  }

  private ensureSnapshot(): Snapshot {
    if (this.snapshot) {
      return this.snapshot
    }

    const servers: Record<string, LocalMCPServer> = {}
    const toolToServer: Record<string, string> = {}

    const groups = this.config.servers.map(server => {
      servers[server.id] = server

      const toolDefinitions = server.tools.map<CodeToolDefinition>(tool => {
        toolToServer[tool.name] = server.id
        return {
          toolName: tool.name,
          toolFunc: tool.definition,
          description: tool.description,
        }
      })

      return createToolGroup(server.id, `${server.label}: ${server.description}`, toolDefinitions)
    })

    this.snapshot = {
      codeToolGroups: { groups },
      servers,
      toolToServer,
    }

    return this.snapshot
  }

  get codeToolGroups(): CodeToolGroups {
    return this.ensureSnapshot().codeToolGroups
  }

  getServer(toolName: string): LocalMCPServer | null {
    const snapshot = this.ensureSnapshot()
    const serverId = snapshot.toolToServer[toolName]
    if (!serverId) return null
    return snapshot.servers[serverId] ?? null
  }

  listServers(): LocalMCPServer[] {
    return Object.values(this.ensureSnapshot().servers)
  }
}

export type { LocalMCPRegistryConfig, LocalMCPRegistryOptions, Snapshot as LocalMCPRegistrySnapshot }
