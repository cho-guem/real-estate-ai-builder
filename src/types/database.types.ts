export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          status: "draft" | "published" | "archived";
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          status?: "draft" | "published" | "archived";
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          status?: "draft" | "published" | "archived";
          config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      generation_runs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          status: Database["public"]["Enums"]["generation_run_status"];
          current_step_key: string | null;
          started_at: string | null;
          completed_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          status?: Database["public"]["Enums"]["generation_run_status"];
          current_step_key?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          user_id?: string;
          status?: Database["public"]["Enums"]["generation_run_status"];
          current_step_key?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      generation_steps: {
        Row: {
          id: string;
          run_id: string;
          project_id: string;
          step_key: string;
          agent_role: string;
          status: Database["public"]["Enums"]["generation_step_status"];
          order_index: number;
          input: Json;
          output: Json | null;
          error_message: string | null;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          project_id: string;
          step_key: string;
          agent_role: string;
          status?: Database["public"]["Enums"]["generation_step_status"];
          order_index: number;
          input?: Json;
          output?: Json | null;
          error_message?: string | null;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          run_id?: string;
          project_id?: string;
          step_key?: string;
          agent_role?: string;
          status?: Database["public"]["Enums"]["generation_step_status"];
          order_index?: number;
          input?: Json;
          output?: Json | null;
          error_message?: string | null;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      website_artifacts: {
        Row: {
          id: string;
          project_id: string;
          run_id: string;
          step_id: string | null;
          artifact_type: Database["public"]["Enums"]["website_artifact_type"];
          status: Database["public"]["Enums"]["website_artifact_status"];
          version: number;
          data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          run_id: string;
          step_id?: string | null;
          artifact_type: Database["public"]["Enums"]["website_artifact_type"];
          status?: Database["public"]["Enums"]["website_artifact_status"];
          version?: number;
          data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          run_id?: string;
          step_id?: string | null;
          artifact_type?: Database["public"]["Enums"]["website_artifact_type"];
          status?: Database["public"]["Enums"]["website_artifact_status"];
          version?: number;
          data?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: "draft" | "published" | "archived";
      generation_run_status:
        | "queued"
        | "running"
        | "waiting_for_user"
        | "completed"
        | "failed"
        | "canceled";
      generation_step_status: "pending" | "running" | "completed" | "failed" | "skipped";
      website_artifact_type:
        | "benchmark"
        | "strategy"
        | "site_architecture"
        | "feature_planning"
        | "ux_flow"
        | "seo"
        | "design"
        | "brand"
        | "site_structure"
        | "landing_page"
        | "review";
      website_artifact_status: "draft" | "approved" | "rejected" | "superseded";
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
