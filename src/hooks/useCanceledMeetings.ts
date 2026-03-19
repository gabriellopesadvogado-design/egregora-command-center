import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Meeting } from "./useMeetings";

export interface CanceledMeetingsFilters {
  startDate?: Date;
  endDate?: Date;
  closerId?: string;
  sdrId?: string;
  plataforma?: string[];
}

export function useCanceledMeetings(filters?: CanceledMeetingsFilters) {
  return useQuery({
    queryKey: ["meetings", "canceled", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select(`
          *,
          leads:lead_id (*),
          closer:core_users!crm_meetings_closer_id_fkey (*),
          sdr:core_users!crm_meetings_sdr_id_fkey (*)
        `)
        .eq("status", "perdido")
        .order("data_reuniao", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("data_reuniao", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("data_reuniao", filters.endDate.toISOString());
      }
      if (filters?.closerId) {
        query = query.eq("closer_id", filters.closerId);
      }
      if (filters?.sdrId) {
        query = query.eq("sdr_id", filters.sdrId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return ((data || []) as any[]).map((raw) => ({
        ...raw,
        inicio_em: raw.data_reuniao,
        fechado_em: raw.data_fechamento,
        valor_fechado: raw.valor_fechamento,
        criado_em: raw.created_at,
        observacao: raw.notas,
        fonte_lead: null,
        telefone: raw.telefone_lead,
      })) as Meeting[];
    },
  });
}
