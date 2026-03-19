import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LeadWithMeeting, MeetingStatus, AvaliacaoReuniao, PlataformaOrigem } from "@/hooks/useLeadsWithMeetings";

interface LeadsTableProps {
  leads: LeadWithMeeting[];
  isLoading: boolean;
  onAddPhone?: (leadName: string, meetingId: string) => void;
}

const statusConfig: Record<MeetingStatus, { emoji: string; label: string; className: string }> = {
  agendada: { emoji: "🕐", label: "Agendada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300" },
  aconteceu: { emoji: "✅", label: "Realizada", className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300" },
  proposta_enviada: { emoji: "🚀", label: "Proposta", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
  ganha: { emoji: "🏆", label: "Ganha", className: "bg-success/20 text-success dark:bg-success/30" },
  perdida: { emoji: "💔", label: "Perdida", className: "bg-destructive/20 text-destructive" },
  no_show: { emoji: "🚫", label: "No Show", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300" },
  cancelada: { emoji: "🚫", label: "Cancelada", className: "bg-muted text-muted-foreground" },
};

const qualificacaoConfig: Record<AvaliacaoReuniao, { emoji: string; label: string }> = {
  boa: { emoji: "🌟", label: "Muito Bom" },
  neutra: { emoji: "👍", label: "Bom" },
  ruim: { emoji: "👎", label: "Ruim" },
};

const fonteLabels: Record<PlataformaOrigem, string> = {
  google: "Google",
  meta: "Meta",
  blog: "Blog",
  organico: "Orgânico",
  indicacao: "Indicação",
  reativacao: "Reativação",
  outros: "Outro",
};

export function LeadsTable({ leads, isLoading, onAddPhone }: LeadsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Nome do Lead</TableHead>
            <TableHead className="w-[100px] font-semibold">Origem</TableHead>
            <TableHead className="w-[130px] font-semibold">Status</TableHead>
            <TableHead className="w-[150px] font-semibold">Responsável</TableHead>
            <TableHead className="w-[130px] font-semibold">Qualificação</TableHead>
            <TableHead className="w-[110px] font-semibold">Última Reunião</TableHead>
            <TableHead className="min-w-[180px] font-semibold">Observação</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Nenhum lead encontrado.
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const status = statusConfig[lead.status];
              const qualificacao = lead.qualificacao ? qualificacaoConfig[lead.qualificacao] : null;
              
              return (
                <TableRow key={lead.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{lead.nome}</TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.fonte ? fonteLabels[lead.fonte] : "—"}
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={status.className}>
                      {status.emoji} {status.label}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{lead.responsavel}</span>
                      <span className="text-xs text-muted-foreground">
                        {lead.responsavelTipo === "closer" ? "Closer" : "SDR"}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {qualificacao ? (
                      <span className="text-sm">
                        {qualificacao.emoji} {qualificacao.label}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.dataUltimaReuniao), "dd/MM/yy", { locale: ptBR })}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.observacao || "—"}
                  </TableCell>

                  <TableCell>
                    {!lead.telefone && onAddPhone ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-warning hover:text-warning"
                              onClick={() => onAddPhone(lead.nome, lead.meetingId)}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Adicionar telefone</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : lead.telefone ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground">
                              <Phone className="h-4 w-4 inline" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{lead.telefone}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
