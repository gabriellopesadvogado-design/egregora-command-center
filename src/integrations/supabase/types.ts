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
      core_audit_log: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: unknown
          modulo: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown
          modulo: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: unknown
          modulo?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      core_notifications: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          link: string | null
          mensagem: string | null
          modulo_origem: string | null
          tipo: string | null
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string | null
          modulo_origem?: string | null
          tipo?: string | null
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          link?: string | null
          mensagem?: string | null
          modulo_origem?: string | null
          tipo?: string | null
          titulo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      core_permissions: {
        Row: {
          created_at: string | null
          id: string
          modulo: string
          pode_criar: boolean | null
          pode_deletar: boolean | null
          pode_editar: boolean | null
          pode_ler: boolean | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          modulo: string
          pode_criar?: boolean | null
          pode_deletar?: boolean | null
          pode_editar?: boolean | null
          pode_ler?: boolean | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          modulo?: string
          pode_criar?: boolean | null
          pode_deletar?: boolean | null
          pode_editar?: boolean | null
          pode_ler?: boolean | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "core_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      core_roles: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      core_users: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string
          created_at: string | null
          elevenlabs_voice_id: string | null
          email: string
          hubspot_owner_id: number | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo: string
          created_at?: string | null
          elevenlabs_voice_id?: string | null
          email: string
          hubspot_owner_id?: number | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string
          created_at?: string | null
          elevenlabs_voice_id?: string | null
          email?: string
          hubspot_owner_id?: number | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_channel_costs: {
        Row: {
          canal: string
          cpl_calculado: number | null
          created_at: string | null
          custo_total: number
          id: string
          leads_gerados: number | null
          mes: string
        }
        Insert: {
          canal: string
          cpl_calculado?: number | null
          created_at?: string | null
          custo_total: number
          id?: string
          leads_gerados?: number | null
          mes: string
        }
        Update: {
          canal?: string
          cpl_calculado?: number | null
          created_at?: string | null
          custo_total?: number
          id?: string
          leads_gerados?: number | null
          mes?: string
        }
        Relationships: []
      }
      crm_followup_steps: {
        Row: {
          canal_entrega: Database["public"]["Enums"]["crm_canal_entrega"] | null
          created_at: string | null
          data_execucao: string | null
          data_programada: string
          id: string
          meeting_id: string | null
          mensagem_enviada: string | null
          notas: string | null
          responsavel_id: string | null
          script_personalizado: string | null
          status: Database["public"]["Enums"]["crm_followup_status"] | null
          step_nome: string
          step_ordem: number
          updated_at: string | null
          voz_id: string | null
        }
        Insert: {
          canal_entrega?:
            | Database["public"]["Enums"]["crm_canal_entrega"]
            | null
          created_at?: string | null
          data_execucao?: string | null
          data_programada: string
          id?: string
          meeting_id?: string | null
          mensagem_enviada?: string | null
          notas?: string | null
          responsavel_id?: string | null
          script_personalizado?: string | null
          status?: Database["public"]["Enums"]["crm_followup_status"] | null
          step_nome: string
          step_ordem: number
          updated_at?: string | null
          voz_id?: string | null
        }
        Update: {
          canal_entrega?:
            | Database["public"]["Enums"]["crm_canal_entrega"]
            | null
          created_at?: string | null
          data_execucao?: string | null
          data_programada?: string
          id?: string
          meeting_id?: string | null
          mensagem_enviada?: string | null
          notas?: string | null
          responsavel_id?: string | null
          script_personalizado?: string | null
          status?: Database["public"]["Enums"]["crm_followup_status"] | null
          step_nome?: string
          step_ordem?: number
          updated_at?: string | null
          voz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_steps_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followup_steps_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_hubspot_reativacao_map: {
        Row: {
          faixa: string
          hubspot_pipeline_id: string | null
          hubspot_stage_id: string
          hubspot_stage_name: string
          id: string
        }
        Insert: {
          faixa: string
          hubspot_pipeline_id?: string | null
          hubspot_stage_id: string
          hubspot_stage_name: string
          id?: string
        }
        Update: {
          faixa?: string
          hubspot_pipeline_id?: string | null
          hubspot_stage_id?: string
          hubspot_stage_name?: string
          id?: string
        }
        Relationships: []
      }
      crm_hubspot_stage_map: {
        Row: {
          astra_status: Database["public"]["Enums"]["crm_status"]
          hubspot_stage_id: string
          hubspot_stage_name: string
          id: string
        }
        Insert: {
          astra_status: Database["public"]["Enums"]["crm_status"]
          hubspot_stage_id: string
          hubspot_stage_name: string
          id?: string
        }
        Update: {
          astra_status?: Database["public"]["Enums"]["crm_status"]
          hubspot_stage_id?: string
          hubspot_stage_name?: string
          id?: string
        }
        Relationships: []
      }
      crm_leads: {
        Row: {
          campanha: string | null
          canal: string | null
          created_at: string | null
          email: string | null
          hubspot_contact_id: string | null
          id: string
          nacionalidade: string | null
          nome: string
          origem: string | null
          pais_residencia: string | null
          telefone: string | null
          tipo_interesse: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          whatsapp: string | null
        }
        Insert: {
          campanha?: string | null
          canal?: string | null
          created_at?: string | null
          email?: string | null
          hubspot_contact_id?: string | null
          id?: string
          nacionalidade?: string | null
          nome: string
          origem?: string | null
          pais_residencia?: string | null
          telefone?: string | null
          tipo_interesse?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Update: {
          campanha?: string | null
          canal?: string | null
          created_at?: string | null
          email?: string | null
          hubspot_contact_id?: string | null
          id?: string
          nacionalidade?: string | null
          nome?: string
          origem?: string | null
          pais_residencia?: string | null
          telefone?: string | null
          tipo_interesse?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      crm_meetings: {
        Row: {
          avaliacao_reuniao: string | null
          closer_id: string | null
          created_at: string | null
          data_fechamento: string | null
          data_proposta: string | null
          data_reuniao: string | null
          email_lead: string | null
          hubspot_deal_id: string | null
          hubspot_owner_id: number | null
          id: string
          lead_id: string | null
          motivo_perda: string | null
          nacionalidade: string | null
          nome_lead: string
          notas: string | null
          sdr_id: string | null
          status: Database["public"]["Enums"]["crm_status"] | null
          status_anterior: Database["public"]["Enums"]["crm_status"] | null
          telefone_lead: string | null
          tipo_servico: string | null
          updated_at: string | null
          valor_fechamento: number | null
          valor_proposta: number | null
          whatsapp_lead: string | null
        }
        Insert: {
          avaliacao_reuniao?: string | null
          closer_id?: string | null
          created_at?: string | null
          data_fechamento?: string | null
          data_proposta?: string | null
          data_reuniao?: string | null
          email_lead?: string | null
          hubspot_deal_id?: string | null
          hubspot_owner_id?: number | null
          id?: string
          lead_id?: string | null
          motivo_perda?: string | null
          nacionalidade?: string | null
          nome_lead: string
          notas?: string | null
          sdr_id?: string | null
          status?: Database["public"]["Enums"]["crm_status"] | null
          status_anterior?: Database["public"]["Enums"]["crm_status"] | null
          telefone_lead?: string | null
          tipo_servico?: string | null
          updated_at?: string | null
          valor_fechamento?: number | null
          valor_proposta?: number | null
          whatsapp_lead?: string | null
        }
        Update: {
          avaliacao_reuniao?: string | null
          closer_id?: string | null
          created_at?: string | null
          data_fechamento?: string | null
          data_proposta?: string | null
          data_reuniao?: string | null
          email_lead?: string | null
          hubspot_deal_id?: string | null
          hubspot_owner_id?: number | null
          id?: string
          lead_id?: string | null
          motivo_perda?: string | null
          nacionalidade?: string | null
          nome_lead?: string
          notas?: string | null
          sdr_id?: string | null
          status?: Database["public"]["Enums"]["crm_status"] | null
          status_anterior?: Database["public"]["Enums"]["crm_status"] | null
          telefone_lead?: string | null
          tipo_servico?: string | null
          updated_at?: string | null
          valor_fechamento?: number | null
          valor_proposta?: number | null
          whatsapp_lead?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_monthly_targets: {
        Row: {
          created_at: string | null
          id: string
          mes: string
          meta_fechamentos: number | null
          meta_propostas: number | null
          meta_reunioes: number | null
          meta_valor: number | null
          realizado_fechamentos: number | null
          realizado_propostas: number | null
          realizado_reunioes: number | null
          realizado_valor: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mes: string
          meta_fechamentos?: number | null
          meta_propostas?: number | null
          meta_reunioes?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_propostas?: number | null
          realizado_reunioes?: number | null
          realizado_valor?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mes?: string
          meta_fechamentos?: number | null
          meta_propostas?: number | null
          meta_reunioes?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_propostas?: number | null
          realizado_reunioes?: number | null
          realizado_valor?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_monthly_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_motivos_perda: {
        Row: {
          created_at: string | null
          dias_minimos_reativacao: number
          id: string
          motivo: string
          reativavel: boolean
        }
        Insert: {
          created_at?: string | null
          dias_minimos_reativacao?: number
          id?: string
          motivo: string
          reativavel?: boolean
        }
        Update: {
          created_at?: string | null
          dias_minimos_reativacao?: number
          id?: string
          motivo?: string
          reativavel?: boolean
        }
        Relationships: []
      }
      crm_notas: {
        Row: {
          conteudo: string
          created_at: string | null
          id: string
          meeting_id: string
          sincronizado_hubspot: boolean | null
          tipo: string
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          id?: string
          meeting_id: string
          sincronizado_hubspot?: boolean | null
          tipo?: string
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          id?: string
          meeting_id?: string
          sincronizado_hubspot?: boolean | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notas_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_proposals: {
        Row: {
          created_at: string | null
          data_envio: string | null
          data_resposta: string | null
          descricao: string | null
          id: string
          lead_id: string | null
          meeting_id: string | null
          moeda: string | null
          status: string | null
          tipo_servico: string
          updated_at: string | null
          validade_dias: number | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          meeting_id?: string | null
          moeda?: string | null
          status?: string | null
          tipo_servico: string
          updated_at?: string | null
          validade_dias?: number | null
          valor: number
        }
        Update: {
          created_at?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string | null
          meeting_id?: string | null
          moeda?: string | null
          status?: string | null
          tipo_servico?: string
          updated_at?: string | null
          validade_dias?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_proposals_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reativacoes: {
        Row: {
          created_at: string | null
          data_perda: string
          data_reativacao: string | null
          faixa_reativacao: string
          id: string
          meeting_id: string
          motivo_perda_original: string
          notas_reativacao: string | null
          responsavel_reativacao_id: string
          resultado: string
        }
        Insert: {
          created_at?: string | null
          data_perda: string
          data_reativacao?: string | null
          faixa_reativacao: string
          id?: string
          meeting_id: string
          motivo_perda_original: string
          notas_reativacao?: string | null
          responsavel_reativacao_id: string
          resultado?: string
        }
        Update: {
          created_at?: string | null
          data_perda?: string
          data_reativacao?: string | null
          faixa_reativacao?: string
          id?: string
          meeting_id?: string
          motivo_perda_original?: string
          notas_reativacao?: string | null
          responsavel_reativacao_id?: string
          resultado?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reativacoes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_wbr_ai_reports: {
        Row: {
          conteudo_markdown: string
          created_at: string | null
          custo_estimado: number | null
          dados_fonte: Json | null
          enviado_email: boolean | null
          id: string
          modelo_usado: string | null
          semana_fim: string
          semana_inicio: string
          tokens_usados: number | null
        }
        Insert: {
          conteudo_markdown: string
          created_at?: string | null
          custo_estimado?: number | null
          dados_fonte?: Json | null
          enviado_email?: boolean | null
          id?: string
          modelo_usado?: string | null
          semana_fim: string
          semana_inicio: string
          tokens_usados?: number | null
        }
        Update: {
          conteudo_markdown?: string
          created_at?: string | null
          custo_estimado?: number | null
          dados_fonte?: Json | null
          enviado_email?: boolean | null
          id?: string
          modelo_usado?: string | null
          semana_fim?: string
          semana_inicio?: string
          tokens_usados?: number | null
        }
        Relationships: []
      }
      crm_weekly_targets: {
        Row: {
          created_at: string | null
          id: string
          meta_fechamentos: number | null
          meta_propostas: number | null
          meta_reunioes: number | null
          meta_valor: number | null
          realizado_fechamentos: number | null
          realizado_propostas: number | null
          realizado_reunioes: number | null
          realizado_valor: number | null
          semana_inicio: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta_fechamentos?: number | null
          meta_propostas?: number | null
          meta_reunioes?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_propostas?: number | null
          realizado_reunioes?: number | null
          realizado_valor?: number | null
          semana_inicio: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meta_fechamentos?: number | null
          meta_propostas?: number | null
          meta_reunioes?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_propostas?: number | null
          realizado_reunioes?: number | null
          realizado_valor?: number | null
          semana_inicio?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_weekly_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_yearly_targets: {
        Row: {
          ano: number
          created_at: string | null
          id: string
          meta_fechamentos: number | null
          meta_valor: number | null
          realizado_fechamentos: number | null
          realizado_valor: number | null
          user_id: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          id?: string
          meta_fechamentos?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_valor?: number | null
          user_id?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          id?: string
          meta_fechamentos?: number | null
          meta_valor?: number | null
          realizado_fechamentos?: number | null
          realizado_valor?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_yearly_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "core_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_ad_sets: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          nome: string
          orcamento_diario: number | null
          plataforma_id: string | null
          segmentacao: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          nome: string
          orcamento_diario?: number | null
          plataforma_id?: string | null
          segmentacao?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          orcamento_diario?: number | null
          plataforma_id?: string | null
          segmentacao?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mkt_ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_campaigns: {
        Row: {
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
          notas: string | null
          objetivo: string | null
          orcamento_diario: number | null
          orcamento_total: number | null
          plataforma: string
          plataforma_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
          notas?: string | null
          objetivo?: string | null
          orcamento_diario?: number | null
          orcamento_total?: number | null
          plataforma: string
          plataforma_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
          notas?: string | null
          objetivo?: string | null
          orcamento_diario?: number | null
          orcamento_total?: number | null
          plataforma?: string
          plataforma_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mkt_channel_costs: {
        Row: {
          canal: string
          cliques_total: number | null
          cpl_medio: number | null
          created_at: string | null
          custo_total: number | null
          id: string
          impressoes_total: number | null
          leads_total: number | null
          mes: string
        }
        Insert: {
          canal: string
          cliques_total?: number | null
          cpl_medio?: number | null
          created_at?: string | null
          custo_total?: number | null
          id?: string
          impressoes_total?: number | null
          leads_total?: number | null
          mes: string
        }
        Update: {
          canal?: string
          cliques_total?: number | null
          cpl_medio?: number | null
          created_at?: string | null
          custo_total?: number | null
          id?: string
          impressoes_total?: number | null
          leads_total?: number | null
          mes?: string
        }
        Relationships: []
      }
      mkt_creatives: {
        Row: {
          ad_set_id: string | null
          arquivo_url: string | null
          copy_principal: string | null
          copy_titulo: string | null
          created_at: string | null
          cta: string | null
          formato: string | null
          id: string
          nome: string
          status: string | null
          updated_at: string | null
          url_destino: string | null
          url_preview: string | null
        }
        Insert: {
          ad_set_id?: string | null
          arquivo_url?: string | null
          copy_principal?: string | null
          copy_titulo?: string | null
          created_at?: string | null
          cta?: string | null
          formato?: string | null
          id?: string
          nome: string
          status?: string | null
          updated_at?: string | null
          url_destino?: string | null
          url_preview?: string | null
        }
        Update: {
          ad_set_id?: string | null
          arquivo_url?: string | null
          copy_principal?: string | null
          copy_titulo?: string | null
          created_at?: string | null
          cta?: string | null
          formato?: string | null
          id?: string
          nome?: string
          status?: string | null
          updated_at?: string | null
          url_destino?: string | null
          url_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mkt_creatives_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "mkt_ad_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      mkt_results: {
        Row: {
          ad_set_id: string | null
          campaign_id: string | null
          cliques: number | null
          conversoes: number | null
          cpc: number | null
          cpl: number | null
          created_at: string | null
          creative_id: string | null
          ctr: number | null
          custo: number | null
          data: string
          id: string
          impressoes: number | null
          leads: number | null
          receita_atribuida: number | null
          roas: number | null
        }
        Insert: {
          ad_set_id?: string | null
          campaign_id?: string | null
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string | null
          creative_id?: string | null
          ctr?: number | null
          custo?: number | null
          data: string
          id?: string
          impressoes?: number | null
          leads?: number | null
          receita_atribuida?: number | null
          roas?: number | null
        }
        Update: {
          ad_set_id?: string | null
          campaign_id?: string | null
          cliques?: number | null
          conversoes?: number | null
          cpc?: number | null
          cpl?: number | null
          created_at?: string | null
          creative_id?: string | null
          ctr?: number | null
          custo?: number | null
          data?: string
          id?: string
          impressoes?: number | null
          leads?: number | null
          receita_atribuida?: number | null
          roas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mkt_results_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "mkt_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_results_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "mkt_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mkt_results_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "mkt_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_gestor: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      crm_canal_entrega: "texto" | "audio" | "texto_e_audio"
      crm_followup_status:
        | "pendente"
        | "enviado"
        | "respondido"
        | "cancelado"
        | "pulado"
      crm_status:
        | "novo_lead"
        | "qualificado"
        | "nao_elegivel"
        | "elegivel"
        | "reuniao_agendada"
        | "reuniao_realizada"
        | "proposta_enviada"
        | "followup_ativo"
        | "contrato_enviado"
        | "fechado"
        | "perdido"
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
      crm_canal_entrega: ["texto", "audio", "texto_e_audio"],
      crm_followup_status: [
        "pendente",
        "enviado",
        "respondido",
        "cancelado",
        "pulado",
      ],
      crm_status: [
        "novo_lead",
        "qualificado",
        "nao_elegivel",
        "elegivel",
        "reuniao_agendada",
        "reuniao_realizada",
        "proposta_enviada",
        "followup_ativo",
        "contrato_enviado",
        "fechado",
        "perdido",
      ],
    },
  },
} as const
