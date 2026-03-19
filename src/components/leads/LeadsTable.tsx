import { format, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, CalendarPlus, XCircle, ArrowUpDown, MessageCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LeadWithStatus, LeadStatus } from "@/hooks/useLeadsPage";

interface LeadsTableProps {
  leads: LeadWithStatus[];
  isLoading: boolean;
  canAct: boolean;
  onCreateMeeting: (lead: LeadWithStatus) => void;
  onMarkNotEligible: (lead: LeadWithStatus) => void;
  onViewDetails: (lead: LeadWithStatus) => void;
  sortField: string;
  sortAsc: boolean;
  onSort: (field: string) => void;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  sem_reuniao: { label: "Sem reunião", className: "bg-destructive/15 text-destructive border-destructive/30" },
  em_pipeline: { label: "Em pipeline", className: "bg-primary/15 text-primary border-primary/30" },
  nao_elegivel: { label: "Não elegível", className: "bg-muted text-muted-foreground border-border" },
  fechado: { label: "Fechado", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  perdido: { label: "Perdido", className: "bg-muted text-muted-foreground border-border" },
};

const origemConfig: Record<string, { label: string; className: string }> = {
  meta_ads: { label: "Meta Ads", className: "bg-primary/15 text-primary" },
  google_ads: { label: "Google Ads", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  indicacao: { label: "Indicação", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  organico: { label: "Orgânico", className: "bg-muted text-muted-foreground" },
  hubspot_direto: { label: "HubSpot", className: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  reativacao: { label: "Reativação", className: "bg-violet-500/15 text-violet-700 dark:text-violet-400" },
};

const tipoLabels: Record<string, string> = {
  nacionalidade_portuguesa: "Nac. Portuguesa",
  residencia_brasileira: "Res. Brasileira",
  outro: "Outro",
};

function SortableHead({ label, field, sortField, sortAsc, onSort }: {
  label: string; field: string; sortField: string; sortAsc: boolean; onSort: (f: string) => void;
}) {
  return (
    <TableHead className="font-semibold cursor-pointer select-none" onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-foreground" : "text-muted-foreground/50"}`} />
      </span>
    </TableHead>
  );
}

function formatEntrada(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
  return format(d, "dd MMM yyyy", { locale: ptBR });
}

export function LeadsTable({
  leads, isLoading, canAct, onCreateMeeting, onMarkNotEligible, onViewDetails,
  sortField, sortAsc, onSort,
}: LeadsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <SortableHead label="Nome" field="nome" sortField={sortField} sortAsc={sortAsc} onSort={onSort} />
            <TableHead className="w-[120px] font-semibold">WhatsApp</TableHead>
            <TableHead className="w-[110px] font-semibold">Origem</TableHead>
            <TableHead className="w-[100px] font-semibold">Canal</TableHead>
            <TableHead className="w-[130px] font-semibold">Tipo Interesse</TableHead>
            <SortableHead label="Entrada" field="created_at" sortField={sortField} sortAsc={sortAsc} onSort={onSort} />
            <TableHead className="w-[120px] font-semibold">Status</TableHead>
            <TableHead className="w-[130px] font-semibold text-right">Ações</TableHead>
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
              const status = statusConfig[lead.leadStatus];
              const origem = lead.origem ? origemConfig[lead.origem] : null;

              return (
                <TableRow key={lead.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <button
                      className="text-left hover:underline text-foreground"
                      onClick={() => onViewDetails(lead)}
                    >
                      {lead.nome}
                    </button>
                  </TableCell>

                  <TableCell className="text-sm">
                    {lead.whatsapp ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                        {lead.whatsapp}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {origem ? (
                      <Badge variant="outline" className={origem.className}>{origem.label}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground capitalize">
                    {lead.canal || "—"}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {lead.tipo_interesse ? tipoLabels[lead.tipo_interesse] || lead.tipo_interesse : "—"}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {formatEntrada(lead.created_at)}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {canAct && lead.leadStatus === "sem_reuniao" && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="default" className="h-7 w-7" onClick={() => onCreateMeeting(lead)}>
                                  <CalendarPlus className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Criar Reunião</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => onMarkNotEligible(lead)}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Não Elegível</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onViewDetails(lead)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
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
