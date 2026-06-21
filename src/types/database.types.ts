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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          id: string
          match_id: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          id?: string
          match_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          id?: string
          match_id?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          actual_start_time: string | null
          away_score_fulltime: number | null
          away_score_quiniela: number | null
          away_score_regular: number | null
          away_team: string
          created_at: string
          early_unlock_at: string | null
          external_id: number | null
          group_name: string | null
          home_score_fulltime: number | null
          home_score_quiniela: number | null
          home_score_regular: number | null
          home_team: string
          id: string
          is_placeholder: boolean
          matchday: number | null
          result_source: string | null
          scheduled_time: string
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_start_time?: string | null
          away_score_fulltime?: number | null
          away_score_quiniela?: number | null
          away_score_regular?: number | null
          away_team: string
          created_at?: string
          early_unlock_at?: string | null
          external_id?: number | null
          group_name?: string | null
          home_score_fulltime?: number | null
          home_score_quiniela?: number | null
          home_score_regular?: number | null
          home_team: string
          id?: string
          is_placeholder?: boolean
          matchday?: number | null
          result_source?: string | null
          scheduled_time: string
          stage: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_start_time?: string | null
          away_score_fulltime?: number | null
          away_score_quiniela?: number | null
          away_score_regular?: number | null
          away_team?: string
          created_at?: string
          early_unlock_at?: string | null
          external_id?: number | null
          group_name?: string | null
          home_score_fulltime?: number | null
          home_score_quiniela?: number | null
          home_score_regular?: number | null
          home_team?: string
          id?: string
          is_placeholder?: boolean
          matchday?: number | null
          result_source?: string | null
          scheduled_time?: string
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_score: number
          home_score: number
          id: string
          match_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          away_score: number
          home_score: number
          id?: string
          match_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          home_score?: number
          id?: string
          match_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          is_test: boolean
          theme: string | null
          timezone: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          is_test?: boolean
          theme?: string | null
          timezone?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          is_test?: boolean
          theme?: string | null
          timezone?: string
        }
        Relationships: []
      }
      reglas_puntuacion: {
        Row: {
          corte: string
          etapa: string
          pts_diferencia: number
          pts_exacto: number
          pts_fallo: number
          pts_tendencia: number
          updated_at: string
        }
        Insert: {
          corte?: string
          etapa: string
          pts_diferencia?: number
          pts_exacto?: number
          pts_fallo?: number
          pts_tendencia?: number
          updated_at?: string
        }
        Update: {
          corte?: string
          etapa?: string
          pts_diferencia?: number
          pts_exacto?: number
          pts_fallo?: number
          pts_tendencia?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          is_error: boolean
          log_type: string
          match_id: string | null
          message: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          is_error?: boolean
          log_type: string
          match_id?: string | null
          message: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          is_error?: boolean
          log_type?: string
          match_id?: string | null
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          diff_count: number | null
          display_name: string | null
          exact_count: number | null
          fail_count: number | null
          is_admin: boolean | null
          matches_scored: number | null
          total_points: number | null
          trend_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      scores: {
        Row: {
          away_team: string | null
          home_team: string | null
          match_id: string | null
          points: number | null
          pred_away: number | null
          pred_home: number | null
          result_away: number | null
          result_home: number | null
          result_type: string | null
          scheduled_time: string | null
          stage: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_lock_time: { Args: { p_match_id: string }; Returns: string }
      is_match_locked: { Args: { p_match_id: string }; Returns: boolean }
      prediction_count: { Args: { p_match_id: string }; Returns: number }
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
    Enums: {},
  },
} as const
