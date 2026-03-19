import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type LeadRow = Tables<"crm_leads">;

export type LeadStatus = "sem_reuniao" | "em_pipeline" | "nao_elegivel" | "fechado" | "perdido";

export interface LeadWithStatus extends LeadRow {
  leadStatus: LeadStatus;
  meetingId?: string;
  meetingStatus?: string;
}

export interface LeadsPageFilters {
  searchTerm?: string;
  origem?: string;
  canal?: string;
  tipoInteresse?: string;
  periodStart?: string;
  periodEnd?: string;
  sdrId?: string;
}

const PAGE_SIZE = 25;

export function useLeadsPage(filters: LeadsPageFilters, page: number) {
  return useQuery({
    queryKey: ["leads-page", filters, page],
    queryFn: async () => {
      // 1. Build leads query
      let query = supabase
        .from("crm_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (filters.searchTerm) {
        query = query.or(
          `nome.ilike.%${filters.searchTerm}%,telefone.ilike.%${filters.searchTerm}%,whatsapp.ilike.%${filters.searchTerm}%`
        );
      }
      if (filters.origem) query = query.eq("origem", filters.origem);
      if (filters.canal) query = query.eq("canal", filters.canal);
      if (filters.tipoInteresse) query = query.eq("tipo_interesse", filters.tipoInteresse);
      if (filters.periodStart) query = query.gte("created_at", filters.periodStart);
      if (filters.periodEnd) query = query.lte("created_at", filters.periodEnd);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: leads, error, count } = await query;
      if (error) throw error;
      if (!leads || leads.length === 0) {
        return { leads: [] as LeadWithStatus[], totalCount: count ?? 0, noMeetingCount: 0 };
      }

      // 2. Fetch meetings for these leads
      const leadIds = leads.map((l) => l.id);
      const { data: meetings } = await supabase
        .from("crm_meetings")
        .select("id, lead_id, status, sdr_id")
        .in("lead_id", leadIds);

      // 3. Map meetings by lead_id (pick most relevant)
      const meetingsByLead = new Map<string, { id: string; status: string; sdr_id: string | null }>();
      (meetings || []).forEach((m: any) => {
        if (!m.lead_id) return;
        const existing = meetingsByLead.get(m.lead_id);
        // Keep the "best" status: fechado > em_pipeline > nao_elegivel > perdido
        if (!existing) {
          meetingsByLead.set(m.lead_id, m);
        } else {
          const priority: Record<string, number> = { fechado: 4, perdido: 1, nao_elegivel: 0 };
          const existingPri = priority[existing.status] ?? 2;
          const newPri = priority[m.status] ?? 2;
          if (newPri > existingPri) meetingsByLead.set(m.lead_id, m);
        }
      });

      // 4. Map leads with status
      let leadsWithStatus: LeadWithStatus[] = leads.map((lead) => {
        const meeting = meetingsByLead.get(lead.id);
        let leadStatus: LeadStatus = "sem_reuniao";
        if (meeting) {
          if (meeting.status === "fechado") leadStatus = "fechado";
          else if (meeting.status === "perdido") leadStatus = "perdido";
          else if (meeting.status === "nao_elegivel") leadStatus = "nao_elegivel";
          else leadStatus = "em_pipeline";
        }
        return {
          ...lead,
          leadStatus,
          meetingId: meeting?.id,
          meetingStatus: meeting?.status,
        };
      });

      // 5. SDR filter (client-side on meeting's sdr_id)
      if (filters.sdrId) {
        const sdrLeadIds = new Set(
          (meetings || []).filter((m: any) => m.sdr_id === filters.sdrId).map((m: any) => m.lead_id)
        );
        leadsWithStatus = leadsWithStatus.filter((l) => sdrLeadIds.has(l.id));
      }

      // 6. Count leads without meetings (separate lightweight query)
      const { count: noMeetingCount } = await supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true })
        .filter("id", "not.in", `(${(meetings || []).filter((m: any) => m.lead_id).map((m: any) => m.lead_id).join(",")})`);

      return {
        leads: leadsWithStatus,
        totalCount: count ?? 0,
        noMeetingCount: noMeetingCount ?? 0,
      };
    },
  });
}

export function useNoMeetingCount() {
  return useQuery({
    queryKey: ["leads-no-meeting-count"],
    queryFn: async () => {
      // Get all lead IDs that have at least one meeting
      const { data: meetingLeadIds } = await supabase
        .from("crm_meetings")
        .select("lead_id");

      const idsWithMeeting = new Set(
        (meetingLeadIds || []).map((m: any) => m.lead_id).filter(Boolean)
      );

      const { count } = await supabase
        .from("crm_leads")
        .select("id", { count: "exact", head: true });

      return (count ?? 0) - idsWithMeeting.size;
    },
  });
}

export function useSDRs() {
  return useQuery({
    queryKey: ["sdrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("id, nome")
        .eq("cargo", "sdr")
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClosersAndAdmins() {
  return useQuery({
    queryKey: ["closers-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("id, nome, cargo")
        .in("cargo", ["closer", "admin", "gestor"])
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
  });
}
