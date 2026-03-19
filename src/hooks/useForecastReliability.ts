import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDays, format, startOfDay, endOfDay, startOfISOWeek, eachDayOfInterval, parseISO } from "date-fns";

export type AvaliacaoReuniao = "boa" | "neutra" | "ruim";
export type PlataformaOrigem = string;

export interface ReliabilityFilters {
  startDate?: Date;
  endDate?: Date;
  fonte?: string[];
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
    .map(([date, values]) => ({ date, forecastValue: values.forecast, realizedValue: values.realized }));
}

export function useForecastReliability(filters: ReliabilityFilters) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["forecast-reliability", filters, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select(`
          id, nome_lead, closer_id, sdr_id, data_reuniao, valor_proposta,
          valor_fechamento, status, data_fechamento,
          closer:core_users!crm_meetings_closer_id_fkey(id, nome),
          sdr:core_users!crm_meetings_sdr_id_fkey(id, nome)
        `)
        .in("status", ["proposta_enviada", "fechado", "perdido"]);

      if (role === "closer" && user?.id) {
        query = query.eq("closer_id", user.id);
      }

      const { data: meetings, error } = await query;
      if (error) throw error;

      const processed = (meetings || []).map((m: any) => {
        const proposalDate = new Date(m.data_reuniao);
        const expectedCloseDate = addDays(proposalDate, 30);
        const probability = 0.25;
        const valorProposta = m.valor_proposta || 0;
        const weightedValue = valorProposta * probability;

        return {
          id: m.id,
          data_reuniao: m.data_reuniao,
          data_fechamento: m.data_fechamento,
          status: m.status,
          valor_proposta: m.valor_proposta,
          valor_fechamento: m.valor_fechamento,
          closer: m.closer,
          sdr: m.sdr,
          expected_close_date: expectedCloseDate,
          weighted_forecast_value: weightedValue,
        };
      });

      let filtered = processed;

      if (filters.sdrId) {
        filtered = filtered.filter((m) => m.sdr?.id === filters.sdrId);
      }
      if (filters.closerId) {
        filtered = filtered.filter((m) => m.closer?.id === filters.closerId);
      }

      const startDate = filters.startDate ? startOfDay(filters.startDate) : startOfDay(addDays(new Date(), -30));
      const endDate = filters.endDate ? endOfDay(filters.endDate) : endOfDay(addDays(new Date(), 30));

      const allDates = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyMap = new Map<string, { forecast: number; realized: number }>();
      allDates.forEach((date) => {
        dailyMap.set(format(date, "yyyy-MM-dd"), { forecast: 0, realized: 0 });
      });

      filtered.forEach((m) => {
        const dateKey = format(m.expected_close_date, "yyyy-MM-dd");
        const existing = dailyMap.get(dateKey);
        if (existing) existing.forecast += m.weighted_forecast_value;
      });

      filtered.forEach((m) => {
        if (m.status === "fechado" && m.data_fechamento) {
          const closeDate = startOfDay(new Date(m.data_fechamento));
          const dateKey = format(closeDate, "yyyy-MM-dd");
          const existing = dailyMap.get(dateKey);
          if (existing) existing.realized += m.valor_fechamento || 0;
        }
      });

      const dailyData: DailyDataPoint[] = allDates.map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const values = dailyMap.get(dateKey) || { forecast: 0, realized: 0 };
        return { date: dateKey, forecastValue: values.forecast, realizedValue: values.realized };
      });

      const weeklyData = aggregateWeekly(dailyData);
      const forecastTotal = dailyData.reduce((sum, d) => sum + d.forecastValue, 0);
      const realizedTotal = dailyData.reduce((sum, d) => sum + d.realizedValue, 0);
      const gap = realizedTotal - forecastTotal;
      const accuracy = forecastTotal > 0 ? realizedTotal / forecastTotal : null;

      return { forecastTotal, realizedTotal, gap, accuracy, dailyData, weeklyData } as ReliabilityStats;
    },
    enabled: !!user && role !== "sdr",
  });
}
