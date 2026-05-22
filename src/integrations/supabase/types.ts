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
      admin_authorizations: {
        Row: {
          admin_user_id: string
          created_at: string
          granted_by: string | null
          id: string
          studio_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          studio_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_authorizations_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          operator_id: string | null
          source: string | null
          starts_at: string
          status: string
          visit_type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          operator_id?: string | null
          source?: string | null
          starts_at: string
          status?: string
          visit_type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          operator_id?: string | null
          source?: string | null
          starts_at?: string
          status?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          studio_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          studio_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          studio_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          family_id: string | null
          first_name: string
          id: string
          last_name: string
          last_visit: string | null
          notes: string | null
          operator_id: string | null
          phone: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          family_id?: string | null
          first_name: string
          id?: string
          last_name: string
          last_visit?: string | null
          notes?: string | null
          operator_id?: string | null
          phone: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          family_id?: string | null
          first_name?: string
          id?: string
          last_name?: string
          last_visit?: string | null
          notes?: string | null
          operator_id?: string | null
          phone?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_operator_id: string | null
          channel: string
          client_id: string | null
          created_at: string
          id: string
          internal_notes: string | null
          last_message_at: string | null
          status: string
          tags: string[]
        }
        Insert: {
          assigned_operator_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          status?: string
          tags?: string[]
        }
        Update: {
          assigned_operator_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          status?: string
          tags?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_sequences: {
        Row: {
          active: boolean
          conversion_rate: number | null
          created_at: string
          id: string
          messages_sent: number | null
          name: string
          steps: number
          steps_config: Json
          target: string
          trigger_type: string
        }
        Insert: {
          active?: boolean
          conversion_rate?: number | null
          created_at?: string
          id?: string
          messages_sent?: number | null
          name: string
          steps?: number
          steps_config?: Json
          target: string
          trigger_type?: string
        }
        Update: {
          active?: boolean
          conversion_rate?: number | null
          created_at?: string
          id?: string
          messages_sent?: number | null
          name?: string
          steps?: number
          steps_config?: Json
          target?: string
          trigger_type?: string
        }
        Relationships: []
      }
      loyalty_rewards: {
        Row: {
          client_id: string | null
          code: string | null
          created_at: string
          description: string | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          title: string
          used: boolean | null
        }
        Insert: {
          client_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          title: string
          used?: boolean | null
        }
        Update: {
          client_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          title?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      missed_calls: {
        Row: {
          auto_message_sent: boolean | null
          called_at: string
          caller_name: string | null
          client_id: string | null
          conversation_id: string | null
          id: string
          phone: string
          status: string
        }
        Insert: {
          auto_message_sent?: boolean | null
          called_at?: string
          caller_name?: string | null
          client_id?: string | null
          conversation_id?: string | null
          id?: string
          phone: string
          status?: string
        }
        Update: {
          auto_message_sent?: boolean | null
          called_at?: string
          caller_name?: string | null
          client_id?: string | null
          conversation_id?: string | null
          id?: string
          phone?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "missed_calls_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missed_calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_availability: {
        Row: {
          active: boolean
          day_of_week: number
          end_time: string
          id: string
          operator_id: string
          start_time: string
        }
        Insert: {
          active?: boolean
          day_of_week: number
          end_time: string
          id?: string
          operator_id: string
          start_time: string
        }
        Update: {
          active?: boolean
          day_of_week?: number
          end_time?: string
          id?: string
          operator_id?: string
          start_time?: string
        }
        Relationships: []
      }
      operator_visit_durations: {
        Row: {
          id: string
          minutes: number
          operator_id: string
          visit_type: string
        }
        Insert: {
          id?: string
          minutes?: number
          operator_id: string
          visit_type: string
        }
        Update: {
          id?: string
          minutes?: number
          operator_id?: string
          visit_type?: string
        }
        Relationships: []
      }
      operators: {
        Row: {
          avatar_url: string | null
          created_at: string
          departments: string[] | null
          id: string
          name: string
          online: boolean | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          departments?: string[] | null
          id?: string
          name: string
          online?: boolean | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          departments?: string[] | null
          id?: string
          name?: string
          online?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
      patient_blocks: {
        Row: {
          block_number: number
          contacted: number
          created_at: string
          id: string
          scheduled_for: string | null
          status: string
          total: number
        }
        Insert: {
          block_number: number
          contacted?: number
          created_at?: string
          id?: string
          scheduled_for?: string | null
          status?: string
          total?: number
        }
        Update: {
          block_number?: number
          contacted?: number
          created_at?: string
          id?: string
          scheduled_for?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          appointment_id: string | null
          cancellation_state: string | null
          client_id: string | null
          created_at: string
          id: string
          new_appointment_id: string | null
          proposed_slots: Json
          scheduled_at: string
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          cancellation_state?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          new_appointment_id?: string | null
          proposed_slots?: Json
          scheduled_at: string
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          cancellation_state?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          new_appointment_id?: string | null
          proposed_slots?: Json
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      studio_settings: {
        Row: {
          address: string | null
          id: string
          message_templates: Json
          name: string
          opening_hours: Json
          phone: string | null
          updated_at: string
          visit_types: Json
          whatsapp_ai: string | null
          whatsapp_mode: string
          whatsapp_studio: string | null
        }
        Insert: {
          address?: string | null
          id?: string
          message_templates?: Json
          name?: string
          opening_hours?: Json
          phone?: string | null
          updated_at?: string
          visit_types?: Json
          whatsapp_ai?: string | null
          whatsapp_mode?: string
          whatsapp_studio?: string | null
        }
        Update: {
          address?: string | null
          id?: string
          message_templates?: Json
          name?: string
          opening_hours?: Json
          phone?: string | null
          updated_at?: string
          visit_types?: Json
          whatsapp_ai?: string | null
          whatsapp_mode?: string
          whatsapp_studio?: string | null
        }
        Relationships: []
      }
      studios: {
        Row: {
          billing_cycle: string
          created_at: string
          email: string | null
          id: string
          message_tier: number | null
          name: string
          owner_name: string | null
          owner_user_id: string | null
          phone: string | null
          plan: string
          status: string
          subscription_expires_at: string | null
          subscription_started_at: string | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          email?: string | null
          id?: string
          message_tier?: number | null
          name: string
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan?: string
          status?: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          email?: string | null
          id?: string
          message_tier?: number | null
          name?: string
          owner_name?: string | null
          owner_user_id?: string | null
          phone?: string | null
          plan?: string
          status?: string
          subscription_expires_at?: string | null
          subscription_started_at?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_role: string
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_role?: string
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_role?: string
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          status: string
          studio_id: string | null
          subject: string
          ticket_number: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          studio_id?: string | null
          subject: string
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          studio_id?: string | null
          subject?: string
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_offers: {
        Row: {
          appointment_id: string | null
          client_id: string | null
          created_at: string
          discount_percent: number
          expires_at: string
          id: string
          revenue_generated: number | null
          rule_id: string | null
          sent_at: string
          status: string
          treatment: string
          used_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_percent?: number
          expires_at: string
          id?: string
          revenue_generated?: number | null
          rule_id?: string | null
          sent_at?: string
          status?: string
          treatment: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          discount_percent?: number
          expires_at?: string
          id?: string
          revenue_generated?: number | null
          rule_id?: string | null
          sent_at?: string
          status?: string
          treatment?: string
          used_at?: string | null
        }
        Relationships: []
      }
      upsell_rules: {
        Row: {
          active: boolean
          created_at: string
          discount_percent: number
          id: string
          message_template: string | null
          name: string
          threshold: number
          treatment: string
          trigger_type: string
          validity_days: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          message_template?: string | null
          name: string
          threshold?: number
          treatment: string
          trigger_type: string
          validity_days?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          discount_percent?: number
          id?: string
          message_template?: string | null
          name?: string
          threshold?: number
          treatment?: string
          trigger_type?: string
          validity_days?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          studio_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          studio_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          studio_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_any: { Args: { _user_id: string }; Returns: boolean }
      can_manage_studio: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      compute_subscription_expiry: {
        Args: { _cycle: string; _start: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "authorized_admin" | "studio" | "support"
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
      app_role: ["super_admin", "authorized_admin", "studio", "support"],
    },
  },
} as const
