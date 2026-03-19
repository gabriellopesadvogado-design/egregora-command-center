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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      channel_costs: {
        Row: {
          canal: Database["public"]["Enums"]["plataforma_origem"]
          created_at: string | null
          id: string
          investimento: number
          periodo_fim: string
          periodo_inicio: string
        }
        Insert: {
          canal: Database["public"]["Enums"]["plataforma_origem"]
          created_at?: string | null
          id?: string
          investimento?: number
          periodo_fim: string
          periodo_inicio: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["plataforma_origem"]
          created_at?: string | null
          id?: string
          investimento?: number
          periodo_fim?: string
          periodo_inicio?: string
        }
        Relationships: []
      }
      followup_steps: {
        Row: {
          canal: Database["public"]["Enums"]["followup_canal"]
          closer_id: string
          codigo: string | null
          criado_em: string
          data_prevista: string
          executado_em: string | null
          id: string
          manual_titulo: string | null
          meeting_id: string
          notas: string | null
          status: Database["public"]["Enums"]["followup_status"]
          tipo: string
        }
        Insert: {
          canal?: Database["public"]["Enums"]["followup_canal"]
          closer_id: string
          codigo?: string | null
          criado_em?: string
          data_prevista: string
          executado_em?: string | null
          id?: string
          manual_titulo?: string | null
          meeting_id: string
          notas?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          tipo?: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["followup_canal"]
          closer_id?: string
          codigo?: string | null
          criado_em?: string
          data_prevista?: string
          executado_em?: string | null
          id?: string
          manual_titulo?: string | null
          meeting_id?: string
          notas?: string | null
          status?: Database["public"]["Enums"]["followup_status"]
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_steps_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_steps_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          nome: string
          plataforma_origem: Database["public"]["Enums"]["plataforma_origem"]
          sdr_id: string
          telefone: string | null
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id?: string
          nome: string
          plataforma_origem?: Database["public"]["Enums"]["plataforma_origem"]
          sdr_id: string
          telefone?: string | null
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string
          plataforma_origem?: Database["public"]["Enums"]["plataforma_origem"]
          sdr_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          avaliacao_reuniao:
            | Database["public"]["Enums"]["avaliacao_reuniao"]
            | null
          caixa_gerado: number | null
          closer_id: string
          criado_em: string
          fechado_em: string | null
          fonte_lead: Database["public"]["Enums"]["plataforma_origem"] | null
          id: string
          inicio_em: string
          lead_id: string | null
          motivo_perda: string | null
          nome_lead: string | null
          observacao: string | null
          perda_tipo: string | null
          primeiro_followup_em: string | null
          sdr_id: string
          status: Database["public"]["Enums"]["meeting_status"]
          telefone: string | null
          valor_fechado: number | null
          valor_proposta: number | null
        }
        Insert: {
          avaliacao_reuniao?:
            | Database["public"]["Enums"]["avaliacao_reuniao"]
            | null
          caixa_gerado?: number | null
          closer_id: string
          criado_em?: string
          fechado_em?: string | null
          fonte_lead?: Database["public"]["Enums"]["plataforma_origem"] | null
          id?: string
          inicio_em: string
          lead_id?: string | null
          motivo_perda?: string | null
          nome_lead?: string | null
          observacao?: string | null
          perda_tipo?: string | null
          primeiro_followup_em?: string | null
          sdr_id: string
          status?: Database["public"]["Enums"]["meeting_status"]
          telefone?: string | null
          valor_fechado?: number | null
          valor_proposta?: number | null
        }
        Update: {
          avaliacao_reuniao?:
            | Database["public"]["Enums"]["avaliacao_reuniao"]
            | null
          caixa_gerado?: number | null
          closer_id?: string
          criado_em?: string
          fechado_em?: string | null
          fonte_lead?: Database["public"]["Enums"]["plataforma_origem"] | null
          id?: string
          inicio_em?: string
          lead_id?: string | null
          motivo_perda?: string | null
          nome_lead?: string | null
          observacao?: string | null
          perda_tipo?: string | null
          primeiro_followup_em?: string | null
          sdr_id?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          telefone?: string | null
          valor_fechado?: number | null
          valor_proposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_targets: {
        Row: {
          criado_em: string
          criado_por: string
          id: string
          mes_ano: string
          meta_faturamento: number
        }
        Insert: {
          criado_em?: string
          criado_por: string
          id?: string
          mes_ano: string
          meta_faturamento: number
        }
        Update: {
          criado_em?: string
          criado_por?: string
          id?: string
          mes_ano?: string
          meta_faturamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_targets_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          enviado_em: string
          id: string
          lida: boolean
          meeting_id: string | null
          mensagem: string | null
          tipo: Database["public"]["Enums"]["notification_tipo"]
          titulo: string
          user_id: string
        }
        Insert: {
          enviado_em?: string
          id?: string
          lida?: boolean
          meeting_id?: string | null
          mensagem?: string | null
          tipo: Database["public"]["Enums"]["notification_tipo"]
          titulo: string
          user_id: string
        }
        Update: {
          enviado_em?: string
          id?: string
          lida?: boolean
          meeting_id?: string | null
          mensagem?: string | null
          tipo?: Database["public"]["Enums"]["notification_tipo"]
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      proposal_documents: {
        Row: {
          created_at: string
          created_by: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          lead_id: string | null
          mime_type: string
          payment_mode: string | null
          payment_text: string | null
          proposal_id: string | null
          total_final: number | null
          total_original: number | null
          validity_date: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string
          payment_mode?: string | null
          payment_text?: string | null
          proposal_id?: string | null
          total_final?: number | null
          total_original?: number | null
          validity_date?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          lead_id?: string | null
          mime_type?: string
          payment_mode?: string | null
          payment_text?: string | null
          proposal_id?: string | null
          total_final?: number | null
          total_original?: number | null
          validity_date?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          caixa_gerado: number | null
          closer_id: string
          criado_em: string
          fechado_em: string | null
          id: string
          lead_id: string
          meeting_id: string | null
          motivo_perda: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          valor_fechado: number | null
          valor_proposto: number | null
        }
        Insert: {
          caixa_gerado?: number | null
          closer_id: string
          criado_em?: string
          fechado_em?: string | null
          id?: string
          lead_id: string
          meeting_id?: string | null
          motivo_perda?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          valor_fechado?: number | null
          valor_proposto?: number | null
        }
        Update: {
          caixa_gerado?: number | null
          closer_id?: string
          criado_em?: string
          fechado_em?: string | null
          id?: string
          lead_id?: string
          meeting_id?: string | null
          motivo_perda?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          valor_fechado?: number | null
          valor_proposto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
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
      wbr_ai_reports: {
        Row: {
          ai_output_json: Json
          created_at: string
          created_by: string
          date_end: string
          date_start: string
          id: string
          manual_inputs_json: Json | null
          premium_mode: boolean
          report_context_snapshot: Json | null
          report_type: string
        }
        Insert: {
          ai_output_json: Json
          created_at?: string
          created_by: string
          date_end: string
          date_start: string
          id?: string
          manual_inputs_json?: Json | null
          premium_mode?: boolean
          report_context_snapshot?: Json | null
          report_type: string
        }
        Update: {
          ai_output_json?: Json
          created_at?: string
          created_by?: string
          date_end?: string
          date_start?: string
          id?: string
          manual_inputs_json?: Json | null
          premium_mode?: boolean
          report_context_snapshot?: Json | null
          report_type?: string
        }
        Relationships: []
      }
      weekly_targets: {
        Row: {
          criado_em: string
          criado_por: string
          id: string
          meta_fechamentos_qtd: number
          meta_fechamentos_valor: number | null
          meta_reunioes_realizadas: number | null
          semana_fim: string
          semana_inicio: string
        }
        Insert: {
          criado_em?: string
          criado_por: string
          id?: string
          meta_fechamentos_qtd: number
          meta_fechamentos_valor?: number | null
          meta_reunioes_realizadas?: number | null
          semana_fim: string
          semana_inicio: string
        }
        Update: {
          criado_em?: string
          criado_por?: string
          id?: string
          meta_fechamentos_qtd?: number
          meta_fechamentos_valor?: number | null
          meta_reunioes_realizadas?: number | null
          semana_fim?: string
          semana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_targets_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yearly_targets: {
        Row: {
          ano: number
          criado_em: string
          criado_por: string
          id: string
          meta_faturamento: number
        }
        Insert: {
          ano: number
          criado_em?: string
          criado_por: string
          id?: string
          meta_faturamento: number
        }
        Update: {
          ano?: number
          criado_em?: string
          criado_por?: string
          id?: string
          meta_faturamento?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearly_targets_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      followup_compliance_by_closer: {
        Args: { p_end: string; p_include_ignored?: boolean; p_start: string }
        Returns: {
          closer_id: string
          closer_nome: string
          compliance: number
          done_total: number
          due_total: number
          overdue_total: number
        }[]
      }
      get_followup_counts: {
        Args: { p_meeting_ids: string[] }
        Returns: {
          atrasados: number
          hoje: number
          meeting_id: string
          total_pendentes: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
      roi_por_canal: {
        Args: { p_fim: string; p_inicio: string }
        Returns: {
          cac_aprox: number
          canal: Database["public"]["Enums"]["plataforma_origem"]
          deals_ganhos: number
          investimento: number
          receita: number
          roas: number
          roi: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "sdr" | "closer"
      avaliacao_reuniao: "boa" | "neutra" | "ruim"
      followup_canal: "ligacao" | "whatsapp"
      followup_status: "pendente" | "feito" | "ignorado"
      meeting_status:
        | "agendada"
        | "aconteceu"
        | "proposta_enviada"
        | "ganha"
        | "perdida"
        | "no_show"
        | "cancelada"
      notification_tipo:
        | "lembrete_sdr"
        | "lembrete_closer_5min"
        | "lembrete_closer_agora"
      plataforma_origem:
        | "google"
        | "meta"
        | "outros"
        | "blog"
        | "organico"
        | "indicacao"
        | "reativacao"
      proposal_status: "aberta" | "follow_up" | "ganha" | "perdida"
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
      app_role: ["admin", "manager", "sdr", "closer"],
      avaliacao_reuniao: ["boa", "neutra", "ruim"],
      followup_canal: ["ligacao", "whatsapp"],
      followup_status: ["pendente", "feito", "ignorado"],
      meeting_status: [
        "agendada",
        "aconteceu",
        "proposta_enviada",
        "ganha",
        "perdida",
        "no_show",
        "cancelada",
      ],
      notification_tipo: [
        "lembrete_sdr",
        "lembrete_closer_5min",
        "lembrete_closer_agora",
      ],
      plataforma_origem: [
        "google",
        "meta",
        "outros",
        "blog",
        "organico",
        "indicacao",
        "reativacao",
      ],
      proposal_status: ["aberta", "follow_up", "ganha", "perdida"],
    },
  },
} as const
