export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  app: {
    Tables: {
      feedback: {
        Row: {
          clerk_id: string | null
          content: string
          context: string | null
          created_at: string | null
          feedback_id: string
          status: string | null
        }
        Insert: {
          clerk_id?: string | null
          content: string
          context?: string | null
          created_at?: string | null
          feedback_id?: string
          status?: string | null
        }
        Update: {
          clerk_id?: string | null
          content?: string
          context?: string | null
          created_at?: string | null
          feedback_id?: string
          status?: string | null
        }
        Relationships: []
      }
      provider_settings: {
        Row: {
          clerk_id: string
          created_at: string
          enabled_models: Json
          is_enabled: boolean
          provider: string
          provider_setting_id: string
          updated_at: string
        }
        Insert: {
          clerk_id: string
          created_at?: string
          enabled_models?: Json
          is_enabled?: boolean
          provider: string
          provider_setting_id?: string
          updated_at?: string
        }
        Update: {
          clerk_id?: string
          created_at?: string
          enabled_models?: Json
          is_enabled?: boolean
          provider?: string
          provider_setting_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          approval_rules: Json
          autonomy: string
          completed_at: string | null
          created_at: string
          data_sources: string[]
          experience: string
          industry: string | null
          ip_address: string | null
          locale: string | null
          marketing_opt_in: boolean
          notify_channels: string[]
          org_id: string | null
          preferred_apps: string[]
          primary_goal: string | null
          privacy_accepted_at: string | null
          role: string | null
          status: string
          success_metric: string | null
          team_size: number | null
          time_budget_min_per_week: number | null
          timezone: string | null
          top_tasks: string[]
          tos_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_rules?: Json
          autonomy?: string
          completed_at?: string | null
          created_at?: string
          data_sources?: string[]
          experience?: string
          industry?: string | null
          ip_address?: string | null
          locale?: string | null
          marketing_opt_in?: boolean
          notify_channels?: string[]
          org_id?: string | null
          preferred_apps?: string[]
          primary_goal?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          status?: string
          success_metric?: string | null
          team_size?: number | null
          time_budget_min_per_week?: number | null
          timezone?: string | null
          top_tasks?: string[]
          tos_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_rules?: Json
          autonomy?: string
          completed_at?: string | null
          created_at?: string
          data_sources?: string[]
          experience?: string
          industry?: string | null
          ip_address?: string | null
          locale?: string | null
          marketing_opt_in?: boolean
          notify_channels?: string[]
          org_id?: string | null
          preferred_apps?: string[]
          primary_goal?: string | null
          privacy_accepted_at?: string | null
          role?: string | null
          status?: string
          success_metric?: string | null
          team_size?: number | null
          time_budget_min_per_week?: number | null
          timezone?: string | null
          top_tasks?: string[]
          tos_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          about: string | null
          clerk_id: string
          created_at: string
          goals: string | null
          user_profile_id: string
        }
        Insert: {
          about?: string | null
          clerk_id: string
          created_at?: string
          goals?: string | null
          user_profile_id?: string
        }
        Update: {
          about?: string | null
          clerk_id?: string
          created_at?: string
          goals?: string | null
          user_profile_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sub: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
  app: {
    Enums: {},
  },
} as const
