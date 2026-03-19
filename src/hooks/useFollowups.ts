import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export type FollowupStep = {
  id: string;
  meeting_id: string;
  closer_id: string;
  canal: "ligacao" | "whatsapp";
  codigo: string | null;
  data_prevista: string;
  status: "pendente" | "feito" | "ignorado";
  notas: string | null;
  executado_em: string | null;
  criado_em: string;
  tipo: "padrao" | "manual";
  manual_titulo: string | null;
  meeting: {
    nome_lead: string | null;
    status: string;
    telefone: string | null;
    avaliacao_reuniao: "boa" | "neutra" | "ruim" | null;
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
    .from("followup_steps")
    .select("*, meeting:meetings(nome_lead, status, telefone, avaliacao_reuniao, perda_tipo, inicio_em)")
    .order("data_prevista", { ascending: true })
    .limit(5000);

  if (!showAll) {
    query = query.eq("status", "pendente");
  }

  if (closerId) {
    query = query.eq("closer_id", closerId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data as unknown as FollowupStep[]).filter((s) => {
    // Exclude won deals
    if (s.meeting?.status === "ganha") return false;
    // Exclude definitive losses
    if (s.meeting?.status === "perdida" && s.meeting?.perda_tipo === "definitiva") return false;
    // For simple losses, show only pending MEN* steps
    if (s.meeting?.status === "perdida" && s.meeting?.perda_tipo === "simples") {
      return s.codigo?.startsWith("MEN") && s.status === "pendente";
    }
    return true;
  });
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

  const overdue = all.filter(
    (s) => s.data_prevista < today && s.status === "pendente"
  ).sort(sortFollowups);
  const forToday = all.filter(
    (s) => s.data_prevista === today && s.status === "pendente"
  ).sort(sortFollowups);
  const next7days = all.filter(
    (s) => s.data_prevista >= tomorrow && s.data_prevista <= in7days && s.status === "pendente"
  ).sort(sortFollowups);
  const future = all.filter(
    (s) => s.data_prevista > in7days && s.status === "pendente"
  ).sort(sortFollowups);

  return { ...query, overdue, forToday, next7days, future };
}

export function useMarkFollowupDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      notas,
      newMeetingStatus,
      meetingId,
    }: {
      id: string;
      notas?: string;
      newMeetingStatus?: string;
      meetingId?: string;
    }) => {
      const { error } = await supabase
        .from("followup_steps")
        .update({
          status: "feito" as any,
          executado_em: new Date().toISOString(),
          notas: notas || null,
        })
        .eq("id", id);
      if (error) throw error;

      if (newMeetingStatus && meetingId) {
        const { error: meetErr } = await supabase
          .from("meetings")
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
        .from("followup_steps")
        .update({ status: "ignorado" as any })
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
    mutationFn: async ({
      meetingId,
      outcome,
      motivo,
    }: {
      meetingId: string;
      outcome: "ganha" | "perdida_simples" | "perdida_definitiva";
      motivo?: string;
    }) => {
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
    mutationFn: async (body: {
      meeting_id: string;
      canal: "whatsapp" | "ligacao";
      data_prevista: string;
      horario?: string;
      notas?: string;
      pause_default: boolean;
      step_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("reschedule-followup", {
        body,
      });
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
