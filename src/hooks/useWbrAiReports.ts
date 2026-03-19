import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrafficSpend {
  level: "plataforma" | "campanha" | "adgroup";
  google_total?: number;
  meta_total?: number;
  google_by_campaign?: Array<{ campaign_name: string; spend_rs: number }>;
  meta_by_campaign?: Array<{ campaign_name: string; spend_rs: number }>;
  google_by_adgroup?: Array<{ campaign_name: string; adgroup_name: string; spend_rs: number }>;
  meta_by_adset?: Array<{ campaign_name: string; adset_name: string; spend_rs: number }>;
}

export interface SqlInputs {
  level: "plataforma" | "campanha" | "adgroup";
  google_total?: number;
  meta_total?: number;
  by_campaign?: Array<{ platform: string; campaign_name: string; sql_count: number }>;
  by_adgroup_adset?: Array<{ platform: string; campaign_name: string; adgroup_or_adset_name: string; sql_count: number }>;
}

export interface ManualInputs {
  traffic_spend?: TrafficSpend | null;
  sql?: SqlInputs | null;
  observacoes_do_gestor?: string;
}

export interface GenerateReportParams {
  report_type: "WBR_SEMANAL" | "ANALISE_MENSAL";
  date_start: string;
  date_end: string;
  premium_mode: boolean;
  manual_inputs: ManualInputs;
}

export interface MetasSemanais {
  meta_reunioes: number | null;
  reunioes_realizadas: number;
  percentual_reunioes: number;
  meta_contratos: number | null;
  contratos_fechados: number;
  percentual_contratos: number;
}

export interface DadosFixos {
  periodo: { inicio: string; fim: string };
  reunioes: {
    total_realizadas: number;
    meta_reunioes: number | null;
    percentual_meta: number;
    por_origem: Array<{ origem: string; qtd: number; percentual: number }>;
    por_closer: Array<{ nome: string; qtd: number }>;
  };
  propostas_enviadas: {
    total: number;
    por_closer: Array<{ nome: string; qtd: number }>;
    por_origem: Array<{ origem: string; qtd: number }>;
  };
  propostas_em_aberto: {
    total: number;
    valor_bruto: number;
    por_closer: Array<{ nome: string; qtd: number; valor: number }>;
    por_origem: Array<{ origem: string; qtd: number; valor: number }>;
  };
  fechamentos: {
    total_contratos: number;
    valor_fechado: number;
    caixa_gerado: number;
    por_closer: Array<{ nome: string; qtd: number; valor_fechado: number; caixa_gerado: number }>;
    por_origem: Array<{ origem: string; qtd: number; valor_fechado: number }>;
  };
  meta_mensal: {
    meta_faturamento: number | null;
    realizado: number;
    percentual_atingimento: number;
    meta_contratos: number | null;
    contratos_fechados: number;
    percentual_contratos: number;
  };
  metas_semanais?: MetasSemanais | null;
  tempo_medio_fechamento: number | null;
  forecast: {
    valor_bruto_pipeline: number;
    forecast_ponderado: number;
    forecast_14_dias: number;
    forecast_30_dias: number;
    forecast_60_dias: number;
    aging: { verde: number; amarelo: number; vermelho: number };
  };
  sdrs: {
    por_sdr: Array<{
      nome: string;
      total_agendadas: number;
      ganhas: number;
      taxa_conversao: number;
      no_shows: number;
      taxa_no_show: number;
      qualidade: { boa: number; neutra: number; ruim: number };
      percentual_qualidade: { boa: number; neutra: number; ruim: number };
    }>;
  };
}

export interface AiReportOutput {
  ata: {
    periodo: string;
    resumo_executivo: string;
    metricas_principais: Array<{ metrica: string; valor: string; vs_meta: string | null }>;
    destaques_positivos: string[];
    pontos_de_atencao: string[];
  };
  analise_gestor: {
    performance_geral: string;
    analise_por_fonte: Array<{ fonte: string; insight: string }>;
    analise_por_sdr: Array<{ nome: string; insight: string }>;
    analise_por_closer: Array<{ nome: string; insight: string }>;
    analise_pipeline: string;
    hipoteses: string[];
    evidencias: string[];
  };
  plano_de_acao: {
    acoes: Array<{ id: number; acao: string; responsavel_sugerido: string; prazo: string; metrica_sucesso: string }>;
  };
  limitacoes_dos_dados: string[];
  checks_qualidade: { campos_ausentes: string[]; inconsistencias: string[] };
}

export interface FullReport {
  dados_fixos: DadosFixos;
  ai_output: AiReportOutput;
}

export interface WbrAiReport {
  id: string;
  report_type: string;
  date_start: string;
  date_end: string;
  premium_mode: boolean;
  manual_inputs_json: ManualInputs | null;
  report_context_snapshot: Record<string, unknown> | null;
  ai_output_json: AiReportOutput;
  created_by: string;
  created_at: string;
}

export function useGenerateWbrReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateReportParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-wbr-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao gerar relatório");
      return data as { success: boolean; report: AiReportOutput; dados_fixos: DadosFixos; context: Record<string, unknown>; model_used: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wbr-ai-reports"] });
      toast({ title: "Relatório gerado!", description: "A IA processou os dados e gerou a análise." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao gerar relatório", description: error.message, variant: "destructive" });
    },
  });
}

export function useWbrReportHistory() {
  return useQuery({
    queryKey: ["wbr-ai-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_wbr_ai_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        report_type: "",
        date_start: r.semana_inicio,
        date_end: r.semana_fim,
        premium_mode: false,
        manual_inputs_json: null,
        report_context_snapshot: r.dados_fonte as Record<string, unknown>,
        ai_output_json: {} as AiReportOutput,
        created_by: "",
        created_at: r.created_at,
      })) as WbrAiReport[];
    },
  });
}

export function useWbrReport(reportId: string | null) {
  return useQuery({
    queryKey: ["wbr-ai-report", reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from("crm_wbr_ai_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;
      return data as unknown as WbrAiReport;
    },
    enabled: !!reportId,
  });
}

export function useDeleteWbrReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("crm_wbr_ai_reports")
        .delete()
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wbr-ai-reports"] });
      toast({ title: "Relatório excluído", description: "O relatório foi removido do histórico." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });
}

export function extractDadosFixos(report: WbrAiReport): DadosFixos | null {
  const snapshot = report.report_context_snapshot;
  if (snapshot?.dados_fixos) return snapshot.dados_fixos as DadosFixos;
  if (snapshot?.breakdowns) return snapshot.breakdowns as DadosFixos;
  return null;
}
