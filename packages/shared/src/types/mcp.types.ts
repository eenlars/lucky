export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  mcp: {
    Tables: {
      approvals: {
        Row: {
          actor_id: string
          appr_id: string
          decided_at: string
          decision: string
          reason: string | null
          subject_id: string
          subject_type: string
        }
        Insert: {
          actor_id: string
          appr_id?: string
          decided_at?: string
          decision: string
          reason?: string | null
          subject_id: string
          subject_type: string
        }
        Update: {
          actor_id?: string
          appr_id?: string
          decided_at?: string
          decision?: string
          reason?: string | null
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      beta_access: {
        Row: {
          cohort: string
          granted_at: string
          granted_by: string | null
          org_id: string
          sver_id: string
        }
        Insert: {
          cohort: string
          granted_at?: string
          granted_by?: string | null
          org_id: string
          sver_id: string
        }
        Update: {
          cohort?: string
          granted_at?: string
          granted_by?: string | null
          org_id?: string
          sver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_access_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      health_checks: {
        Row: {
          checked_at: string
          details_json: Json | null
          error_message: string | null
          hchk_id: string
          inst_id: string
          latency_ms: number | null
          probe_kind: string
          status: string
        }
        Insert: {
          checked_at?: string
          details_json?: Json | null
          error_message?: string | null
          hchk_id?: string
          inst_id: string
          latency_ms?: number | null
          probe_kind: string
          status: string
        }
        Update: {
          checked_at?: string
          details_json?: Json | null
          error_message?: string | null
          hchk_id?: string
          inst_id?: string
          latency_ms?: number | null
          probe_kind?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_inst_id_fkey"
            columns: ["inst_id"]
            isOneToOne: false
            referencedRelation: "server_instances"
            referencedColumns: ["inst_id"]
          },
        ]
      }
      org_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          level: string
          org_id: string
          server_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          level: string
          org_id: string
          server_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          level?: string
          org_id?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_access_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["server_id"]
          },
        ]
      }
      prompts: {
        Row: {
          arguments_json: Json | null
          created_at: string
          description: string | null
          discovered_at: string | null
          name: string
          prompt_id: string
          sver_id: string
          template: string | null
          updated_at: string
        }
        Insert: {
          arguments_json?: Json | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          name: string
          prompt_id?: string
          sver_id: string
          template?: string | null
          updated_at?: string
        }
        Update: {
          arguments_json?: Json | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          name?: string
          prompt_id?: string
          sver_id?: string
          template?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          discovered_at: string | null
          mime_type: string | null
          name: string
          resource_id: string
          sver_id: string
          updated_at: string
          uri: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          mime_type?: string | null
          name: string
          resource_id?: string
          sver_id: string
          updated_at?: string
          uri: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          mime_type?: string | null
          name?: string
          resource_id?: string
          sver_id?: string
          updated_at?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      review_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          event_id: string
          reason: string | null
          subject_id: string
          subject_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          event_id?: string
          reason?: string | null
          subject_id: string
          subject_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          event_id?: string
          reason?: string | null
          subject_id?: string
          subject_type?: string
        }
        Relationships: []
      }
      server_instances: {
        Row: {
          created_at: string
          deploy_kind: string
          desired_replicas: number
          endpoint_json: Json | null
          inst_id: string
          last_deployed_at: string | null
          org_id: string
          region: string | null
          runtime: string | null
          status: string
          sver_id: string
        }
        Insert: {
          created_at?: string
          deploy_kind: string
          desired_replicas?: number
          endpoint_json?: Json | null
          inst_id?: string
          last_deployed_at?: string | null
          org_id: string
          region?: string | null
          runtime?: string | null
          status?: string
          sver_id: string
        }
        Update: {
          created_at?: string
          deploy_kind?: string
          desired_replicas?: number
          endpoint_json?: Json | null
          inst_id?: string
          last_deployed_at?: string | null
          org_id?: string
          region?: string | null
          runtime?: string | null
          status?: string
          sver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_instances_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      server_tags: {
        Row: {
          server_id: string
          tag_id: string
        }
        Insert: {
          server_id: string
          tag_id: string
        }
        Update: {
          server_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_tags_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["server_id"]
          },
          {
            foreignKeyName: "server_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["tag_id"]
          },
        ]
      }
      server_transport_secrets: {
        Row: {
          config_json: Json
          stra_id: string
        }
        Insert: {
          config_json: Json
          stra_id: string
        }
        Update: {
          config_json?: Json
          stra_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_transport_secrets_stra_id_fkey"
            columns: ["stra_id"]
            isOneToOne: true
            referencedRelation: "server_transports"
            referencedColumns: ["stra_id"]
          },
        ]
      }
      server_transports: {
        Row: {
          config_json: Json
          kind: string
          readiness_probe_json: Json | null
          stra_id: string
          sver_id: string
        }
        Insert: {
          config_json: Json
          kind: string
          readiness_probe_json?: Json | null
          stra_id?: string
          sver_id: string
        }
        Update: {
          config_json?: Json
          kind?: string
          readiness_probe_json?: Json | null
          stra_id?: string
          sver_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_transports_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      server_versions: {
        Row: {
          capabilities_json: Json
          created_at: string
          listed: boolean
          manifest_hash: string
          mcp_spec_version: string
          prompts_list_changed: boolean | null
          release_notes: string | null
          resources_list_changed: boolean | null
          resources_subscribe: boolean | null
          server_id: string
          source_ref: string | null
          status: string
          sver_id: string
          tools_list_changed: boolean | null
          version: string
        }
        Insert: {
          capabilities_json?: Json
          created_at?: string
          listed?: boolean
          manifest_hash: string
          mcp_spec_version: string
          prompts_list_changed?: boolean | null
          release_notes?: string | null
          resources_list_changed?: boolean | null
          resources_subscribe?: boolean | null
          server_id: string
          source_ref?: string | null
          status?: string
          sver_id?: string
          tools_list_changed?: boolean | null
          version: string
        }
        Update: {
          capabilities_json?: Json
          created_at?: string
          listed?: boolean
          manifest_hash?: string
          mcp_spec_version?: string
          prompts_list_changed?: boolean | null
          release_notes?: string | null
          resources_list_changed?: boolean | null
          resources_subscribe?: boolean | null
          server_id?: string
          source_ref?: string | null
          status?: string
          sver_id?: string
          tools_list_changed?: boolean | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_versions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["server_id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          display_name: string
          homepage_url: string | null
          logo_url: string | null
          long_description: string | null
          publisher_org_id: string
          repo_url: string | null
          search_text: string | null
          search_tsv: unknown | null
          server_id: string
          short_description: string
          slug: string
          visibility: string
        }
        Insert: {
          created_at?: string
          display_name: string
          homepage_url?: string | null
          logo_url?: string | null
          long_description?: string | null
          publisher_org_id: string
          repo_url?: string | null
          search_text?: string | null
          search_tsv?: unknown | null
          server_id?: string
          short_description: string
          slug: string
          visibility?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          homepage_url?: string | null
          logo_url?: string | null
          long_description?: string | null
          publisher_org_id?: string
          repo_url?: string | null
          search_text?: string | null
          search_tsv?: unknown | null
          server_id?: string
          short_description?: string
          slug?: string
          visibility?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          name: string
          slug: string
          tag_id: string
        }
        Insert: {
          name: string
          slug: string
          tag_id?: string
        }
        Update: {
          name?: string
          slug?: string
          tag_id?: string
        }
        Relationships: []
      }
      tools: {
        Row: {
          active: boolean
          annotations_json: Json | null
          created_at: string
          description: string | null
          discovered_at: string
          display_title: string | null
          input_schema_json: Json
          name: string
          output_schema_json: Json | null
          sver_id: string
          title: string | null
          tool_id: string
          traits_json: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          annotations_json?: Json | null
          created_at?: string
          description?: string | null
          discovered_at?: string
          display_title?: string | null
          input_schema_json: Json
          name: string
          output_schema_json?: Json | null
          sver_id: string
          title?: string | null
          tool_id?: string
          traits_json?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          annotations_json?: Json | null
          created_at?: string
          description?: string | null
          discovered_at?: string
          display_title?: string | null
          input_schema_json?: Json
          name?: string
          output_schema_json?: Json | null
          sver_id?: string
          title?: string | null
          tool_id?: string
          traits_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_sver_id_fkey"
            columns: ["sver_id"]
            isOneToOne: false
            referencedRelation: "server_versions"
            referencedColumns: ["sver_id"]
          },
        ]
      }
      user_server_configs: {
        Row: {
          config_json: Json
          created_at: string
          enabled: boolean
          inst_id: string | null
          last_event_id: string | null
          name: string
          negotiated_protocol_version: string | null
          secrets_json: Json
          server_id: string
          session_expires_at: string | null
          session_id: string | null
          updated_at: string
          usco_id: string
          user_id: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          enabled?: boolean
          inst_id?: string | null
          last_event_id?: string | null
          name?: string
          negotiated_protocol_version?: string | null
          secrets_json?: Json
          server_id: string
          session_expires_at?: string | null
          session_id?: string | null
          updated_at?: string
          usco_id?: string
          user_id: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          enabled?: boolean
          inst_id?: string | null
          last_event_id?: string | null
          name?: string
          negotiated_protocol_version?: string | null
          secrets_json?: Json
          server_id?: string
          session_expires_at?: string | null
          session_id?: string | null
          updated_at?: string
          usco_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_server_configs_inst_id_fkey"
            columns: ["inst_id"]
            isOneToOne: false
            referencedRelation: "server_instances"
            referencedColumns: ["inst_id"]
          },
          {
            foreignKeyName: "user_server_configs_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["server_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  mcp: {
    Enums: {},
  },
} as const
