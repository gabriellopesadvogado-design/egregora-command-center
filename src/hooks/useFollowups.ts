import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export type FollowupStep = {
  id: string;
  meeting_id: string;
  closer_id: string;
  canal: string;
  codigo: string | null;
  data_prevista: string;
  status: string;
  notas: string | null;
  executado_em: string | null;
  criado_em: string;
  tipo: string;
  manual_titulo: string | null;
  meeting: {
    nome_lead: string | null;
    status: string;
    telefone: string | null;
    avaliacao_reuniao: string | null;
    perda_tipo: string | null;
    inicio_em: string | null;
  } | null;
};

function sortFollowups(a: FollowupStep, b: FollowupStep): number {
  if (a.data_prevista !== b.data_prevista) {
    return a.data_prevista < b.data_prevista ? -1 : 1;
  }
  const nameA = a.meeting?.nome_lead ?? a.codigo ?? "";
  const nameB = b.meeting?.nome_lead ?? b.codigo ?? "";
  return nameA.localeCompare(nameB);
}

async function fetchFollowups(closerId?: string, showAll?: boolean) {
  let query = supabase
    .from("crm_followup_steps")
    .select(`*, meeting:crm_meetings!crm_followup_steps_meeting_id_fkey(nome_lead, status, telefone_lead, motivo_perda, data_reuniao)`)
    .order("data_programada", { ascending: true })
    .limit(5000);

  if (!showAll) {
    query = query.eq("status", "pendente");
  }

  if (closerId) {
    query = query.eq("responsavel_id", closerId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Map to compat shape
  return ((data || []) as any[]).map((s) => ({
    id: s.id,
    meeting_id: s.meeting_id,
    closer_id: s.responsavel_id,
    canal: s.canal_entrega,
    codigo: s.step_nome,
    data_prevista: s.data_programada,
    status: s.status,
    notas: s.notas,
    executado_em: s.data_execucao,
    criado_em: s.created_at,
    tipo: "padrao",
    manual_titulo: null,
    meeting: s.meeting ? {
      nome_lead: s.meeting.nome_lead,
      status: s.meeting.status,
      telefone: s.meeting.telefone_lead,
      avaliacao_reuniao: null,
      perda_tipo: s.meeting.motivo_perda,
      inicio_em: s.meeting.data_reuniao,
    } : null,
  })) as FollowupStep[];
}

export function useFollowups(closerId?: string, showAll?: boolean) {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["followups", closerId, showAll],
    queryFn: () => fetchFollowups(closerId, showAll),
  });

  const all = query.data ?? [];

  const overdue = all.filter((s) => s.data_prevista < today && s.status === "pendente").sort(sortFollowups);
  const forToday = all.filter((s) => s.data_prevista === today && s.status === "pendente").sort(sortFollowups);
  const next7days = all.filter((s) => s.data_prevista >= tomorrow && s.data_prevista <= in7days && s.status === "pendente").sort(sortFollowups);
  const future = all.filter((s) => s.data_prevista > in7days && s.status === "pendente").sort(sortFollowups);

  return { ...query, overdue, forToday, next7days, future };
}

export function useMarkFollowupDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notas, newMeetingStatus, meetingId }: { id: string; notas?: string; newMeetingStatus?: string; meetingId?: string }) => {
      const { error } = await supabase
        .from("crm_followup_steps")
        .update({
          status: "enviado" as any,
          data_execucao: new Date().toISOString(),
          notas: notas || null,
        })
        .eq("id", id);
      if (error) throw error;

      if (newMeetingStatus && meetingId) {
        const { error: meetErr } = await supabase
          .from("crm_meetings")
          .update({ status: newMeetingStatus as any })
          .eq("id", meetingId);
        if (meetErr) throw meetErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useMarkFollowupIgnored() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_followup_steps")
        .update({ status: "pulado" as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
    },
  });
}

export function useSetDealOutcome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ meetingId, outcome, motivo }: { meetingId: string; outcome: string; motivo?: string }) => {
      const { data, error } = await supabase.functions.invoke("set-deal-outcome", {
        body: { meeting_id: meetingId, outcome, motivo },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useRescheduleFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data, error } = await supabase.functions.invoke("reschedule-followup", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["followups"] });
      qc.invalidateQueries({ queryKey: ["followup-counts"] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
