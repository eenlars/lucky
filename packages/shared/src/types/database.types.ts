export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      DataSet: {
        Row: {
          created_at: string
          data_format: string | null
          dataset_id: string
          description: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_format?: string | null
          dataset_id?: string
          description?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_format?: string | null
          dataset_id?: string
          description?: string | null
          name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      DatasetRecord: {
        Row: {
          created_at: string
          dataset_id: string
          dataset_record_id: string
          ground_truth: Json | null
          output_schema_json: Json | null
          rubric: Json | null
          workflow_input: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          dataset_record_id?: string
          ground_truth?: Json | null
          output_schema_json?: Json | null
          rubric?: Json | null
          workflow_input?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          dataset_record_id?: string
          ground_truth?: Json | null
          output_schema_json?: Json | null
          rubric?: Json | null
          workflow_input?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "DatasetRecord_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "DataSet"
            referencedColumns: ["dataset_id"]
          },
        ]
      }
      EvolutionRun: {
        Row: {
          config: Json
          end_time: string | null
          evolution_type: string | null
          goal_text: string
          notes: string | null
          run_id: string
          start_time: string
          status: Database["public"]["Enums"]["EvolutionRunStatus"]
        }
        Insert: {
          config: Json
          end_time?: string | null
          evolution_type?: string | null
          goal_text: string
          notes?: string | null
          run_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["EvolutionRunStatus"]
        }
        Update: {
          config?: Json
          end_time?: string | null
          evolution_type?: string | null
          goal_text?: string
          notes?: string | null
          run_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["EvolutionRunStatus"]
        }
        Relationships: []
      }
      Generation: {
        Row: {
          best_workflow_version_id: string | null
          comment: string | null
          end_time: string | null
          feedback: string | null
          generation_id: string
          number: number
          run_id: string
          start_time: string
        }
        Insert: {
          best_workflow_version_id?: string | null
          comment?: string | null
          end_time?: string | null
          feedback?: string | null
          generation_id?: string
          number: number
          run_id: string
          start_time?: string
        }
        Update: {
          best_workflow_version_id?: string | null
          comment?: string | null
          end_time?: string | null
          feedback?: string | null
          generation_id?: string
          number?: number
          run_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_generation_best_wfv"
            columns: ["best_workflow_version_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
          {
            foreignKeyName: "fk_generation_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "EvolutionRun"
            referencedColumns: ["run_id"]
          },
        ]
      }
      Message: {
        Row: {
          created_at: string
          from_node_id: string | null
          msg_id: string
          origin_invocation_id: string | null
          payload: Json
          role: Database["public"]["Enums"]["MessageRole"]
          seq: number
          target_invocation_id: string | null
          to_node_id: string | null
          wf_invocation_id: string
        }
        Insert: {
          created_at?: string
          from_node_id?: string | null
          msg_id?: string
          origin_invocation_id?: string | null
          payload: Json
          role: Database["public"]["Enums"]["MessageRole"]
          seq?: number
          target_invocation_id?: string | null
          to_node_id?: string | null
          wf_invocation_id?: string
        }
        Update: {
          created_at?: string
          from_node_id?: string | null
          msg_id?: string
          origin_invocation_id?: string | null
          payload?: Json
          role?: Database["public"]["Enums"]["MessageRole"]
          seq?: number
          target_invocation_id?: string | null
          to_node_id?: string | null
          wf_invocation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_origin_invocation_id_fkey"
            columns: ["origin_invocation_id"]
            isOneToOne: false
            referencedRelation: "NodeInvocation"
            referencedColumns: ["node_invocation_id"]
          },
          {
            foreignKeyName: "Message_target_invocation_id_fkey"
            columns: ["target_invocation_id"]
            isOneToOne: false
            referencedRelation: "NodeInvocation"
            referencedColumns: ["node_invocation_id"]
          },
          {
            foreignKeyName: "Message_wf_invocation_id_fkey"
            columns: ["wf_invocation_id"]
            isOneToOne: false
            referencedRelation: "WorkflowInvocation"
            referencedColumns: ["wf_invocation_id"]
          },
        ]
      }
      NodeInvocation: {
        Row: {
          end_time: string | null
          extras: Json | null
          files: string[] | null
          metadata: Json | null
          model: string | null
          node_id: string
          node_invocation_id: string
          output: Json | null
          start_time: string
          status: Database["public"]["Enums"]["InvocationStatus"]
          summary: string | null
          usd_cost: number
          wf_invocation_id: string | null
          wf_version_id: string
        }
        Insert: {
          end_time?: string | null
          extras?: Json | null
          files?: string[] | null
          metadata?: Json | null
          model?: string | null
          node_id: string
          node_invocation_id?: string
          output?: Json | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          summary?: string | null
          usd_cost?: number
          wf_invocation_id?: string | null
          wf_version_id: string
        }
        Update: {
          end_time?: string | null
          extras?: Json | null
          files?: string[] | null
          metadata?: Json | null
          model?: string | null
          node_id?: string
          node_invocation_id?: string
          output?: Json | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          summary?: string | null
          usd_cost?: number
          wf_invocation_id?: string | null
          wf_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "NodeInvocation_node_id_wf_version_id_fkey"
            columns: ["node_id", "wf_version_id"]
            isOneToOne: false
            referencedRelation: "NodeVersion"
            referencedColumns: ["node_id", "wf_version_id"]
          },
          {
            foreignKeyName: "NodeInvocation_wf_invocation_id_fkey"
            columns: ["wf_invocation_id"]
            isOneToOne: false
            referencedRelation: "WorkflowInvocation"
            referencedColumns: ["wf_invocation_id"]
          },
        ]
      }
      NodeVersion: {
        Row: {
          created_at: string
          description: string | null
          extras: Json
          handoffs: string[] | null
          llm_model: string
          memory: Json | null
          node_id: string
          system_prompt: string
          tools: string[]
          updated_at: string
          version: number
          waiting_for: string[] | null
          wf_version_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          extras: Json
          handoffs?: string[] | null
          llm_model: string
          memory?: Json | null
          node_id?: string
          system_prompt: string
          tools: string[]
          updated_at?: string
          version: number
          waiting_for?: string[] | null
          wf_version_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          extras?: Json
          handoffs?: string[] | null
          llm_model?: string
          memory?: Json | null
          node_id?: string
          system_prompt?: string
          tools?: string[]
          updated_at?: string
          version?: number
          waiting_for?: string[] | null
          wf_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "NodeVersion_wf_version_id_fkey"
            columns: ["wf_version_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
        ]
      }
      Workflow: {
        Row: {
          created_at: string
          description: string
          updated_at: string
          wf_id: string
        }
        Insert: {
          created_at?: string
          description: string
          updated_at?: string
          wf_id?: string
        }
        Update: {
          created_at?: string
          description?: string
          updated_at?: string
          wf_id?: string
        }
        Relationships: []
      }
      WorkflowInvocation: {
        Row: {
          accuracy: number | null
          actual_output: string | null
          end_time: string | null
          evaluation_inputs: Json | null
          expected_output: string | null
          expected_output_type: Json | null
          extras: Json | null
          feedback: string | null
          fitness: Json | null
          fitness_score: number | null
          generation_id: string | null
          metadata: Json | null
          novelty: number | null
          preparation: string | null
          run_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost: number
          wf_invocation_id: string
          wf_version_id: string
          workflow_input: Json | null
          workflow_io: Json | null
          workflow_output: Json | null
        }
        Insert: {
          accuracy?: number | null
          actual_output?: string | null
          end_time?: string | null
          evaluation_inputs?: Json | null
          expected_output?: string | null
          expected_output_type?: Json | null
          extras?: Json | null
          feedback?: string | null
          fitness?: Json | null
          fitness_score?: number | null
          generation_id?: string | null
          metadata?: Json | null
          novelty?: number | null
          preparation?: string | null
          run_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost?: number
          wf_invocation_id?: string
          wf_version_id: string
          workflow_input?: Json | null
          workflow_io?: Json | null
          workflow_output?: Json | null
        }
        Update: {
          accuracy?: number | null
          actual_output?: string | null
          end_time?: string | null
          evaluation_inputs?: Json | null
          expected_output?: string | null
          expected_output_type?: Json | null
          extras?: Json | null
          feedback?: string | null
          fitness?: Json | null
          fitness_score?: number | null
          generation_id?: string | null
          metadata?: Json | null
          novelty?: number | null
          preparation?: string | null
          run_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost?: number
          wf_invocation_id?: string
          wf_version_id?: string
          workflow_input?: Json | null
          workflow_io?: Json | null
          workflow_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wfi_generation"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "Generation"
            referencedColumns: ["generation_id"]
          },
          {
            foreignKeyName: "fk_wfi_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "EvolutionRun"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "WorkflowInvocation_wf_version_id_fkey"
            columns: ["wf_version_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
        ]
      }
      WorkflowVersion: {
        Row: {
          all_workflow_io: Json[] | null
          commit_message: string
          created_at: string
          dsl: Json
          generation_id: string | null
          iteration_budget: number
          knowledge: Json | null
          operation: Database["public"]["Enums"]["WorkflowOperation"]
          parent_id: string | null
          parent1_id: string | null
          parent2_id: string | null
          time_budget_seconds: number
          updated_at: string
          wf_version_id: string
          workflow_id: string
        }
        Insert: {
          all_workflow_io?: Json[] | null
          commit_message: string
          created_at?: string
          dsl: Json
          generation_id?: string | null
          iteration_budget?: number
          knowledge?: Json | null
          operation?: Database["public"]["Enums"]["WorkflowOperation"]
          parent_id?: string | null
          parent1_id?: string | null
          parent2_id?: string | null
          time_budget_seconds?: number
          updated_at?: string
          wf_version_id?: string
          workflow_id: string
        }
        Update: {
          all_workflow_io?: Json[] | null
          commit_message?: string
          created_at?: string
          dsl?: Json
          generation_id?: string | null
          iteration_budget?: number
          knowledge?: Json | null
          operation?: Database["public"]["Enums"]["WorkflowOperation"]
          parent_id?: string | null
          parent1_id?: string | null
          parent2_id?: string | null
          time_budget_seconds?: number
          updated_at?: string
          wf_version_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wfv_generation"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "Generation"
            referencedColumns: ["generation_id"]
          },
          {
            foreignKeyName: "fk_wfv_parent1"
            columns: ["parent1_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
          {
            foreignKeyName: "fk_wfv_parent2"
            columns: ["parent2_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
          {
            foreignKeyName: "fk_workflow_version_parent"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "WorkflowVersion"
            referencedColumns: ["wf_version_id"]
          },
          {
            foreignKeyName: "WorkflowVersion_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "Workflow"
            referencedColumns: ["wf_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_prefixed_id: {
        Args: { p_prefix: string }
        Returns: string
      }
      gen_short_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      EvolutionRunStatus: "running" | "completed" | "failed" | "interrupted"
      FitnessMetric: "success_rate" | "usd_cost" | "custom"
      InvocationStatus: "running" | "completed" | "failed" | "rolled_back"
      MessageRole:
        | "delegation"
        | "result"
        | "feedback"
        | "data"
        | "error"
        | "control"
        | "any"
        | "result-error"
        | "aggregated"
        | "sequential"
      WorkflowOperation: "init" | "crossover" | "mutation" | "immigrant"
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {
      EvolutionRunStatus: ["running", "completed", "failed", "interrupted"],
      FitnessMetric: ["success_rate", "usd_cost", "custom"],
      InvocationStatus: ["running", "completed", "failed", "rolled_back"],
      MessageRole: [
        "delegation",
        "result",
        "feedback",
        "data",
        "error",
        "control",
        "any",
        "result-error",
        "aggregated",
        "sequential",
      ],
      WorkflowOperation: ["init", "crossover", "mutation", "immigrant"],
    },
  },
} as const
