export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  lockbox: {
    Tables: {
      secret_keys: {
        Row: {
          clerk_id: string
          created_at: string
          created_by: string | null
          environment: string
          expires_at: string | null
          key_id: string
          last_used_at: string | null
          name: string
          rate_limit_pm: number | null
          revoked_at: string | null
          scopes: Json
          secret_hash: string
          secret_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          clerk_id: string
          created_at?: string
          created_by?: string | null
          environment?: string
          expires_at?: string | null
          key_id: string
          last_used_at?: string | null
          name: string
          rate_limit_pm?: number | null
          revoked_at?: string | null
          scopes?: Json
          secret_hash: string
          secret_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          clerk_id?: string
          created_at?: string
          created_by?: string | null
          environment?: string
          expires_at?: string | null
          key_id?: string
          last_used_at?: string | null
          name?: string
          rate_limit_pm?: number | null
          revoked_at?: string | null
          scopes?: Json
          secret_hash?: string
          secret_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_secrets: {
        Row: {
          auth_tag: string
          ciphertext: string
          clerk_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          is_current: boolean
          iv: string
          last_used_at: string | null
          name: string
          namespace: string
          scope: Json
          updated_at: string
          updated_by: string | null
          user_secret_id: string
          version: number
        }
        Insert: {
          auth_tag: string
          ciphertext: string
          clerk_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          is_current?: boolean
          iv: string
          last_used_at?: string | null
          name: string
          namespace?: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
          user_secret_id?: string
          version?: number
        }
        Update: {
          auth_tag?: string
          ciphertext?: string
          clerk_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          is_current?: boolean
          iv?: string
          last_used_at?: string | null
          name?: string
          namespace?: string
          scope?: Json
          updated_at?: string
          updated_by?: string | null
          user_secret_id?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      sub: { Args: never; Returns: string }
      validate_bearer_token: {
        Args: { p_secret_hash: string }
        Returns: {
          clerk_id: string
          scopes: Json
          secret_id: string
        }[]
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

export type Constants = typeof _Constants

const _Constants = {
  lockbox: {
    Enums: {},
  },
} as const
