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
  iam: {
    Tables: {
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          invite_id: string
          invited_by: string | null
          org_id: string
          role: Database["iam"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          invite_id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["iam"]["Enums"]["org_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          invite_id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["iam"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["clerk_id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["org_id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          clerk_id: string
          created_at: string | null
          org_id: string
          role: string
        }
        Insert: {
          clerk_id: string
          created_at?: string | null
          org_id: string
          role?: string
        }
        Update: {
          clerk_id?: string
          created_at?: string | null
          org_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_clerk_id_fkey"
            columns: ["clerk_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["clerk_id"]
          },
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["org_id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string | null
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          name: string
          org_id?: string
        }
        Update: {
          created_at?: string | null
          name?: string
          org_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          clerk_id: string
          created_at: string
          display_name: string | null
          email: string | null
          metadata: Json
          status: Database["iam"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_id: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          metadata?: Json
          status?: Database["iam"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_id?: string
          created_at?: string
          display_name?: string | null
          email?: string | null
          metadata?: Json
          status?: Database["iam"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clerk_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_org_admin: {
        Args: { p_org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { p_org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      org_role: "owner" | "admin" | "member"
      user_status: "active" | "disabled" | "invited"
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      DataSet: {
        Row: {
          clerk_id: string
          created_at: string
          data_format: string | null
          dataset_id: string
          description: string | null
          name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          clerk_id?: string
          created_at?: string
          data_format?: string | null
          dataset_id?: string
          description?: string | null
          name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          clerk_id?: string
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
          dataset_version_id: string | null
          ground_truth: Json | null
          output_schema_json: Json | null
          rubric: Json | null
          workflow_input: Json | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          dataset_record_id?: string
          dataset_version_id?: string | null
          ground_truth?: Json | null
          output_schema_json?: Json | null
          rubric?: Json | null
          workflow_input?: Json | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          dataset_record_id?: string
          dataset_version_id?: string | null
          ground_truth?: Json | null
          output_schema_json?: Json | null
          rubric?: Json | null
          workflow_input?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "DatasetRecord_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "DataSet"
            referencedColumns: ["dataset_id"]
          },
          {
            foreignKeyName: "dsr_dataset_version_fk"
            columns: ["dataset_version_id"]
            isOneToOne: false
            referencedRelation: "DatasetVersion"
            referencedColumns: ["dataset_version_id"]
          },
        ]
      }
      DatasetVersion: {
        Row: {
          created_at: string
          dataset_id: string
          dataset_version_id: string
          name: string | null
          snapshot_metadata: Json | null
          version_label: string | null
        }
        Insert: {
          created_at?: string
          dataset_id: string
          dataset_version_id?: string
          name?: string | null
          snapshot_metadata?: Json | null
          version_label?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string
          dataset_version_id?: string
          name?: string | null
          snapshot_metadata?: Json | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "DatasetVersion_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "DataSet"
            referencedColumns: ["dataset_id"]
          },
        ]
      }
      Evaluator: {
        Row: {
          clerk_id: string
          config: Json | null
          created_at: string
          evaluator_id: string
          name: string
          rubric: Json | null
        }
        Insert: {
          clerk_id?: string
          config?: Json | null
          created_at?: string
          evaluator_id?: string
          name: string
          rubric?: Json | null
        }
        Update: {
          clerk_id?: string
          config?: Json | null
          created_at?: string
          evaluator_id?: string
          name?: string
          rubric?: Json | null
        }
        Relationships: []
      }
      EvolutionRun: {
        Row: {
          clerk_id: string | null
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
          clerk_id?: string | null
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
          clerk_id?: string | null
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
      Generation: {
        Row: {
          best_workflow_version_id: string | null
          clerk_id: string | null
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
          clerk_id?: string | null
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
          clerk_id?: string | null
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
          node_version_id: string | null
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
          node_version_id?: string | null
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
          node_version_id?: string | null
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
            foreignKeyName: "nodeinvocation_node_version_id_fk"
            columns: ["node_version_id"]
            isOneToOne: false
            referencedRelation: "NodeVersion"
            referencedColumns: ["node_version_id"]
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
          node_version_id: string
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
          node_version_id?: string
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
          node_version_id?: string
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
          clerk_id: string | null
          created_at: string
          description: string
          updated_at: string
          wf_id: string
        }
        Insert: {
          clerk_id?: string | null
          created_at?: string
          description: string
          updated_at?: string
          wf_id?: string
        }
        Update: {
          clerk_id?: string | null
          created_at?: string
          description?: string
          updated_at?: string
          wf_id?: string
        }
        Relationships: []
      }
      WorkflowInvocation: {
        Row: {
          actual_output: string | null
          dataset_record_id: string | null
          end_time: string | null
          evaluator_id: string | null
          expected_output: string | null
          expected_output_type: Json | null
          extras: Json | null
          feedback: string | null
          fitness: Json | null
          generation_id: string | null
          preparation: string | null
          run_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost: number
          wf_invocation_id: string
          wf_version_id: string
          workflow_input: Json | null
          workflow_output: Json | null
        }
        Insert: {
          actual_output?: string | null
          dataset_record_id?: string | null
          end_time?: string | null
          evaluator_id?: string | null
          expected_output?: string | null
          expected_output_type?: Json | null
          extras?: Json | null
          feedback?: string | null
          fitness?: Json | null
          generation_id?: string | null
          preparation?: string | null
          run_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost?: number
          wf_invocation_id?: string
          wf_version_id: string
          workflow_input?: Json | null
          workflow_output?: Json | null
        }
        Update: {
          actual_output?: string | null
          dataset_record_id?: string | null
          end_time?: string | null
          evaluator_id?: string | null
          expected_output?: string | null
          expected_output_type?: Json | null
          extras?: Json | null
          feedback?: string | null
          fitness?: Json | null
          generation_id?: string | null
          preparation?: string | null
          run_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["InvocationStatus"]
          usd_cost?: number
          wf_invocation_id?: string
          wf_version_id?: string
          workflow_input?: Json | null
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
            foreignKeyName: "wfi_dataset_record_fk"
            columns: ["dataset_record_id"]
            isOneToOne: false
            referencedRelation: "DatasetRecord"
            referencedColumns: ["dataset_record_id"]
          },
          {
            foreignKeyName: "wfi_evaluator_fk"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "Evaluator"
            referencedColumns: ["evaluator_id"]
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
      WorkflowInvocationEval: {
        Row: {
          accuracy: number | null
          created_at: string
          feedback: string | null
          wf_inv_eval_id: string
          wf_inv_id: string | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          feedback?: string | null
          wf_inv_eval_id?: string
          wf_inv_id?: string | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          feedback?: string | null
          wf_inv_eval_id?: string
          wf_inv_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "WorkflowInvocationEval_wf_inv_id_fkey"
            columns: ["wf_inv_id"]
            isOneToOne: false
            referencedRelation: "WorkflowInvocation"
            referencedColumns: ["wf_invocation_id"]
          },
        ]
      }
      WorkflowVersion: {
        Row: {
          commit_message: string
          created_at: string
          dsl: Json
          generation_id: string | null
          input_schema: Json
          iteration_budget: number
          knowledge: Json | null
          operation: Database["public"]["Enums"]["WorkflowOperation"]
          output_schema: Json | null
          parent_id: string | null
          parent1_id: string | null
          parent2_id: string | null
          time_budget_seconds: number
          updated_at: string
          wf_version_id: string
          workflow_id: string | null
        }
        Insert: {
          commit_message: string
          created_at?: string
          dsl: Json
          generation_id?: string | null
          input_schema?: Json
          iteration_budget?: number
          knowledge?: Json | null
          operation?: Database["public"]["Enums"]["WorkflowOperation"]
          output_schema?: Json | null
          parent_id?: string | null
          parent1_id?: string | null
          parent2_id?: string | null
          time_budget_seconds?: number
          updated_at?: string
          wf_version_id?: string
          workflow_id?: string | null
        }
        Update: {
          commit_message?: string
          created_at?: string
          dsl?: Json
          generation_id?: string | null
          input_schema?: Json
          iteration_budget?: number
          knowledge?: Json | null
          operation?: Database["public"]["Enums"]["WorkflowOperation"]
          output_schema?: Json | null
          parent_id?: string | null
          parent1_id?: string | null
          parent2_id?: string | null
          time_budget_seconds?: number
          updated_at?: string
          wf_version_id?: string
          workflow_id?: string | null
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
      current_clerk_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gen_prefixed_id: {
        Args: { p_prefix: string }
        Returns: string
      }
      gen_short_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      owns_workflow: {
        Args: { p_workflow_id: string }
        Returns: boolean
      }
      owns_workflow_invocation: {
        Args: { p_wf_invocation_id: string }
        Returns: boolean
      }
      owns_workflow_version: {
        Args: { p_wf_version_id: string }
        Returns: boolean
      }
      require_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sub: {
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
  app: {
    Enums: {},
  },
  iam: {
    Enums: {
      org_role: ["owner", "admin", "member"],
      user_status: ["active", "disabled", "invited"],
    },
  },
  lockbox: {
    Enums: {},
  },
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
