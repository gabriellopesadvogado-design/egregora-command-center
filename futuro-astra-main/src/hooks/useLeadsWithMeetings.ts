import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
export type PlataformaOrigem = Database["public"]["Enums"]["plataforma_origem"];
export type AvaliacaoReuniao = Database["public"]["Enums"]["avaliacao_reuniao"];

export interface LeadWithMeeting {
  id: string;
  nome: string;
  fonte: PlataformaOrigem | null;
  status: MeetingStatus;
  responsavel: string;
  responsavelTipo: "closer" | "sdr";
  qualificacao: AvaliacaoReuniao | null;
  dataUltimaReuniao: string;
  observacao: string | null;
  meetingId: string;
  telefone: string | null;
}

export interface LeadsFilters {
  searchTerm?: string;
  fonte?: PlataformaOrigem[];
  status?: MeetingStatus[];
  startDate?: Date;
  endDate?: Date;
}

export function useLeadsWithMeetings(filters?: LeadsFilters) {
  return useQuery({
    queryKey: ["leads-with-meetings", filters],
    queryFn: async () => {
      const { data: meetings, error } = await supabase
        .from("meetings")
        .select(`
          *,
          closer:profiles!meetings_closer_id_fkey (*),
          sdr:profiles!meetings_sdr_id_fkey (*)
        `)
        .order("inicio_em", { ascending: false });

      if (error) throw error;

      // Agrupar por nome_lead, mantendo apenas a reunião mais recente
      const leadsMap = new Map<string, LeadWithMeeting>();
      
      (meetings || []).forEach((meeting) => {
        const leadName = meeting.nome_lead?.trim();
        if (!leadName) return;
        
        const leadKey = leadName.toLowerCase();
        
        // Já existe um registro para este lead? Manter apenas a reunião mais recente
        if (leadsMap.has(leadKey)) return;

        // Determinar responsável com base no status
        const statusRealizados: MeetingStatus[] = ["aconteceu", "proposta_enviada", "ganha", "perdida"];
        const isReunioRealizada = statusRealizados.includes(meeting.status);
        
        const closer = meeting.closer as { nome?: string } | null;
        const sdr = meeting.sdr as { nome?: string } | null;

        leadsMap.set(leadKey, {
          id: leadKey,
          nome: leadName,
          fonte: meeting.fonte_lead,
          status: meeting.status,
          responsavel: isReunioRealizada 
            ? (closer?.nome || "—") 
            : (sdr?.nome || "—"),
          responsavelTipo: isReunioRealizada ? "closer" : "sdr",
          qualificacao: meeting.avaliacao_reuniao,
          dataUltimaReuniao: meeting.inicio_em,
          observacao: meeting.observacao,
          meetingId: meeting.id,
          telefone: (meeting as any).telefone || null,
        });
      });

      let leads = Array.from(leadsMap.values());

      // Aplicar filtros
      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        leads = leads.filter((lead) => 
          lead.nome.toLowerCase().includes(term)
        );
      }

      if (filters?.fonte && filters.fonte.length > 0) {
        leads = leads.filter((lead) => 
          lead.fonte && filters.fonte!.includes(lead.fonte)
        );
      }

      if (filters?.status && filters.status.length > 0) {
        leads = leads.filter((lead) => 
          filters.status!.includes(lead.status)
        );
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
