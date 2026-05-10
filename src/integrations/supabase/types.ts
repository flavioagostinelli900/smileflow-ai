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
