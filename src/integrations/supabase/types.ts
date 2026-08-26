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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          present: boolean
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          present?: boolean
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          present?: boolean
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_time: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          event_date: string
          event_time?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_time?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: []
      }
      coach_applications: {
        Row: {
          coach_type: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_type: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_type?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      evaluation_results: {
        Row: {
          created_at: string
          created_by: string
          evaluation_id: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          created_by: string
          evaluation_id: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          created_by?: string
          evaluation_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_results_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          eval_date: string
          higher_is_better: boolean
          id: string
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          eval_date?: string
          higher_is_better?: boolean
          id?: string
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          eval_date?: string
          higher_is_better?: boolean
          id?: string
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      gym_observations: {
        Row: {
          created_at: string
          done: boolean
          exercise: string
          id: string
          notes: string | null
          reps: number | null
          routine_id: string
          updated_at: string
          user_id: string
          week: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          done?: boolean
          exercise: string
          id?: string
          notes?: string | null
          reps?: number | null
          routine_id: string
          updated_at?: string
          user_id: string
          week?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          done?: boolean
          exercise?: string
          id?: string
          notes?: string | null
          reps?: number | null
          routine_id?: string
          updated_at?: string
          user_id?: string
          week?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_observations_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "gym_routines"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_routines: {
        Row: {
          created_at: string
          created_by: string
          id: string
          month: number
          notes: string | null
          pdf_path: string
          position: string | null
          title: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          month: number
          notes?: string | null
          pdf_path: string
          position?: string | null
          title: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          month?: number
          notes?: string | null
          pdf_path?: string
          position?: string | null
          title?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      library_items: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      match_participations: {
        Row: {
          convoked: boolean
          created_at: string
          id: string
          injury: boolean
          injury_note: string | null
          match_id: string
          minutes_played: number
          updated_at: string
          user_id: string
        }
        Insert: {
          convoked?: boolean
          created_at?: string
          id?: string
          injury?: boolean
          injury_note?: string | null
          match_id: string
          minutes_played?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          convoked?: boolean
          created_at?: string
          id?: string
          injury?: boolean
          injury_note?: string | null
          match_id?: string
          minutes_played?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          created_by: string
          id: string
          location: string | null
          match_date: string
          notes: string | null
          opponent: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          match_date: string
          notes?: string | null
          opponent?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          match_date?: string
          notes?: string | null
          opponent?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      physio_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string | null
          appointment_type: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          reasons: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time?: string | null
          appointment_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reasons?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string | null
          appointment_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          reasons?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      physio_slots: {
        Row: {
          appointment_type: string
          created_at: string
          created_by: string
          duration_minutes: number
          id: string
          recurring_schedule_id: string | null
          reserved_at: string | null
          reserved_by: string | null
          slot_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          created_by: string
          duration_minutes?: number
          id?: string
          recurring_schedule_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          slot_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          id?: string
          recurring_schedule_id?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          slot_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "physio_slots_recurring_schedule_id_fkey"
            columns: ["recurring_schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          coach_type: string | null
          created_at: string
          full_name: string
          height: number | null
          id: string
          last_name: string | null
          last_weight_update: string | null
          onboarded: boolean
          photo_url: string | null
          position: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          coach_type?: string | null
          created_at?: string
          full_name: string
          height?: number | null
          id: string
          last_name?: string | null
          last_weight_update?: string | null
          onboarded?: boolean
          photo_url?: string | null
          position?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          coach_type?: string | null
          created_at?: string
          full_name?: string
          height?: number | null
          id?: string
          last_name?: string | null
          last_weight_update?: string | null
          onboarded?: boolean
          photo_url?: string | null
          position?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      push_schedules: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string
          id: string
          last_sent_at: string | null
          link: string | null
          send_time: string
          target_role: Database["public"]["Enums"]["app_role"]
          title: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_sent_at?: string | null
          link?: string | null
          send_time: string
          target_role?: Database["public"]["Enums"]["app_role"]
          title: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_sent_at?: string | null
          link?: string | null
          send_time?: string
          target_role?: Database["public"]["Enums"]["app_role"]
          title?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recovery_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          max_score: number
          notes: string | null
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          id?: string
          max_score?: number
          notes?: string | null
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          max_score?: number
          notes?: string | null
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_entry_items: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          points: number
          strategy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          points?: number
          strategy_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          points?: number
          strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_entry_items_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "recovery_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_entry_items_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "recovery_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_strategies: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          points: number
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points?: number
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points?: number
          sort_order?: number
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          active: boolean
          appointment_type: string | null
          created_at: string
          created_by: string
          duration_minutes: number
          end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          kind: string
          name: string
          notes: string | null
          slot_interval_minutes: number | null
          start_date: string
          start_time: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          active?: boolean
          appointment_type?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          slot_interval_minutes?: number | null
          start_date?: string
          start_time: string
          updated_at?: string
          weekdays?: number[]
        }
        Update: {
          active?: boolean
          appointment_type?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          slot_interval_minutes?: number | null
          start_date?: string
          start_time?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: []
      }
      rpe_entries: {
        Row: {
          created_at: string
          id: string
          rpe_score: number
          session_date: string
          session_label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rpe_score: number
          session_date: string
          session_label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rpe_score?: number
          session_date?: string
          session_label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          name: string
          plan_date: string
          plan_time: string | null
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name: string
          plan_date: string
          plan_time?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          name?: string
          plan_date?: string
          plan_time?: string | null
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_votes: {
        Row: {
          comment: string
          created_at: string
          id: string
          nominee_id: string
          updated_at: string
          voter_id: string
          week_start: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          nominee_id: string
          updated_at?: string
          voter_id: string
          week_start: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          nominee_id?: string
          updated_at?: string
          voter_id?: string
          week_start?: string
        }
        Relationships: []
      }
      weight_history: {
        Row: {
          id: string
          recorded_at: string
          user_id: string
          weight: number
        }
        Insert: {
          id?: string
          recorded_at?: string
          user_id: string
          weight: number
        }
        Update: {
          id?: string
          recorded_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      wellness_entries: {
        Row: {
          created_at: string
          entry_date: string
          fatigue: number
          has_pain: boolean
          id: string
          mood: number
          pain_description: string | null
          sleep: number
          stress: number
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date: string
          fatigue: number
          has_pain?: boolean
          id?: string
          mood: number
          pain_description?: string | null
          sleep: number
          stress: number
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          fatigue?: number
          has_pain?: boolean
          id?: string
          mood?: number
          pain_description?: string | null
          sleep?: number
          stress?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attendance_leaderboard: {
        Args: { _year?: number }
        Returns: {
          convocations: number
          forms_count: number
          full_name: string
          last_name: string
          photo_url: string
          points: number
          position: string
          present_days: number
          streak_weeks: number
          test_pos_top3_count: number
          test_top5_count: number
          user_id: string
        }[]
      }
      cancel_physio_slot: { Args: { _slot_id: string }; Returns: undefined }
      gamification_leaderboard: {
        Args: { _from: string; _to: string }
        Returns: {
          convocations: number
          forms_count: number
          full_name: string
          last_name: string
          photo_url: string
          points: number
          position: string
          present_days: number
          streak_weeks: number
          test_pos_top3_count: number
          test_top5_count: number
          user_id: string
          vote_wins: number
          votes_cast: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      reserve_physio_slot: { Args: { _slot_id: string }; Returns: string }
      weekly_vote_winners: {
        Args: { _week_start?: string }
        Returns: {
          full_name: string
          last_name: string
          nominee_id: string
          photo_url: string
          votes: number
        }[]
      }
    }
    Enums: {
      app_role: "atleta" | "coach"
      event_type: "training" | "match"
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
      app_role: ["atleta", "coach"],
      event_type: ["training", "match"],
    },
  },
} as const
