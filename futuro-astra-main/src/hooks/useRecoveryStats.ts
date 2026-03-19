import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlataformaOrigem } from "./useMeetings";

export interface RecoveryStats {
  totalCanceladasNoShow: number;
  recuperadas: number;
  percentual: number;
  // Novas métricas de No Show
  totalNoShow: number;
  totalCanceladas: number;
  taxaNoShow: number;
  totalReunioes: number;
}

export interface RecoveryStatsFilters {
  startDate?: Date;
  endDate?: Date;
  closerId?: string;
  sdrId?: string;
  plataforma?: PlataformaOrigem[];
}

export function useRecoveryStats(filters?: RecoveryStatsFilters) {
  return useQuery({
    queryKey: ["recovery-stats", filters],
    queryFn: async () => {
      // Get all meetings with filters
      let query = supabase
        .from("meetings")
        .select("id, nome_lead, lead_id, status, inicio_em, closer_id, sdr_id, fonte_lead")
        .order("inicio_em", { ascending: true });

      // Apply filters
      if (filters?.startDate) {
        query = query.gte("inicio_em", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("inicio_em", filters.endDate.toISOString());
      }
      if (filters?.closerId) {
        query = query.eq("closer_id", filters.closerId);
      }
      if (filters?.sdrId) {
        query = query.eq("sdr_id", filters.sdrId);
      }
      if (filters?.plataforma && filters.plataforma.length > 0) {
        query = query.in("fonte_lead", filters.plataforma);
      }

      const { data: meetings, error } = await query;

      if (error) throw error;

      const allMeetings = meetings || [];
      const totalReunioes = allMeetings.length;

      // Count No Shows and Canceladas
      let totalNoShow = 0;
      let totalCanceladas = 0;

      for (const meeting of allMeetings) {
        if (meeting.status === "no_show") totalNoShow++;
        if (meeting.status === "cancelada") totalCanceladas++;
      }

      // Group by lead (using nome_lead or lead_id)
      const leadGroups = new Map<string, typeof allMeetings>();

      for (const meeting of allMeetings) {
        const key = meeting.lead_id || meeting.nome_lead || meeting.id;
        if (!leadGroups.has(key)) {
          leadGroups.set(key, []);
        }
        leadGroups.get(key)!.push(meeting);
      }

      let totalCanceladasNoShow = 0;
      let recuperadas = 0;

      const successStatuses = ["aconteceu", "proposta_enviada", "ganha"];
      const failureStatuses = ["cancelada", "no_show"];

      for (const [, leadMeetings] of leadGroups) {
        // Sort by date
        const sorted = leadMeetings.sort(
          (a, b) => new Date(a.inicio_em).getTime() - new Date(b.inicio_em).getTime()
        );

        let hadFailure = false;
        let hadSuccessAfterFailure = false;

        for (const meeting of sorted) {
          if (failureStatuses.includes(meeting.status)) {
            hadFailure = true;
            totalCanceladasNoShow++;
          } else if (hadFailure && successStatuses.includes(meeting.status)) {
            hadSuccessAfterFailure = true;
          }
        }

        if (hadSuccessAfterFailure) {
          recuperadas++;
        }
      }

      const percentual = totalCanceladasNoShow > 0
        ? Math.round((recuperadas / totalCanceladasNoShow) * 100)
        : 0;

      const taxaNoShow = totalReunioes > 0
        ? Math.round((totalNoShow / totalReunioes) * 100)
        : 0;

      return {
        totalCanceladasNoShow,
        recuperadas,
        percentual,
        totalNoShow,
        totalCanceladas,
        taxaNoShow,
        totalReunioes,
      } as RecoveryStats;
    },
  });
}
