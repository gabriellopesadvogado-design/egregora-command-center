import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate, Database } from "@/integrations/supabase/types";

export type Meeting = Tables<"meetings"> & {
  leads?: Tables<"leads">;
  closer?: Tables<"profiles">;
  sdr?: Tables<"profiles">;
};

export type MeetingInsert = TablesInsert<"meetings">;
export type MeetingUpdate = TablesUpdate<"meetings">;
export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type AvaliacaoReuniao = Database["public"]["Enums"]["avaliacao_reuniao"];
export type PlataformaOrigem = Database["public"]["Enums"]["plataforma_origem"];

export interface MeetingsFilters {
  startDate?: Date;
  endDate?: Date;
  status?: MeetingStatus[];
  plataforma?: PlataformaOrigem[];
  closerId?: string;
  sdrId?: string;
  searchTerm?: string;
}

export function useMeetings(filters?: MeetingsFilters) {
  return useQuery({
    queryKey: ["meetings", filters],
    queryFn: async () => {
      let query = supabase
        .from("meetings")
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!meetings_closer_id_fkey (*),
          sdr:profiles!meetings_sdr_id_fkey (*)
        `)
        .order("inicio_em", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("inicio_em", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("inicio_em", filters.endDate.toISOString());
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }
      if (filters?.closerId) {
        query = query.eq("closer_id", filters.closerId);
      }
      if (filters?.sdrId) {
        query = query.eq("sdr_id", filters.sdrId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let meetings = (data || []) as unknown as Meeting[];

      // Client-side filtering for lead search
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        meetings = meetings.filter((m) =>
          m.nome_lead?.toLowerCase().includes(term) ||
          m.leads?.nome?.toLowerCase().includes(term)
        );
      }
      if (filters?.plataforma && filters.plataforma.length > 0) {
        meetings = meetings.filter((m) =>
          filters.plataforma!.includes(m.leads?.plataforma_origem as PlataformaOrigem)
        );
      }

      return meetings;
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: Omit<MeetingInsert, "sdr_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("meetings")
        .insert({ ...meeting, sdr_id: user.id })
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!meetings_closer_id_fkey (*),
          sdr:profiles!meetings_sdr_id_fkey (*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["leads-with-meetings"] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: MeetingUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("meetings")
        .update(update)
        .eq("id", id)
        .select(`
          *,
          leads:lead_id (*),
          closer:profiles!meetings_closer_id_fkey (*),
          sdr:profiles!meetings_sdr_id_fkey (*)
        `)
        .single();

      if (error) throw error;
      return data as unknown as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["leads-with-meetings"] });
    },
  });
}
