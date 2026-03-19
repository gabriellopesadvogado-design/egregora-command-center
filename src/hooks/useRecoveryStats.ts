import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecoveryStats {
  totalCanceladasNoShow: number;
  recuperadas: number;
  percentual: number;
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
  plataforma?: string[];
}

export function useRecoveryStats(filters?: RecoveryStatsFilters) {
  return useQuery({
    queryKey: ["recovery-stats", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select("id, nome_lead, lead_id, status, data_reuniao, closer_id, sdr_id")
        .order("data_reuniao", { ascending: true });

      if (filters?.startDate) query = query.gte("data_reuniao", filters.startDate.toISOString());
      if (filters?.endDate) query = query.lte("data_reuniao", filters.endDate.toISOString());
      if (filters?.closerId) query = query.eq("closer_id", filters.closerId);
      if (filters?.sdrId) query = query.eq("sdr_id", filters.sdrId);

      const { data: meetings, error } = await query;
      if (error) throw error;

      const allMeetings = meetings || [];
      const totalReunioes = allMeetings.length;
      const totalCanceladas = allMeetings.filter((m) => m.status === "perdido").length;

      const leadGroups = new Map<string, typeof allMeetings>();
      for (const meeting of allMeetings) {
        const key = meeting.lead_id || meeting.nome_lead || meeting.id;
        if (!leadGroups.has(key)) leadGroups.set(key, []);
        leadGroups.get(key)!.push(meeting);
      }

      let totalCanceladasNoShow = totalCanceladas;
      let recuperadas = 0;
      const successStatuses = ["reuniao_realizada", "proposta_enviada", "fechado"];

      for (const [, leadMeetings] of leadGroups) {
        const sorted = leadMeetings.sort((a, b) => new Date(a.data_reuniao!).getTime() - new Date(b.data_reuniao!).getTime());
        let hadFailure = false;
        let hadSuccessAfterFailure = false;

        for (const meeting of sorted) {
          if (meeting.status === "perdido") hadFailure = true;
          else if (hadFailure && successStatuses.includes(meeting.status!)) hadSuccessAfterFailure = true;
        }
        if (hadSuccessAfterFailure) recuperadas++;
      }

      return {
        totalCanceladasNoShow,
        recuperadas,
        percentual: totalCanceladasNoShow > 0 ? Math.round((recuperadas / totalCanceladasNoShow) * 100) : 0,
        totalNoShow: 0,
        totalCanceladas,
        taxaNoShow: 0,
        totalReunioes,
      } as RecoveryStats;
    },
  });
}
