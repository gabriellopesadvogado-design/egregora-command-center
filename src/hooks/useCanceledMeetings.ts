import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Meeting, PlataformaOrigem } from "./useMeetings";

export interface CanceledMeetingsFilters {
  startDate?: Date;
  endDate?: Date;
  closerId?: string;
  sdrId?: string;
  plataforma?: PlataformaOrigem[];
}

export function useCanceledMeetings(filters?: CanceledMeetingsFilters) {
  return useQuery({
    queryKey: ["meetings", "canceled", filters],
    queryFn: async () => {
      let query = supabase
        .from("meetings")
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!meetings_closer_id_fkey (*),
          sdr:profiles!meetings_sdr_id_fkey (*)
        `)
        .in("status", ["cancelada", "no_show"])
        .order("inicio_em", { ascending: false });

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

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as Meeting[];
    },
  });
}
