import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Proposal } from "@/hooks/useProposals";

interface ProposalCardProps {
  proposal: Proposal;
  onClick: () => void;
  isDragging?: boolean;
}

export function ProposalCard({ proposal, onClick, isDragging }: ProposalCardProps) {
  const diasDesde = differenceInDays(new Date(), new Date(proposal.criado_em || proposal.created_at || new Date()));

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-all",
        isDragging && "opacity-50 rotate-2 shadow-lg"
      )}
      onClick={onClick}
      draggable
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm line-clamp-1">
            {proposal.leads?.nome || "Lead desconhecido"}
          </p>
          <Badge variant="outline" className="text-xs shrink-0">
            {diasDesde}d
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>{proposal.tipo_servico || "—"}</p>
        </div>

        {proposal.valor && (
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(proposal.valor)}
          </p>
        )}
      </div>
    </Card>
  );
}
