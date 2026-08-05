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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      child_audit_logs: {
        Row: {
          action: string
          child_user_id: string
          created_at: string
          details: Json | null
          device: string | null
          id: string
          ip_address: string | null
          module: string | null
          parent_user_id: string
        }
        Insert: {
          action: string
          child_user_id: string
          created_at?: string
          details?: Json | null
          device?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          parent_user_id: string
        }
        Update: {
          action?: string
          child_user_id?: string
          created_at?: string
          details?: Json | null
          device?: string | null
          id?: string
          ip_address?: string | null
          module?: string | null
          parent_user_id?: string
        }
        Relationships: []
      }
      child_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          child_user_id: string
          created_at: string
          id: string
          module: string
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          child_user_id: string
          created_at?: string
          id?: string
          module: string
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          child_user_id?: string
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_permissions_child_user_id_fkey"
            columns: ["child_user_id"]
            isOneToOne: false
            referencedRelation: "child_users"
            referencedColumns: ["id"]
          },
        ]
      }
      child_sessions: {
        Row: {
          child_user_id: string
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          login_at: string
          logout_at: string | null
          parent_user_id: string
        }
        Insert: {
          child_user_id: string
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          parent_user_id: string
        }
        Update: {
          child_user_id?: string
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string
          logout_at?: string | null
          parent_user_id?: string
        }
        Relationships: []
      }
      child_users: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_disabled: boolean
          mobile: string
          parent_user_id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_disabled?: boolean
          mobile: string
          parent_user_id: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_disabled?: boolean
          mobile?: string
          parent_user_id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          age: number | null
          area: string | null
          created_at: string
          father_name: string | null
          id: string
          name: string
          phone: string
          photo_url: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          age?: number | null
          area?: string | null
          created_at?: string
          father_name?: string | null
          id?: string
          name: string
          phone: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          age?: number | null
          area?: string | null
          created_at?: string
          father_name?: string | null
          id?: string
          name?: string
          phone?: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jama_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_date: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_date?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_date?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jama_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_disabled: boolean
          owner_name: string
          phone: string
          shop_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_disabled?: boolean
          owner_name: string
          phone: string
          shop_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_disabled?: boolean
          owner_name?: string
          phone?: string
          shop_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          area: string
          completed_date: string | null
          created_at: string
          customer_id: string | null
          customer_name: string
          date: string
          father_name: string | null
          gold_amount: number | null
          gold_item_name: string | null
          gold_rate: number | null
          gold_weight: string | null
          id: string
          interest_rate: number | null
          item_name: string
          item_type: Database["public"]["Enums"]["item_type"]
          loan_type: string | null
          phone: string
          photo_url: string | null
          principal_amount: number | null
          reminder_date: string | null
          reminder_sent: boolean
          serial_no: string
          silver_amount: number | null
          silver_item_name: string | null
          silver_rate: number | null
          silver_weight: string | null
          status: string
          user_id: string
          weight: string
        }
        Insert: {
          amount?: number
          area: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          date: string
          father_name?: string | null
          gold_amount?: number | null
          gold_item_name?: string | null
          gold_rate?: number | null
          gold_weight?: string | null
          id?: string
          interest_rate?: number | null
          item_name: string
          item_type: Database["public"]["Enums"]["item_type"]
          loan_type?: string | null
          phone: string
          photo_url?: string | null
          principal_amount?: number | null
          reminder_date?: string | null
          reminder_sent?: boolean
          serial_no: string
          silver_amount?: number | null
          silver_item_name?: string | null
          silver_rate?: number | null
          silver_weight?: string | null
          status?: string
          user_id: string
          weight: string
        }
        Update: {
          amount?: number
          area?: string
          completed_date?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          date?: string
          father_name?: string | null
          gold_amount?: number | null
          gold_item_name?: string | null
          gold_rate?: number | null
          gold_weight?: string | null
          id?: string
          interest_rate?: number | null
          item_name?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          loan_type?: string | null
          phone?: string
          photo_url?: string | null
          principal_amount?: number | null
          reminder_date?: string | null
          reminder_sent?: boolean
          serial_no?: string
          silver_amount?: number | null
          silver_item_name?: string | null
          silver_rate?: number | null
          silver_weight?: string | null
          status?: string
          user_id?: string
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      child_can: {
        Args: { _action: string; _module: string; _uid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _uid: string }; Returns: boolean }
      is_child_user: { Args: { _uid: string }; Returns: boolean }
      next_serial_no: { Args: { _uid: string }; Returns: number }
      parent_owner_id: { Args: { _uid: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      item_type: "gold" | "silver" | "combination"
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
      app_role: ["admin", "user"],
      item_type: ["gold", "silver", "combination"],
    },
  },
} as const
