import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmStatus } from "./useMeetings";

export type MeetingStatus = CrmStatus;
export type PlataformaOrigem = string;
export type AvaliacaoReuniao = "boa" | "neutra" | "ruim";

export interface LeadWithMeeting {
  id: string;
  nome: string;
  fonte: string | null;
  status: CrmStatus;
  responsavel: string;
  responsavelTipo: "closer" | "sdr";
  qualificacao: string | null;
  dataUltimaReuniao: string;
  observacao: string | null;
  meetingId: string;
  telefone: string | null;
}

export interface LeadsFilters {
  searchTerm?: string;
  fonte?: string[];
  status?: CrmStatus[];
  startDate?: Date;
  endDate?: Date;
}

export function useLeadsWithMeetings(filters?: LeadsFilters) {
  return useQuery({
    queryKey: ["leads-with-meetings", filters],
    queryFn: async () => {
      const { data: meetings, error } = await supabase
        .from("crm_meetings")
        .select(`
          *,
          closer:core_users!crm_meetings_closer_id_fkey (*),
          sdr:core_users!crm_meetings_sdr_id_fkey (*)
        `)
        .order("data_reuniao", { ascending: false });

      if (error) throw error;

      const leadsMap = new Map<string, LeadWithMeeting>();
      
      (meetings || []).forEach((meeting: any) => {
        const leadName = meeting.nome_lead?.trim();
        if (!leadName) return;
        
        const leadKey = leadName.toLowerCase();
        if (leadsMap.has(leadKey)) return;

        const statusRealizados: CrmStatus[] = ["reuniao_realizada", "proposta_enviada", "fechado", "perdido"];
        const isReunioRealizada = statusRealizados.includes(meeting.status);
        
        const closer = meeting.closer as { nome?: string } | null;
        const sdr = meeting.sdr as { nome?: string } | null;

        leadsMap.set(leadKey, {
          id: leadKey,
          nome: leadName,
          fonte: null,
          status: meeting.status,
          responsavel: isReunioRealizada ? (closer?.nome || "—") : (sdr?.nome || "—"),
          responsavelTipo: isReunioRealizada ? "closer" : "sdr",
          qualificacao: null,
          dataUltimaReuniao: meeting.data_reuniao,
          observacao: meeting.notas,
          meetingId: meeting.id,
          telefone: meeting.telefone_lead || null,
        });
      });

      let leads = Array.from(leadsMap.values());

      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        leads = leads.filter((lead) => lead.nome.toLowerCase().includes(term));
      }
      if (filters?.status && filters.status.length > 0) {
        leads = leads.filter((lead) => filters.status!.includes(lead.status));
      }
      if (filters?.startDate && filters?.endDate) {
        leads = leads.filter((lead) => {
          const dataReuniao = new Date(lead.dataUltimaReuniao);
          return dataReuniao >= filters.startDate! && dataReuniao <= filters.endDate!;
        });
      }

      return leads;
    },
  });
}
