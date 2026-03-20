import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { validatePhone, PHONE_ERROR_MESSAGE } from "@/utils/normalizePhone";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Undo2, Eye, Phone } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DealDetailPanel } from "@/components/pipeline/DealDetailPanel";
import { useStatusTransition } from "@/hooks/useStatusTransition";
import { useUpdateMeeting, type Meeting, type MeetingStatus, type CrmStatus } from "@/hooks/useMeetings";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VendasTableProps {
  meetings: Meeting[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  reuniao_agendada: { label: "Agendada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  reuniao_realizada: { label: "Realizada", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  proposta_enviada: { label: "Proposta", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  followup_ativo: { label: "Follow-up", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  contrato_enviado: { label: "Contrato", className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  fechado: { label: "Fechado", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  perdido: { label: "Perdido", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

const editableStatuses: CrmStatus[] = [
  "reuniao_agendada", "reuniao_realizada", "proposta_enviada",
  "followup_ativo", "contrato_enviado", "fechado", "perdido",
];

export function VendasTable({ meetings, isLoading }: VendasTableProps) {
  const { requestStatusChange } = useStatusTransition();
  const updateMeeting = useUpdateMeeting();
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [revertMeeting, setRevertMeeting] = useState<Meeting | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingProposalValue, setEditingProposalValue] = useState<{ id: string; valor: string } | null>(null);

  // Followup counts
  const proposalMeetingIds = useMemo(
    () => meetings.filter(m => ["proposta_enviada", "followup_ativo", "contrato_enviado"].includes(m.status as string)).map(m => m.id),
    [meetings]
  );

  const { data: followupCountsRaw } = useQuery({
    queryKey: ["followup-counts", proposalMeetingIds],
    queryFn: async () => {
      if (proposalMeetingIds.length === 0) return [];
      const { data, error } = await (supabase.rpc as any)("get_followup_counts", { p_meeting_ids: proposalMeetingIds });
      if (error) throw error;
      return data ?? [];
    },
    enabled: proposalMeetingIds.length > 0,
  });

  const followupCounts = useMemo(() => {
    const map = new Map<string, { total: number; atrasados: number; hoje: number }>();
    if (followupCountsRaw) {
      for (const row of followupCountsRaw as any[]) {
        map.set(row.meeting_id, {
          total: Number(row.total_pendentes),
          atrasados: Number(row.atrasados),
          hoje: Number(row.hoje),
        });
      }
    }
    return map;
  }, [followupCountsRaw]);

  const handleStatusChange = (meeting: Meeting, newStatus: CrmStatus) => {
    requestStatusChange(meeting, newStatus);
  };

  const getAgingDays = (date: string): number => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
    const todayStr = fmt.format(new Date());
    const startStr = fmt.format(new Date(date));
    const diffMs = new Date(todayStr).getTime() - new Date(startStr).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const getAgingBadgeClass = (days: number): string => {
    if (days >= 7) return "bg-destructive/15 text-destructive";
    if (days >= 3) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-secondary text-secondary-foreground";
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const startEditing = (id: string, field: string, val: string) => {
    setEditingCell({ id, field });
    setEditValue(val);
  };

  const handleEditBlur = async (meetingId: string, field: string) => {
    if (!editingCell || editingCell.id !== meetingId) return;
    try {
      await updateMeeting.mutateAsync({ id: meetingId, [field]: editValue.trim() || null });
    } catch { toast.error("Erro ao salvar"); }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, meetingId: string, field: string) => {
    if (e.key === "Enter") handleEditBlur(meetingId, field);
    else if (e.key === "Escape") setEditingCell(null);
  };

  const handleSaveProposalValue = async () => {
    if (!editingProposalValue) return;
    const v = parseFloat(editingProposalValue.valor);
    if (isNaN(v) || v <= 0) { toast.error("Informe um valor válido"); return; }
    try {
      await updateMeeting.mutateAsync({ id: editingProposalValue.id, valor_proposta: v });
      toast.success("Valor atualizado");
      setEditingProposalValue(null);
    } catch { toast.error("Erro ao salvar"); }
  };

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[70px] font-semibold">Horário</TableHead>
              <TableHead className="font-semibold">Lead</TableHead>
              <TableHead className="w-[150px] font-semibold">Telefone</TableHead>
              <TableHead className="w-[90px] font-semibold">Data</TableHead>
              <TableHead className="w-[130px] font-semibold">Status</TableHead>
              <TableHead className="w-[180px] font-semibold">Ações</TableHead>
              <TableHead className="w-[110px] font-semibold">Valor</TableHead>
              <TableHead className="w-[100px] font-semibold">Closer</TableHead>
              <TableHead className="w-[100px] font-semibold">SDR</TableHead>
              <TableHead className="min-w-[160px] font-semibold">Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma reunião encontrada.
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => {
                const status = meeting.status as string;
                const config = statusConfig[status] || { label: status, className: "bg-muted" };
                const fu = followupCounts.get(meeting.id);
                const showWinLose = ["proposta_enviada", "followup_ativo", "contrato_enviado"].includes(status);
                const aging = meeting.data_proposta ? getAgingDays(meeting.data_proposta) : null;

                return (
                  <TableRow
                    key={meeting.id}
                    className={cn(
                      "hover:bg-muted/30",
                      status === "fechado" && "bg-green-50/50 dark:bg-green-950/10",
                      status === "perdido" && "bg-red-50/50 dark:bg-red-950/10",
                    )}
                  >
                    <TableCell className="font-medium text-sm tabular-nums">
                      {meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "HH:mm") : "—"}
                    </TableCell>

                    <TableCell>
                      <button onClick={() => setSelectedMeeting(meeting)} className="text-left hover:underline font-medium">
                        {meeting.nome_lead}
                      </button>
                    </TableCell>

                    <TableCell>
                      {meeting.telefone_lead ? (
                        <a href={`tel:${meeting.telefone_lead}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                          <Phone className="h-3 w-3" />{meeting.telefone_lead}
                        </a>
                      ) : <span className="text-sm text-muted-foreground italic">—</span>}
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "dd/MM/yy") : "—"}
                    </TableCell>

                    <TableCell>
                      <Select
                        value={status}
                        onValueChange={(v) => handleStatusChange(meeting, v as CrmStatus)}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50 w-full p-1">
                          <Badge className={cn("border-0 text-xs", config.className)}>{config.label}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {editableStatuses.map(s => {
                            const sc = statusConfig[s] || { label: s, className: "" };
                            return <SelectItem key={s} value={s}>{sc.label}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                      {/* Aging + FU badges */}
                      {aging !== null && status === "proposta_enviada" && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", getAgingBadgeClass(aging))}>
                            Aging: {aging}d
                          </span>
                          {fu && fu.total > 0 && (
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              fu.atrasados > 0 ? "bg-destructive/15 text-destructive"
                                : fu.hoje > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-secondary text-secondary-foreground"
                            )}>
                              {fu.atrasados > 0 ? `FU atrasados: ${fu.atrasados}` : fu.hoje > 0 ? `FU hoje: ${fu.hoje}` : `FU: ${fu.total}`}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {status === "reuniao_agendada" && (
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => requestStatusChange(meeting, "reuniao_realizada")}>
                            Realizada
                          </Button>
                        )}
                        {status === "reuniao_realizada" && (
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => requestStatusChange(meeting, "proposta_enviada")}>
                            Proposta
                          </Button>
                        )}
                        {showWinLose && (
                          <>
                            <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => requestStatusChange(meeting, "fechado")}>
                              Ganhar
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => requestStatusChange(meeting, "perdido")}>
                              Perder
                            </Button>
                          </>
                        )}
                        {(status === "fechado" || status === "perdido") && (role === "admin" || role === "gestor") && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => setRevertMeeting(meeting)}>
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedMeeting(meeting)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm">
                      {showWinLose ? (
                        <Popover
                          open={editingProposalValue?.id === meeting.id}
                          onOpenChange={open => {
                            if (open) setEditingProposalValue({ id: meeting.id, valor: (meeting.valor_proposta || "").toString() });
                            else setEditingProposalValue(null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button className={cn("text-xs hover:bg-muted/50 rounded px-1.5 py-0.5 whitespace-nowrap", meeting.valor_proposta ? "text-primary font-medium" : "text-muted-foreground")}>
                              {meeting.valor_proposta ? formatCurrency(meeting.valor_proposta) : "Sem valor"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3">
                            <div className="space-y-3">
                              <Label className="text-xs font-medium">Valor da Proposta</Label>
                              <Input type="number" step="0.01" placeholder="R$ 0,00" value={editingProposalValue?.valor || ""} onChange={e => setEditingProposalValue(prev => prev ? { ...prev, valor: e.target.value } : null)} onKeyDown={e => e.key === "Enter" && handleSaveProposalValue()} className="h-8" autoFocus />
                              <Button size="sm" className="w-full" onClick={handleSaveProposalValue} disabled={updateMeeting.isPending}>
                                {updateMeeting.isPending ? "Salvando..." : "Salvar"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : status === "fechado" ? (
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">{formatCurrency(meeting.valor_fechamento)}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>

                    <TableCell className="text-sm">{meeting.closer?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{meeting.sdr?.nome || "—"}</TableCell>

                    <TableCell>
                      {editingCell?.id === meeting.id && editingCell.field === "observacao" ? (
                        <Input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={() => handleEditBlur(meeting.id, "observacao")} onKeyDown={e => handleKeyDown(e, meeting.id, "observacao")} autoFocus className="h-8 text-sm" />
                      ) : (
                        <button onClick={() => startEditing(meeting.id, "observacao", meeting.notas || "")} className={cn("text-left hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 w-full text-sm", !meeting.notas && "text-muted-foreground italic")}>
                          {meeting.notas || meeting.motivo_perda || "Adicionar obs..."}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DealDetailPanel meeting={selectedMeeting} open={!!selectedMeeting} onClose={() => setSelectedMeeting(null)} />

      <AlertDialog open={!!revertMeeting} onOpenChange={open => !open && setRevertMeeting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter status</AlertDialogTitle>
            <AlertDialogDescription>
              Reverter <strong>{revertMeeting?.nome_lead}</strong> de{" "}
              <strong>{revertMeeting?.status === "fechado" ? "Fechado" : "Perdido"}</strong> para{" "}
              <strong>Proposta Enviada</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (!revertMeeting) return;
              try {
                await updateMeeting.mutateAsync({
                  id: revertMeeting.id, status: "proposta_enviada",
                  valor_fechado: null, caixa_gerado: null, fechado_em: null, motivo_perda: null,
                });
                toast.success("Status revertido");
                setRevertMeeting(null);
              } catch { toast.error("Erro ao reverter"); }
            }}>Reverter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
