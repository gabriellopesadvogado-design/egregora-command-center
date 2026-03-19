import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

export type AvaliacaoReuniao = "boa" | "neutra" | "ruim";
export type PlataformaOrigem = string;

export interface ForecastFilters {
  startDate?: Date;
  endDate?: Date;
  fonte?: string[];
  sdrId?: string;
  closerId?: string;
  qualidade?: AvaliacaoReuniao[];
  status?: string[];
  next14Days?: boolean;
  searchTerm?: string;
}

export interface ForecastProposal {
  id: string;
  nome_lead: string | null;
  closer: { id: string; nome: string } | null;
  sdr: { id: string; nome: string } | null;
  fonte_lead: string | null;
  inicio_em: string;
  avaliacao_reuniao: AvaliacaoReuniao | null;
  valor_proposta: number | null;
  valor_fechado: number | null;
  fechado_em: string | null;
  status: string;
  expected_close_date: Date;
  probability: number;
  weighted_forecast_value: number;
  isIncomplete: boolean;
}

export interface QualityDistribution {
  ruim: { count: number; value: number; forecast: number };
  neutra: { count: number; value: number; forecast: number };
  boa: { count: number; value: number; forecast: number };
}

export interface ForecastStats {
  pipelineTotal: number;
  forecastPonderado: number;
  forecast14Dias: number;
  forecast30Dias: number;
  forecast60Dias: number;
  ticketMedio: number;
  proposalCount: number;
  qualityDistribution: QualityDistribution;
}

const PROBABILITY_MAP: Record<AvaliacaoReuniao, number> = {
  ruim: 0.10,
  neutra: 0.25,
  boa: 0.50,
};

const QUALITY_LABEL_MAP: Record<AvaliacaoReuniao, string> = {
  ruim: "Ruim",
  neutra: "Bom",
  boa: "Muito Bom",
};

export function getQualityLabel(quality: AvaliacaoReuniao | null): string {
  if (!quality) return "Não qualificado";
  return QUALITY_LABEL_MAP[quality];
}

export function getProbability(quality: AvaliacaoReuniao | null): number {
  if (!quality) return 0;
  return PROBABILITY_MAP[quality] || 0;
}

export function useForecast(filters: ForecastFilters = {}) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["forecast", filters, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select(`
          id, nome_lead, closer_id, sdr_id, data_reuniao, valor_proposta,
          valor_fechamento, data_fechamento, status,
          closer:core_users!crm_meetings_closer_id_fkey(id, nome),
          sdr:core_users!crm_meetings_sdr_id_fkey(id, nome)
        `)
        .in("status", ["proposta_enviada", "fechado", "perdido"]);

      if (role === "closer" && user?.id) {
        query = query.eq("closer_id", user.id);
      }

      const { data: meetings, error } = await query;
      if (error) throw error;

      const proposals: ForecastProposal[] = (meetings || []).map((m: any) => {
        const proposalDate = new Date(m.data_reuniao);
        const expectedCloseDate = addDays(proposalDate, 30);
        const probability = 0.25; // default since avaliacao_reuniao doesn't exist
        const valorProposta = m.valor_proposta || 0;
        const weightedValue = valorProposta * probability;
        
        const isFechado = m.status === "fechado";
        const isIncomplete = isFechado
          ? !m.valor_fechamento
          : !m.valor_proposta;

        return {
          id: m.id,
          nome_lead: m.nome_lead,
          closer: m.closer,
          sdr: m.sdr,
          fonte_lead: null,
          inicio_em: m.data_reuniao,
          avaliacao_reuniao: null,
          valor_proposta: m.valor_proposta,
          valor_fechado: m.valor_fechamento,
          fechado_em: m.data_fechamento,
          status: m.status,
          expected_close_date: expectedCloseDate,
          probability,
          weighted_forecast_value: weightedValue,
          isIncomplete,
        };
      });

      let filteredProposals = proposals;

      if (filters.startDate) {
        filteredProposals = filteredProposals.filter(
          (p) => new Date(p.inicio_em) >= startOfDay(filters.startDate!)
        );
      }
      if (filters.endDate) {
        filteredProposals = filteredProposals.filter(
          (p) => new Date(p.inicio_em) <= endOfDay(filters.endDate!)
        );
      }
      if (filters.sdrId) {
        filteredProposals = filteredProposals.filter((p) => p.sdr?.id === filters.sdrId);
      }
      if (filters.closerId) {
        filteredProposals = filteredProposals.filter((p) => p.closer?.id === filters.closerId);
      }
      if (filters.status && filters.status.length > 0) {
        filteredProposals = filteredProposals.filter((p) => filters.status!.includes(p.status));
      }
      if (filters.next14Days) {
        const today = new Date();
        const in30Days = addDays(today, 30);
        filteredProposals = filteredProposals.filter(
          (p) => p.status === "proposta_enviada" &&
                 isBefore(p.expected_close_date, in30Days) &&
                 isAfter(p.expected_close_date, today)
        );
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredProposals = filteredProposals.filter(
          (p) =>
            p.nome_lead?.toLowerCase().includes(term) ||
            p.closer?.nome.toLowerCase().includes(term) ||
            p.sdr?.nome.toLowerCase().includes(term)
        );
      }

      const openProposals = filteredProposals.filter((p) => p.status === "proposta_enviada");
      const pipelineTotal = openProposals.reduce((sum, p) => sum + (p.valor_proposta || 0), 0);
      const forecastPonderado = openProposals.reduce((sum, p) => sum + p.weighted_forecast_value, 0);

      const today = new Date();
      const in14Days = addDays(today, 14);
      const in30Days = addDays(today, 30);
      const in60Days = addDays(today, 60);

      const forecast14Dias = openProposals.filter((p) => p.expected_close_date <= in14Days).reduce((sum, p) => sum + p.weighted_forecast_value, 0);
      const forecast30Dias = openProposals.filter((p) => p.expected_close_date <= in30Days).reduce((sum, p) => sum + p.weighted_forecast_value, 0);
      const forecast60Dias = openProposals.filter((p) => p.expected_close_date <= in60Days).reduce((sum, p) => sum + p.weighted_forecast_value, 0);

      const ticketMedio = openProposals.length > 0 ? pipelineTotal / openProposals.length : 0;

      const qualityDistribution: QualityDistribution = {
        ruim: { count: 0, value: 0, forecast: 0 },
        neutra: { count: openProposals.length, value: pipelineTotal, forecast: forecastPonderado },
        boa: { count: 0, value: 0, forecast: 0 },
      };

      filteredProposals.sort((a, b) => {
        const dateCompare = a.expected_close_date.getTime() - b.expected_close_date.getTime();
        if (dateCompare !== 0) return dateCompare;
        return b.weighted_forecast_value - a.weighted_forecast_value;
      });

      const stats: ForecastStats = {
        pipelineTotal,
        forecastPonderado,
        forecast14Dias,
        forecast30Dias,
        forecast60Dias,
        ticketMedio,
        proposalCount: openProposals.length,
        qualityDistribution,
      };

      return { proposals: filteredProposals, stats };
    },
    enabled: !!user && role !== "sdr",
  });
}
