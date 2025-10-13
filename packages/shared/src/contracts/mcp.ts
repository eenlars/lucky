import { z } from "zod"

// Publisher/Organization schema
export const publisherSchema = z.object({
  pub_id: z.string().optional(), // Auto-generated (not always UUID in mock)
  slug: z.string().min(1).max(100),
  display_name: z.string().min(1).max(255),
  verified: z.boolean().default(false),
  website_url: z.string().url().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
})

// Tag schema
export const tagSchema = z.object({
  tag_id: z.string().optional(), // Auto-generated (not always UUID in mock)
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
})

// Tool schema (matches mcp.tools table + UI fields)
export const toolSchema = z.object({
  tool_id: z.string().optional(), // Auto-generated (not always UUID in mock)
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  display_title: z.string().nullable().optional(),
  input_schema_json: z.any(), // JSON schema for tool input
  output_schema_json: z.any().nullable().optional(),
  active: z.boolean().default(true).optional(),
  discovered_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  annotations_json: z.any().nullable().optional(),
  traits_json: z.any().default({}),
  // UI-specific field
  status: z.enum(["pending", "approved", "rejected"]).optional(),
})

// Server/Connector schema (matches mcp.servers table)
export const serverSchema = z.object({
  server_id: z.string().optional(), // Auto-generated (not always UUID in mock)
  publisher_org_id: z.string(),
  slug: z.string().min(1).max(100),
  display_name: z.string().min(1).max(255),
  short_description: z.string().min(1).max(500),
  long_description: z.string().nullable().optional(),
  homepage_url: z.string().url().nullable().optional(),
  repo_url: z.string().url().nullable().optional(),
  logo_url: z.string().nullable().optional(), // Not always a valid URL (can be relative path)
  visibility: z.enum(["public", "private"]).default("public"),
  created_at: z.string().optional(),
  search_text: z.string().nullable().optional(),
})

// Server version schema (matches mcp.server_versions table)
export const serverVersionSchema = z.object({
  sver_id: z.string().uuid().optional(), // Auto-generated
  server_id: z.string().uuid(),
  version: z.string().min(1).max(50),
  manifest_hash: z.string(),
  mcp_spec_version: z.string().default("1.0.0"),
  capabilities_json: z.any().default({}),
  status: z.enum(["draft", "published", "deprecated"]).default("draft"),
  listed: z.boolean().default(false),
  release_notes: z.string().nullable().optional(),
  source_ref: z.string().nullable().optional(),
  tools_list_changed: z.boolean().nullable().optional(),
  prompts_list_changed: z.boolean().nullable().optional(),
  resources_list_changed: z.boolean().nullable().optional(),
  resources_subscribe: z.boolean().nullable().optional(),
  created_at: z.string().datetime().optional(),
})

// Combined connector schema for UI (includes relations)
export const connectorSchema = z.object({
  conn_id: z.string(), // Can be server_id
  pub_id: z.string(),
  slug: z.string(),
  display_name: z.string(),
  short_description: z.string(),
  long_description: z.string().optional(),
  homepage_url: z.string().optional(),
  repo_url: z.string().optional(),
  logo_url: z.string().optional(),
  visibility: z.enum(["public", "private"]),
  tags: z.array(tagSchema),
  tools: z.array(toolSchema),
  publisher: publisherSchema,
  status: z.enum(["installed", "available"]).optional(),
  health: z.enum(["healthy", "warning", "error"]).optional(),
  enabled: z.boolean().optional(),
})

// For creating/updating
export const createServerSchema = serverSchema.omit({
  server_id: true,
  created_at: true,
})

export const createToolSchema = toolSchema.omit({
  tool_id: true,
  created_at: true,
  updated_at: true,
  discovered_at: true,
})

export const createTagSchema = tagSchema.omit({
  tag_id: true,
})

export const createPublisherSchema = publisherSchema.omit({
  pub_id: true,
})

// Types
export type Publisher = z.infer<typeof publisherSchema>
export type Tag = z.infer<typeof tagSchema>
export type Tool = z.infer<typeof toolSchema>
export type Server = z.infer<typeof serverSchema>
export type ServerVersion = z.infer<typeof serverVersionSchema>
export type Connector = z.infer<typeof connectorSchema>

export type CreateServer = z.infer<typeof createServerSchema>
export type CreateTool = z.infer<typeof createToolSchema>
export type CreateTag = z.infer<typeof createTagSchema>
export type CreatePublisher = z.infer<typeof createPublisherSchema>

// Validation helpers
export const validateConnector = (data: unknown): Connector => {
  return connectorSchema.parse(data)
}

export const validateConnectorSafe = (data: unknown) => {
  return connectorSchema.safeParse(data)
}

// Mock data validation
export const validateMockConnectors = (connectors: unknown[]) => {
  return connectors.map(conn => validateConnector(conn))
}
