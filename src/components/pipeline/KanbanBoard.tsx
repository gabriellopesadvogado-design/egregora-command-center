import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanColumn } from "./KanbanColumn";
import { FechamentoModal } from "./FechamentoModal";
import { DealDetailPanel } from "./DealDetailPanel";
import { MotivoPerdaModal } from "@/components/shared/MotivoPerdaModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateMeeting, type Meeting, type CrmStatus } from "@/hooks/useMeetings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  meetings: Meeting[];
}

const columns: { status: CrmStatus; title: string; colorClass: string }[] = [
  { status: "novo_lead", title: "Novo Lead", colorClass: "border-t-slate-300" },
  { status: "qualificado", title: "Qualificado", colorClass: "border-t-sky-300" },
  { status: "elegivel", title: "Elegível", colorClass: "border-t-blue-400" },
  { status: "reuniao_agendada", title: "Reunião Agendada", colorClass: "border-t-yellow-400" },
  { status: "reuniao_realizada", title: "Reunião Realizada", colorClass: "border-t-orange-400" },
  { status: "proposta_enviada", title: "Proposta Enviada", colorClass: "border-t-purple-400" },
  { status: "followup_ativo", title: "Follow-up Ativo", colorClass: "border-t-indigo-500" },
  { status: "contrato_enviado", title: "Contrato Enviado", colorClass: "border-t-emerald-300" },
  { status: "fechado", title: "Fechado", colorClass: "border-t-green-500" },
  { status: "perdido", title: "Perdido", colorClass: "border-t-red-500" },
];

export function KanbanBoard({ meetings }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const updateMeeting = useUpdateMeeting();

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [fechamentoModal, setFechamentoModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });
  const [lossModal, setLossModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });

  // Followup today query
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: followupTodayData = [] } = useQuery({
    queryKey: ["followup-today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_followup_steps")
        .select("meeting_id")
        .eq("data_programada", today)
        .eq("status", "pendente");
      if (error) throw error;
      return data;
    },
  });

  const followupTodayIds = useMemo(
    () => new Set(followupTodayData.map((r) => r.meeting_id).filter(Boolean) as string[]),
    [followupTodayData]
  );

  const getMeetingsByStatus = (status: CrmStatus) =>
    meetings.filter((m) => m.status === status);

  const handleDrop = (meetingId: string, newStatus: CrmStatus) => {
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting || meeting.status === newStatus) return;

    if (newStatus === "fechado") {
      setFechamentoModal({ open: true, meeting });
      return;
    }
    if (newStatus === "perdido") {
      setLossModal({ open: true, meeting });
      return;
    }

    handleStatusChange(meetingId, newStatus);
  };

  const handleStatusChange = async (meetingId: string, newStatus: CrmStatus) => {
    try {
      await updateMeeting.mutateAsync({ id: meetingId, status: newStatus });
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleFechamentoConfirm = async (valorFechamento: number, dataFechamento: string) => {
    if (!fechamentoModal.meeting) return;
    try {
      await updateMeeting.mutateAsync({
        id: fechamentoModal.meeting.id,
        status: "fechado",
        valor_fechamento: valorFechamento,
        data_fechamento: dataFechamento,
      });
      toast.success("🏆 Deal fechado com sucesso!");
      setFechamentoModal({ open: false, meeting: null });
    } catch {
      toast.error("Erro ao fechar deal");
    }
  };

  const handleLossConfirm = async (motivo: string, observacao: string) => {
    if (!lossModal.meeting) return;
    try {
      const currentNotas = lossModal.meeting.notas || "";
      const perdaNote = `\n[PERDIDO - ${format(new Date(), "dd/MM/yyyy")}] ${observacao}`.trim();
      await updateMeeting.mutateAsync({
        id: lossModal.meeting.id,
        status: "perdido",
        motivo_perda: motivo,
        notas: currentNotas + perdaNote,
      });
      toast.info("Deal marcado como perdido");
      setLossModal({ open: false, meeting: null });
    } catch {
      toast.error("Erro ao registrar perda");
    }
  };

  const renderColumns = () =>
    columns.map((col) => (
      <KanbanColumn
        key={col.status}
        status={col.status}
        title={col.title}
        colorClass={col.colorClass}
        meetings={getMeetingsByStatus(col.status)}
        followupTodayIds={followupTodayIds}
        onCardClick={setSelectedMeeting}
        onDrop={handleDrop}
      />
    ));

  if (isMobile) {
    return (
      <>
        <Tabs defaultValue="novo_lead" className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="w-max">
              {columns.map((col) => (
                <TabsTrigger key={col.status} value={col.status} className="text-xs whitespace-nowrap">
                  {col.title} ({getMeetingsByStatus(col.status).length})
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          {columns.map((col) => (
            <TabsContent key={col.status} value={col.status} className="mt-4">
              <KanbanColumn
                status={col.status}
                title={col.title}
                colorClass={col.colorClass}
                meetings={getMeetingsByStatus(col.status)}
                followupTodayIds={followupTodayIds}
                onCardClick={setSelectedMeeting}
                onDrop={handleDrop}
              />
            </TabsContent>
          ))}
        </Tabs>

        <FechamentoModal
          open={fechamentoModal.open}
          onClose={() => setFechamentoModal({ open: false, meeting: null })}
          onConfirm={handleFechamentoConfirm}
          isLoading={updateMeeting.isPending}
          valorProposta={fechamentoModal.meeting?.valor_proposta}
        />
        <MotivoPerdaModal
          open={lossModal.open}
          onClose={() => setLossModal({ open: false, meeting: null })}
          onConfirm={handleLossConfirm}
          isLoading={updateMeeting.isPending}
        />
        <DealDetailPanel
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      </>
    );
  }

  return (
    <>
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-4 min-w-max">
          {renderColumns()}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <FechamentoModal
        open={fechamentoModal.open}
        onClose={() => setFechamentoModal({ open: false, meeting: null })}
        onConfirm={handleFechamentoConfirm}
        isLoading={updateMeeting.isPending}
        valorProposta={fechamentoModal.meeting?.valor_proposta}
      />
      <MotivoPerdaModal
        open={lossModal.open}
        onClose={() => setLossModal({ open: false, meeting: null })}
        onConfirm={handleLossConfirm}
        isLoading={updateMeeting.isPending}
      />
      <DealDetailPanel
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </>
  );
}
