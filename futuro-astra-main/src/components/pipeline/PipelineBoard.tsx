import { useState } from "react";
import { PipelineColumn } from "./PipelineColumn";
import { WinModal } from "./WinModal";
import { LossModal } from "./LossModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUpdateProposal, type Proposal, type ProposalStatus } from "@/hooks/useProposals";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface PipelineBoardProps {
  proposals: Proposal[];
}

const columns: { status: ProposalStatus; title: string }[] = [
  { status: "aberta", title: "Aberta" },
  { status: "follow_up", title: "Follow-up" },
  { status: "ganha", title: "Ganha" },
  { status: "perdida", title: "Perdida" },
];

export function PipelineBoard({ proposals }: PipelineBoardProps) {
  const isMobile = useIsMobile();
  const [winModal, setWinModal] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });
  const [lossModal, setLossModal] = useState<{ open: boolean; proposal: Proposal | null }>({
    open: false,
    proposal: null,
  });

  const updateProposal = useUpdateProposal();

  const getProposalsByStatus = (status: ProposalStatus) =>
    proposals.filter((p) => p.status === status);

  const handleDrop = (proposalId: string, newStatus: ProposalStatus) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal || proposal.status === newStatus) return;

    if (newStatus === "ganha") {
      setWinModal({ open: true, proposal });
      return;
    }

    if (newStatus === "perdida") {
      setLossModal({ open: true, proposal });
      return;
    }

    handleStatusChange(proposalId, newStatus);
  };

  const handleStatusChange = async (proposalId: string, newStatus: ProposalStatus, extra?: Partial<Proposal>) => {
    try {
      await updateProposal.mutateAsync({
        id: proposalId,
        status: newStatus,
        ...extra,
      });
      toast.success("Proposta atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar proposta");
    }
  };

  const handleWinConfirm = async (valorFechado: number, caixaGerado: number) => {
    if (!winModal.proposal) return;

    try {
      await updateProposal.mutateAsync({
        id: winModal.proposal.id,
        status: "ganha",
        valor_fechado: valorFechado,
        caixa_gerado: caixaGerado,
        fechado_em: new Date().toISOString(),
      });
      toast.success("🎉 Proposta fechada com sucesso!");
      setWinModal({ open: false, proposal: null });
    } catch (error) {
      toast.error("Erro ao atualizar proposta");
    }
  };

  const handleLossConfirm = async (motivoPerda: string) => {
    if (!lossModal.proposal) return;

    try {
      await updateProposal.mutateAsync({
        id: lossModal.proposal.id,
        status: "perdida",
        motivo_perda: motivoPerda,
      });
      toast.success("Proposta marcada como perdida");
      setLossModal({ open: false, proposal: null });
    } catch (error) {
      toast.error("Erro ao atualizar proposta");
    }
  };

  const handleCardClick = (proposal: Proposal) => {
    // Could open a detail modal here
    console.log("Clicked proposal:", proposal);
  };

  if (isMobile) {
    return (
      <>
        <Tabs defaultValue="aberta" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            {columns.map((col) => (
              <TabsTrigger key={col.status} value={col.status} className="text-xs">
                {col.title} ({getProposalsByStatus(col.status).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {columns.map((col) => (
            <TabsContent key={col.status} value={col.status} className="mt-4">
              <PipelineColumn
                status={col.status}
                title={col.title}
                proposals={getProposalsByStatus(col.status)}
                onCardClick={handleCardClick}
                onDrop={handleDrop}
              />
            </TabsContent>
          ))}
        </Tabs>

        <WinModal
          open={winModal.open}
          onClose={() => setWinModal({ open: false, proposal: null })}
          onConfirm={handleWinConfirm}
          isLoading={updateProposal.isPending}
          valorProposto={winModal.proposal?.valor_proposto}
        />
        <LossModal
          open={lossModal.open}
          onClose={() => setLossModal({ open: false, proposal: null })}
          onConfirm={handleLossConfirm}
          isLoading={updateProposal.isPending}
        />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => (
          <PipelineColumn
            key={col.status}
            status={col.status}
            title={col.title}
            proposals={getProposalsByStatus(col.status)}
            onCardClick={handleCardClick}
            onDrop={handleDrop}
          />
        ))}
      </div>

      <WinModal
        open={winModal.open}
        onClose={() => setWinModal({ open: false, proposal: null })}
        onConfirm={handleWinConfirm}
        isLoading={updateProposal.isPending}
        valorProposto={winModal.proposal?.valor_proposto}
      />
      <LossModal
        open={lossModal.open}
        onClose={() => setLossModal({ open: false, proposal: null })}
        onConfirm={handleLossConfirm}
        isLoading={updateProposal.isPending}
      />
    </>
  );
}
