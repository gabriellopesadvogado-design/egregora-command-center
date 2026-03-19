import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
type AvaliacaoReuniao = Database["public"]["Enums"]["avaliacao_reuniao"];
type PlataformaOrigem = Database["public"]["Enums"]["plataforma_origem"];

export interface ForecastFilters {
  startDate?: Date;
  endDate?: Date;
  fonte?: PlataformaOrigem[];
  sdrId?: string;
  closerId?: string;
  qualidade?: AvaliacaoReuniao[];
  status?: MeetingStatus[];
  next14Days?: boolean;
  searchTerm?: string;
}

export interface ForecastProposal {
  id: string;
  nome_lead: string | null;
  closer: { id: string; nome: string } | null;
  sdr: { id: string; nome: string } | null;
  fonte_lead: PlataformaOrigem | null;
  inicio_em: string;
  avaliacao_reuniao: AvaliacaoReuniao | null;
  valor_proposta: number | null;
  valor_fechado: number | null;
  fechado_em: string | null;
  status: MeetingStatus;
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
  return PROBABILITY_MAP[quality];
}

export function useForecast(filters: ForecastFilters = {}) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["forecast", filters, user?.id, role],
    queryFn: async () => {
      // Fetch meetings with status that represents proposals
      let query = supabase
        .from("meetings")
        .select(`
          id,
          nome_lead,
          closer_id,
          sdr_id,
          fonte_lead,
          inicio_em,
          avaliacao_reuniao,
          valor_proposta,
          valor_fechado,
          fechado_em,
          status,
          closer:profiles!meetings_closer_id_fkey(id, nome),
          sdr:profiles!meetings_sdr_id_fkey(id, nome)
        `)
        .in("status", ["proposta_enviada", "ganha", "perdida"]);

      // Apply role-based filtering
      if (role === "closer" && user?.id) {
        query = query.eq("closer_id", user.id);
      }

      const { data: meetings, error } = await query;

      if (error) throw error;

      // Process and calculate derived fields
      const proposals: ForecastProposal[] = (meetings || []).map((meeting) => {
        const proposalDate = new Date(meeting.inicio_em);
        const expectedCloseDate = addDays(proposalDate, 30);
        const probability = getProbability(meeting.avaliacao_reuniao);
        const valorProposta = meeting.valor_proposta || 0;
        const weightedValue = valorProposta * probability;
        
        // For won deals, use valor_fechado; for open proposals, use valor_proposta + quality
        const isGanha = meeting.status === "ganha";
        const isIncomplete = isGanha 
          ? !meeting.valor_fechado  // Won deals need valor_fechado
          : !meeting.valor_proposta || !meeting.avaliacao_reuniao;  // Open proposals need both

        return {
          id: meeting.id,
          nome_lead: meeting.nome_lead,
          closer: meeting.closer,
          sdr: meeting.sdr,
          fonte_lead: meeting.fonte_lead,
          inicio_em: meeting.inicio_em,
          avaliacao_reuniao: meeting.avaliacao_reuniao,
          valor_proposta: meeting.valor_proposta,
          valor_fechado: meeting.valor_fechado,
          fechado_em: meeting.fechado_em,
          status: meeting.status,
          expected_close_date: expectedCloseDate,
          probability,
          weighted_forecast_value: weightedValue,
          isIncomplete,
        };
      });

      // Apply client-side filters
      let filteredProposals = proposals;

      // Date filter
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

      // Fonte filter
      if (filters.fonte && filters.fonte.length > 0) {
        filteredProposals = filteredProposals.filter(
          (p) => p.fonte_lead && filters.fonte!.includes(p.fonte_lead)
        );
      }

      // SDR filter
      if (filters.sdrId) {
        filteredProposals = filteredProposals.filter(
          (p) => p.sdr?.id === filters.sdrId
        );
      }

      // Closer filter
      if (filters.closerId) {
        filteredProposals = filteredProposals.filter(
          (p) => p.closer?.id === filters.closerId
        );
      }

      // Quality filter
      if (filters.qualidade && filters.qualidade.length > 0) {
        filteredProposals = filteredProposals.filter(
          (p) => p.avaliacao_reuniao && filters.qualidade!.includes(p.avaliacao_reuniao)
        );
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        filteredProposals = filteredProposals.filter(
          (p) => filters.status!.includes(p.status)
        );
      }

      // Next 30 days filter
      if (filters.next14Days) {
        const today = new Date();
        const in30Days = addDays(today, 30);
        filteredProposals = filteredProposals.filter(
          (p) => p.status === "proposta_enviada" && 
                 isBefore(p.expected_close_date, in30Days) &&
                 isAfter(p.expected_close_date, today)
        );
      }

      // Search filter
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filteredProposals = filteredProposals.filter(
          (p) =>
            p.nome_lead?.toLowerCase().includes(term) ||
            p.closer?.nome.toLowerCase().includes(term) ||
            p.sdr?.nome.toLowerCase().includes(term)
        );
      }

      // Calculate stats only for open proposals (proposta_enviada)
      const openProposals = filteredProposals.filter(
        (p) => p.status === "proposta_enviada"
      );

      const pipelineTotal = openProposals.reduce(
        (sum, p) => sum + (p.valor_proposta || 0),
        0
      );

      const forecastPonderado = openProposals.reduce(
        (sum, p) => sum + p.weighted_forecast_value,
        0
      );

      const today = new Date();
      const in14Days = addDays(today, 14);
      const in30Days = addDays(today, 30);
      const in60Days = addDays(today, 60);
      const forecast14Dias = openProposals
        .filter((p) => p.expected_close_date <= in14Days)
        .reduce((sum, p) => sum + p.weighted_forecast_value, 0);
      const forecast30Dias = openProposals
        .filter((p) => p.expected_close_date <= in30Days)
        .reduce((sum, p) => sum + p.weighted_forecast_value, 0);
      const forecast60Dias = openProposals
        .filter((p) => p.expected_close_date <= in60Days)
        .reduce((sum, p) => sum + p.weighted_forecast_value, 0);

      const ticketMedio =
        openProposals.length > 0 ? pipelineTotal / openProposals.length : 0;

      const qualityDistribution: QualityDistribution = {
        ruim: { count: 0, value: 0, forecast: 0 },
        neutra: { count: 0, value: 0, forecast: 0 },
        boa: { count: 0, value: 0, forecast: 0 },
      };

      openProposals.forEach((p) => {
        if (p.avaliacao_reuniao && qualityDistribution[p.avaliacao_reuniao]) {
          qualityDistribution[p.avaliacao_reuniao].count++;
          qualityDistribution[p.avaliacao_reuniao].value += p.valor_proposta || 0;
          qualityDistribution[p.avaliacao_reuniao].forecast += p.weighted_forecast_value;
        }
      });

      // Sort: expected_close_date ASC, then weighted_forecast_value DESC
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

      return {
        proposals: filteredProposals,
        stats,
      };
    },
    enabled: !!user && role !== "sdr",
  });
}
