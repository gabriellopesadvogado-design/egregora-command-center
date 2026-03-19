import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate, Database } from "@/integrations/supabase/types";

export type CrmStatus = Database["public"]["Enums"]["crm_status"];

// Local type aliases for backward compat
export type MeetingStatus = CrmStatus;
export type AvaliacaoReuniao = "boa" | "neutra" | "ruim";
export type PlataformaOrigem = "google" | "meta" | "blog" | "organico" | "indicacao" | "reativacao" | "outros";

export type Meeting = Tables<"crm_meetings"> & {
  leads?: Tables<"crm_leads"> | null;
  closer?: Tables<"core_users"> | null;
  sdr?: Tables<"core_users"> | null;
  // virtual fields for compat
  inicio_em?: string | null;
  fechado_em?: string | null;
  valor_fechado?: number | null;
  criado_em?: string | null;
  observacao?: string | null;
  fonte_lead?: string | null;
  avaliacao_reuniao?: string | null;
  caixa_gerado?: number | null;
  telefone?: string | null;
};

export type MeetingInsert = any;
export type MeetingUpdate = TablesUpdate<"crm_meetings">;

export interface MeetingsFilters {
  startDate?: Date;
  endDate?: Date;
  status?: CrmStatus[];
  plataforma?: string[];
  closerId?: string;
  sdrId?: string;
  searchTerm?: string;
}

function enrichMeeting(raw: any): Meeting {
  return {
    ...raw,
    inicio_em: raw.data_reuniao,
    fechado_em: raw.data_fechamento,
    valor_fechado: raw.valor_fechamento,
    criado_em: raw.created_at,
    observacao: raw.notas,
    fonte_lead: null,
    avaliacao_reuniao: null,
    caixa_gerado: null,
    telefone: raw.telefone_lead,
  };
}

export function useMeetings(filters?: MeetingsFilters) {
  return useQuery({
    queryKey: ["meetings", filters],
    queryFn: async () => {
      let query = supabase
        .from("crm_meetings")
        .select(`
          *,
          leads:lead_id (*)  ,
          closer:core_users!crm_meetings_closer_id_fkey (*),
          sdr:core_users!crm_meetings_sdr_id_fkey (*)
        `)
        .order("data_reuniao", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("data_reuniao", filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte("data_reuniao", filters.endDate.toISOString());
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

      let meetings = ((data || []) as any[]).map(enrichMeeting);

      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        meetings = meetings.filter((m) =>
          m.nome_lead?.toLowerCase().includes(term) ||
          m.leads?.nome?.toLowerCase().includes(term)
        );
      }

      return meetings;
    },
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meeting: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("crm_meetings")
        .insert({ ...meeting, sdr_id: user.id })
        .select(`
          *,
          leads:lead_id (*),
          closer:core_users!crm_meetings_closer_id_fkey (*),
          sdr:core_users!crm_meetings_sdr_id_fkey (*)
        `)
        .single();

      if (error) throw error;
      return enrichMeeting(data);
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
    mutationFn: async ({ id, ...update }: any) => {
      // Map compat fields to real columns
      const mapped: any = { ...update };
      if ('valor_fechado' in mapped) {
        mapped.valor_fechamento = mapped.valor_fechado;
        delete mapped.valor_fechado;
      }
      if ('fechado_em' in mapped) {
        mapped.data_fechamento = mapped.fechado_em;
        delete mapped.fechado_em;
      }
      if ('telefone' in mapped) {
        mapped.telefone_lead = mapped.telefone;
        delete mapped.telefone;
      }
      // Remove fields that don't exist in the table
      delete mapped.caixa_gerado;
      delete mapped.fonte_lead;
      delete mapped.avaliacao_reuniao;
      delete mapped.primeiro_followup_em;
      delete mapped.observacao;

      const { data, error } = await supabase
        .from("crm_meetings")
        .update(mapped)
        .eq("id", id)
        .select(`
          *,
          leads:lead_id (*),
          closer:core_users!crm_meetings_closer_id_fkey (*),
          sdr:core_users!crm_meetings_sdr_id_fkey (*)
        `)
        .single();

      if (error) throw error;
      return enrichMeeting(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["leads-with-meetings"] });
    },
  });
}
