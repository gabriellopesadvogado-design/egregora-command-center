import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, format, startOfDay, endOfDay, startOfISOWeek, eachDayOfInterval, parseISO } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
type AvaliacaoReuniao = Database["public"]["Enums"]["avaliacao_reuniao"];
type PlataformaOrigem = Database["public"]["Enums"]["plataforma_origem"];

export interface ReliabilityFilters {
  startDate?: Date;
  endDate?: Date;
  fonte?: PlataformaOrigem[];
  sdrId?: string;
  closerId?: string;
  qualidade?: AvaliacaoReuniao[];
}

export interface DailyDataPoint {
  date: string;
  forecastValue: number;
  realizedValue: number;
}

export interface ReliabilityStats {
  forecastTotal: number;
  realizedTotal: number;
  gap: number;
  accuracy: number | null;
  dailyData: DailyDataPoint[];
  weeklyData: DailyDataPoint[];
}

const PROBABILITY_MAP: Record<AvaliacaoReuniao, number> = {
  ruim: 0.10,
  neutra: 0.25,
  boa: 0.50,
};

function getProbability(quality: AvaliacaoReuniao | null): number {
  if (!quality) return 0;
  return PROBABILITY_MAP[quality];
}

function aggregateWeekly(dailyData: DailyDataPoint[]): DailyDataPoint[] {
  const weeklyMap = new Map<string, { forecast: number; realized: number }>();

  dailyData.forEach((point) => {
    const weekStart = format(startOfISOWeek(parseISO(point.date)), "yyyy-MM-dd");
    const existing = weeklyMap.get(weekStart) || { forecast: 0, realized: 0 };
    weeklyMap.set(weekStart, {
      forecast: existing.forecast + point.forecastValue,
      realized: existing.realized + point.realizedValue,
    });
  });

  return Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date,
      forecastValue: values.forecast,
      realizedValue: values.realized,
    }));
}

export function useForecastReliability(filters: ReliabilityFilters) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["forecast-reliability", filters, user?.id, role],
    queryFn: async () => {
      // Fetch meetings with status proposta_enviada or ganha
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
          status,
          fechado_em,
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

      // Process meetings
      interface ProcessedMeeting {
        id: string;
        inicio_em: string;
        fechado_em: string | null;
        status: MeetingStatus;
        valor_proposta: number | null;
        valor_fechado: number | null;
        avaliacao_reuniao: AvaliacaoReuniao | null;
        fonte_lead: PlataformaOrigem | null;
        closer: { id: string; nome: string } | null;
        sdr: { id: string; nome: string } | null;
        expected_close_date: Date;
        probability: number;
        weighted_forecast_value: number;
      }

      const processed: ProcessedMeeting[] = (meetings || []).map((m) => {
        const proposalDate = new Date(m.inicio_em);
        const expectedCloseDate = addDays(proposalDate, 30);
        const probability = getProbability(m.avaliacao_reuniao);
        const valorProposta = m.valor_proposta || 0;
        const weightedValue = valorProposta * probability;

        return {
          id: m.id,
          inicio_em: m.inicio_em,
          fechado_em: m.fechado_em,
          status: m.status,
          valor_proposta: m.valor_proposta,
          valor_fechado: m.valor_fechado,
          avaliacao_reuniao: m.avaliacao_reuniao,
          fonte_lead: m.fonte_lead,
          closer: m.closer,
          sdr: m.sdr,
          expected_close_date: expectedCloseDate,
          probability,
          weighted_forecast_value: weightedValue,
        };
      });

      // Apply client-side filters
      let filtered = processed;

      // Fonte filter
      if (filters.fonte && filters.fonte.length > 0) {
        filtered = filtered.filter(
          (m) => m.fonte_lead && filters.fonte!.includes(m.fonte_lead)
        );
      }

      // SDR filter
      if (filters.sdrId) {
        filtered = filtered.filter((m) => m.sdr?.id === filters.sdrId);
      }

      // Closer filter
      if (filters.closerId) {
        filtered = filtered.filter((m) => m.closer?.id === filters.closerId);
      }

      // Quality filter
      if (filters.qualidade && filters.qualidade.length > 0) {
        filtered = filtered.filter(
          (m) => m.avaliacao_reuniao && filters.qualidade!.includes(m.avaliacao_reuniao)
        );
      }

      // Determine date range
      const startDate = filters.startDate
        ? startOfDay(filters.startDate)
        : startOfDay(addDays(new Date(), -30));
      const endDate = filters.endDate
        ? endOfDay(filters.endDate)
        : endOfDay(addDays(new Date(), 30));

      // Build daily data map
      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyMap = new Map<string, { forecast: number; realized: number }>();

      allDates.forEach((date) => {
        dailyMap.set(format(date, "yyyy-MM-dd"), { forecast: 0, realized: 0 });
      });

      // Forecast series: group by expected_close_date (include proposta_enviada and ganha)
      filtered.forEach((m) => {
        const dateKey = format(m.expected_close_date, "yyyy-MM-dd");
        const existing = dailyMap.get(dateKey);
        if (existing) {
          existing.forecast += m.weighted_forecast_value;
        }
      });

      // Realized series: group by fechado_em (only ganha) - use valor_fechado (net value)
      filtered.forEach((m) => {
        if (m.status === "ganha" && m.fechado_em) {
          const closeDate = startOfDay(new Date(m.fechado_em));
          const dateKey = format(closeDate, "yyyy-MM-dd");
          const existing = dailyMap.get(dateKey);
          if (existing) {
            existing.realized += m.valor_fechado || 0;
          }
        }
      });

      // Build daily data array
      const dailyData: DailyDataPoint[] = allDates.map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const values = dailyMap.get(dateKey) || { forecast: 0, realized: 0 };
        return {
          date: dateKey,
          forecastValue: values.forecast,
          realizedValue: values.realized,
        };
      });

      // Aggregate weekly
      const weeklyData = aggregateWeekly(dailyData);

      // Calculate totals
      const forecastTotal = dailyData.reduce((sum, d) => sum + d.forecastValue, 0);
      const realizedTotal = dailyData.reduce((sum, d) => sum + d.realizedValue, 0);
      const gap = realizedTotal - forecastTotal;
      const accuracy = forecastTotal > 0 ? realizedTotal / forecastTotal : null;

      return {
        forecastTotal,
        realizedTotal,
        gap,
        accuracy,
        dailyData,
        weeklyData,
      } as ReliabilityStats;
    },
    enabled: !!user && role !== "sdr",
  });
}
