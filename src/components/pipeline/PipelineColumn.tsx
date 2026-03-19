import { cn } from "@/lib/utils";
import { ProposalCard } from "./ProposalCard";
import type { Proposal, ProposalStatus } from "@/hooks/useProposals";

interface PipelineColumnProps {
  status: ProposalStatus;
  title: string;
  proposals: Proposal[];
  onCardClick: (proposal: Proposal) => void;
  onDrop: (proposalId: string, newStatus: ProposalStatus) => void;
  className?: string;
}

const statusColors: Record<string, string> = {
  rascunho: "border-t-muted-foreground",
  enviada: "border-t-info",
  aceita: "border-t-success",
  recusada: "border-t-destructive",
};

export function PipelineColumn({
  status,
  title,
  proposals,
  onCardClick,
  onDrop,
  className,
}: PipelineColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("bg-muted/50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-muted/50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-muted/50");
    const proposalId = e.dataTransfer.getData("proposalId");
    if (proposalId) {
      onDrop(proposalId, status);
    }
  };

  const handleDragStart = (e: React.DragEvent, proposalId: string) => {
    e.dataTransfer.setData("proposalId", proposalId);
  };

  const total = proposals.reduce((sum, p) => sum + (p.valor || 0), 0);

  return (
    <div
      className={cn(
        "flex flex-col bg-muted/30 rounded-lg border-t-4 min-h-[400px] transition-colors",
        statusColors[status],
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">{proposals.length}</span>
        </div>
        {total > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(total)}
          </p>
        )}
      </div>

      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            draggable
            onDragStart={(e) => handleDragStart(e, proposal.id)}
          >
            <ProposalCard proposal={proposal} onClick={() => onCardClick(proposal)} />
          </div>
        ))}

        {proposals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma proposta
          </div>
        )}
      </div>
    </div>
  );
}
