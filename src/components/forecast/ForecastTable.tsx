import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, ArrowUpDown, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForecastProposal } from "@/hooks/useForecast";

interface ForecastTableProps {
  proposals: ForecastProposal[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const FONTE_LABELS: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  blog: "Blog",
  organico: "Orgânico",
  indicacao: "Indicação",
  reativacao: "Reativação",
  outros: "Outro",
};

const STATUS_LABELS: Record<string, { label: string; emoji: string; variant: string }> = {
  proposta_enviada: { label: "Em aberto", emoji: "🚀", variant: "secondary" },
  fechado: { label: "Fechado", emoji: "🏆", variant: "success" },
  perdido: { label: "Perdido", emoji: "💔", variant: "destructive" },
};

const QUALITY_CONFIG: Record<string, { emoji: string; label: string }> = {
  boa: { emoji: "🌟", label: "Muito Bom" },
  neutra: { emoji: "👍", label: "Bom" },
  ruim: { emoji: "👎", label: "Ruim" },
};

type SortField =
  | "nome_lead"
  | "closer"
  | "sdr"
  | "fonte_lead"
  | "inicio_em"
  | "expected_close_date"
  | "avaliacao_reuniao"
  | "valor_proposta"
  | "probability"
  | "weighted_forecast_value"
  | "status";

type SortDirection = "asc" | "desc";

const getRowClassName = (proposal: ForecastProposal) => {
  if (proposal.isIncomplete) {
    return "bg-warning/10";
  }

  switch (proposal.avaliacao_reuniao) {
    case "boa":
      return "bg-success/10 border-l-4 border-l-success";
    case "neutra":
      return "bg-info/10 border-l-4 border-l-info";
    case "ruim":
      return "bg-destructive/10 border-l-4 border-l-destructive";
    default:
      return "";
  }
};

export function ForecastTable({
  proposals,
  isLoading,
  searchTerm,
  onSearchChange,
}: ForecastTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      // Se um campo de ordenação foi selecionado pelo usuário, usar ele
      if (sortField) {
        let comparison = 0;

        switch (sortField) {
          case "nome_lead":
            comparison = (a.nome_lead || "").localeCompare(b.nome_lead || "");
            break;
          case "closer":
            comparison = (a.closer?.nome || "").localeCompare(b.closer?.nome || "");
            break;
          case "sdr":
            comparison = (a.sdr?.nome || "").localeCompare(b.sdr?.nome || "");
            break;
          case "fonte_lead":
            comparison = (a.fonte_lead || "").localeCompare(b.fonte_lead || "");
            break;
          case "inicio_em":
            comparison = new Date(a.inicio_em).getTime() - new Date(b.inicio_em).getTime();
            break;
          case "expected_close_date":
            comparison = a.expected_close_date.getTime() - b.expected_close_date.getTime();
            break;
          case "avaliacao_reuniao":
            const qualityOrderCustom = { boa: 3, neutra: 2, ruim: 1 };
            comparison =
              (qualityOrderCustom[a.avaliacao_reuniao as keyof typeof qualityOrderCustom] || 0) -
              (qualityOrderCustom[b.avaliacao_reuniao as keyof typeof qualityOrderCustom] || 0);
            break;
          case "valor_proposta":
            comparison = (a.valor_proposta || 0) - (b.valor_proposta || 0);
            break;
          case "probability":
            comparison = a.probability - b.probability;
            break;
          case "weighted_forecast_value":
            comparison = a.weighted_forecast_value - b.weighted_forecast_value;
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Ordenação padrão: qualidade (Muito Bom > Bom > Ruim) -> expected_close_date ASC -> weighted_forecast_value DESC
      const qualityOrder = { boa: 3, neutra: 2, ruim: 1 };
      const aQuality = qualityOrder[a.avaliacao_reuniao as keyof typeof qualityOrder] || 0;
      const bQuality = qualityOrder[b.avaliacao_reuniao as keyof typeof qualityOrder] || 0;

      if (aQuality !== bQuality) return bQuality - aQuality;

      const dateCompare = a.expected_close_date.getTime() - b.expected_close_date.getTime();
      if (dateCompare !== 0) return dateCompare;

      return b.weighted_forecast_value - a.weighted_forecast_value;
    });
  }, [proposals, sortField, sortDirection]);

  const SortableHeader = ({
    field,
    children,
    tooltip,
  }: {
    field: SortField;
    children: React.ReactNode;
    tooltip?: string;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
        <ArrowUpDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground/50",
            sortField === field && "text-foreground"
          )}
        />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                {Array(11)
                  .fill(0)
                  .map((_, i) => (
                    <TableHead key={i}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    {Array(11)
                      .fill(0)
                      .map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por lead, closer ou SDR..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="nome_lead">Lead/Cliente</SortableHeader>
                <SortableHeader field="closer">Closer</SortableHeader>
                <SortableHeader field="sdr">SDR</SortableHeader>
                <SortableHeader field="fonte_lead">Canal</SortableHeader>
                <SortableHeader field="inicio_em">Data Proposta</SortableHeader>
                <SortableHeader field="expected_close_date">
                  Fechamento
                </SortableHeader>
                <SortableHeader field="avaliacao_reuniao">Qualidade</SortableHeader>
                <SortableHeader field="valor_proposta">Valor (R$)</SortableHeader>
                <SortableHeader field="probability">Prob.</SortableHeader>
                <SortableHeader
                  field="weighted_forecast_value"
                  tooltip="Valor × Probabilidade baseada na qualidade"
                >
                  Forecast (R$)
                </SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p>Nenhuma proposta encontrada.</p>
                      <p className="text-sm">
                        As propostas aparecerão aqui quando você marcar reuniões como
                        "Proposta Enviada".
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedProposals.map((proposal) => {
                  const statusConfig = STATUS_LABELS[proposal.status] || {
                    label: proposal.status,
                    emoji: "",
                    variant: "secondary",
                  };
                  const qualityConfig = proposal.avaliacao_reuniao
                    ? QUALITY_CONFIG[proposal.avaliacao_reuniao]
                    : null;

                  return (
                    <TableRow
                      key={proposal.id}
                      className={cn(getRowClassName(proposal))}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {proposal.nome_lead || "—"}
                          {proposal.isIncomplete && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-warning" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Dados incompletos: sem valor ou qualidade</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{proposal.closer?.nome || "—"}</TableCell>
                      <TableCell>{proposal.sdr?.nome || "—"}</TableCell>
                      <TableCell>
                        {proposal.fonte_lead ? (
                          <Badge variant="outline">
                            {FONTE_LABELS[proposal.fonte_lead] || proposal.fonte_lead}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(proposal.inicio_em), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {format(proposal.expected_close_date, "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                          <Badge variant="outline" className="text-xs">
                            D+30
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {qualityConfig ? (
                          <span>
                            {qualityConfig.emoji} {qualityConfig.label}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.status === "fechado" ? (
                          proposal.valor_fechado ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="text-success font-medium">
                                  {formatCurrency(proposal.valor_fechado)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Valor líquido fechado</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            "—"
                          )
                        ) : proposal.valor_proposta ? (
                          formatCurrency(proposal.valor_proposta)
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            proposal.probability === 0 && "text-muted-foreground"
                          )}
                        >
                          {(proposal.probability * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {proposal.weighted_forecast_value > 0
                          ? formatCurrency(proposal.weighted_forecast_value)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusConfig.variant as
                              | "default"
                              | "secondary"
                              | "destructive"
                              | "outline"
                          }
                        >
                          {statusConfig.emoji} {statusConfig.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
