import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useUpdateMeeting, type Meeting, type CrmStatus } from "@/hooks/useMeetings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AgendarReuniaoModal } from "@/components/shared/AgendarReuniaoModal";
import { ReuniaoRealizadaModal } from "@/components/shared/ReuniaoRealizadaModal";
import { PropostaEnviadaModal } from "@/components/shared/PropostaEnviadaModal";
import { ContratoEnviadoModal } from "@/components/shared/ContratoEnviadoModal";
import { FechamentoModal } from "@/components/pipeline/FechamentoModal";
import { MotivoPerdaModal } from "@/components/shared/MotivoPerdaModal";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCelebration } from "@/hooks/useCelebration";
import { useQueryClient } from "@tanstack/react-query";

const MODAL_STATUSES: CrmStatus[] = [
  "reuniao_agendada",
  "reuniao_realizada",
  "proposta_enviada",
  "contrato_enviado",
  "fechado",
  "perdido",
];

type ModalType = CrmStatus | null;

interface StatusTransitionContextType {
  requestStatusChange: (meeting: Meeting, newStatus: CrmStatus) => void;
}

const StatusTransitionContext = createContext<StatusTransitionContextType | undefined>(undefined);

export function useStatusTransition() {
  const ctx = useContext(StatusTransitionContext);
  if (!ctx) throw new Error("useStatusTransition must be used within StatusTransitionProvider");
  return ctx;
}

export function StatusTransitionProvider({ children }: { children: React.ReactNode }) {
  const updateMeeting = useUpdateMeeting();
  const queryClient = useQueryClient();
  const { triggerFireworks, triggerConfetti } = useCelebration();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);

  const requestStatusChange = useCallback((meeting: Meeting, newStatus: CrmStatus) => {
    if (meeting.status === newStatus) return;

    if (MODAL_STATUSES.includes(newStatus)) {
      setActiveMeeting(meeting);
      setActiveModal(newStatus);
    } else {
      // Direct update
      updateMeeting.mutateAsync({ id: meeting.id, status: newStatus })
        .then(() => toast.success("Status atualizado"))
        .catch(() => toast.error("Erro ao atualizar status"));
    }
  }, [updateMeeting]);

  const closeModal = () => {
    setActiveModal(null);
    setActiveMeeting(null);
  };

  // Handlers
  const handleAgendarConfirm = async (data: {
    data_reuniao: string;
    closer_id: string;
    sdr_id?: string;
    tipo_servico?: string;
    observacao?: string;
  }) => {
    if (!activeMeeting) return;
    try {
      const updateData: any = {
        id: activeMeeting.id,
        status: "reuniao_agendada",
        data_reuniao: data.data_reuniao,
        closer_id: data.closer_id,
      };
      if (data.sdr_id) updateData.sdr_id = data.sdr_id;
      if (data.tipo_servico) updateData.tipo_servico = data.tipo_servico;

      await updateMeeting.mutateAsync(updateData);

      if (data.observacao?.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("crm_notas").insert({
            meeting_id: activeMeeting.id,
            user_id: user.id,
            conteudo: data.observacao.trim(),
            tipo: "nota",
          });
        }
      }

      toast.success("Reunião agendada! 🗓️");
      closeModal();
    } catch {
      toast.error("Erro ao agendar reunião");
    }
  };

  const handleReuniaoRealizadaConfirm = async (observacao?: string) => {
    if (!activeMeeting) return;
    try {
      await updateMeeting.mutateAsync({
        id: activeMeeting.id,
        status: "reuniao_realizada",
      });

      if (observacao?.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("crm_notas").insert({
            meeting_id: activeMeeting.id,
            user_id: user.id,
            conteudo: observacao.trim(),
            tipo: "reuniao",
          });
          queryClient.invalidateQueries({ queryKey: ["notas"] });
        }
      }

      toast.success("Reunião realizada! ✅");
      closeModal();
    } catch {
      toast.error("Erro ao confirmar reunião");
    }
  };

  const handlePropostaConfirm = async (valorProposta: number, dataProposta: string, observacao?: string) => {
    if (!activeMeeting) return;
    try {
      await updateMeeting.mutateAsync({
        id: activeMeeting.id,
        status: "proposta_enviada",
        valor_proposta: valorProposta,
        data_proposta: dataProposta,
      });

      // Generate followup steps
      await supabase.functions.invoke("generate-followup-steps", {
        body: { meeting_id: activeMeeting.id },
      });

      if (observacao?.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("crm_notas").insert({
            meeting_id: activeMeeting.id,
            user_id: user.id,
            conteudo: observacao.trim(),
            tipo: "nota",
          });
        }
      }

      triggerConfetti();
      toast.success("Proposta enviada e follow-ups gerados! 🚀");
      closeModal();
    } catch {
      toast.error("Erro ao registrar proposta");
    }
  };

  const handleContratoConfirm = async (valorConfirmado: number, dataEnvio: string) => {
    if (!activeMeeting) return;
    try {
      await updateMeeting.mutateAsync({
        id: activeMeeting.id,
        status: "contrato_enviado",
      });
      toast.success("Contrato enviado! 📄");
      closeModal();
    } catch {
      toast.error("Erro ao registrar envio de contrato");
    }
  };

  const handleFechamentoConfirm = async (valorFechamento: number, dataFechamento: string) => {
    if (!activeMeeting) return;
    try {
      // Try edge function first for followup cleanup
      try {
        await supabase.functions.invoke("set-deal-outcome", {
          body: { meeting_id: activeMeeting.id, outcome: "fechado" },
        });
      } catch {
        // Edge function may not exist, proceed with direct update
      }

      await updateMeeting.mutateAsync({
        id: activeMeeting.id,
        status: "fechado",
        valor_fechamento: valorFechamento,
        data_fechamento: dataFechamento,
      });

      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["followup-counts"] });

      triggerFireworks();
      toast.success("🏆 Deal fechado com sucesso!");
      closeModal();
    } catch {
      toast.error("Erro ao fechar deal");
    }
  };

  const handleLossConfirm = async (motivo: string, observacao: string) => {
    if (!activeMeeting) return;
    try {
      try {
        await supabase.functions.invoke("set-deal-outcome", {
          body: { meeting_id: activeMeeting.id, outcome: "perdido", motivo, observacao },
        });
      } catch {
        // Edge function may not exist
      }

      const currentNotas = activeMeeting.notas || "";
      const perdaNote = `\n[PERDIDO - ${format(new Date(), "dd/MM/yyyy")}] ${observacao}`.trim();
      await updateMeeting.mutateAsync({
        id: activeMeeting.id,
        status: "perdido",
        motivo_perda: motivo,
        notas: currentNotas + perdaNote,
      });

      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["followup-counts"] });

      toast.info("Deal marcado como perdido");
      closeModal();
    } catch {
      toast.error("Erro ao registrar perda");
    }
  };

  return (
    <StatusTransitionContext.Provider value={{ requestStatusChange }}>
      {children}

      <AgendarReuniaoModal
        open={activeModal === "reuniao_agendada"}
        meeting={activeMeeting}
        onClose={closeModal}
        onConfirm={handleAgendarConfirm}
        isLoading={updateMeeting.isPending}
      />
      <ReuniaoRealizadaModal
        open={activeModal === "reuniao_realizada"}
        meeting={activeMeeting}
        onClose={closeModal}
        onConfirm={handleReuniaoRealizadaConfirm}
        isLoading={updateMeeting.isPending}
      />
      <PropostaEnviadaModal
        open={activeModal === "proposta_enviada"}
        meeting={activeMeeting}
        onClose={closeModal}
        onConfirm={handlePropostaConfirm}
        isLoading={updateMeeting.isPending}
      />
      <ContratoEnviadoModal
        open={activeModal === "contrato_enviado"}
        meeting={activeMeeting}
        onClose={closeModal}
        onConfirm={handleContratoConfirm}
        isLoading={updateMeeting.isPending}
      />
      <FechamentoModal
        open={activeModal === "fechado"}
        onClose={closeModal}
        onConfirm={handleFechamentoConfirm}
        isLoading={updateMeeting.isPending}
        valorProposta={activeMeeting?.valor_proposta}
      />
      <MotivoPerdaModal
        open={activeModal === "perdido"}
        onClose={closeModal}
        onConfirm={handleLossConfirm}
        isLoading={updateMeeting.isPending}
      />
    </StatusTransitionContext.Provider>
  );
}
