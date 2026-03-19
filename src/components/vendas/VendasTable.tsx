import { useState, useRef, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { validatePhone, PHONE_ERROR_MESSAGE } from "@/utils/normalizePhone";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusVendasToggle } from "./StatusVendasToggle";
import { QualificacaoSelect } from "./QualificacaoSelect";
import { WinModal } from "@/components/pipeline/WinModal";
import { VendasLossModal } from "./VendasLossModal";
import { ProposalValueModal } from "./ProposalValueModal";
import { useUpdateMeeting, type Meeting, type MeetingStatus, type AvaliacaoReuniao, type PlataformaOrigem } from "@/hooks/useMeetings";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCelebration } from "@/hooks/useCelebration";
import { supabase } from "@/integrations/supabase/client";

interface VendasTableProps {
  meetings: Meeting[];
  isLoading: boolean;
}

export function VendasTable({ meetings, isLoading }: VendasTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [winModalMeeting, setWinModalMeeting] = useState<Meeting | null>(null);
  const [lossModalMeeting, setLossModalMeeting] = useState<Meeting | null>(null);
  const [proposalModalMeeting, setProposalModalMeeting] = useState<Meeting | null>(null);
  const [editingValues, setEditingValues] = useState<{
    id: string;
    valorFechado: string;
    caixaGerado: string;
  } | null>(null);
  const [editingProposalValue, setEditingProposalValue] = useState<{
    id: string;
    valor: string;
  } | null>(null);
  const [revertMeeting, setRevertMeeting] = useState<Meeting | null>(null);

  const updateMeeting = useUpdateMeeting();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { triggerConfetti } = useCelebration();
  

  // Followup counts for proposta_enviada meetings (single RPC, no N+1)
  const proposalMeetingIds = useMemo(
    () => meetings.filter((m) => m.status === "proposta_enviada").map((m) => m.id),
    [meetings]
  );

  const { data: followupCountsRaw } = useQuery({
    queryKey: ["followup-counts", proposalMeetingIds],
    queryFn: async () => {
      if (proposalMeetingIds.length === 0) return [];
      const { data, error } = await (supabase.rpc as any)("get_followup_counts", {
        p_meeting_ids: proposalMeetingIds,
      });
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

  const handleStatusChange = async (meeting: Meeting, newStatus: MeetingStatus) => {
    // Interceptar mudança para proposta_enviada para exigir valor
    if (newStatus === "proposta_enviada") {
      setProposalModalMeeting(meeting);
      return;
    }
    
    try {
      await updateMeeting.mutateAsync({
        id: meeting.id,
        status: newStatus,
      });

      
      if (newStatus === "reuniao_realizada") {
        toast.success("Reunião realizada! ✅");
      } else {
        toast.success("Status atualizado");
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const [proposalSaving, setProposalSaving] = useState(false);

  const handleProposalConfirm = async (valorProposta: number, primeiroFollowupEm: string) => {
    if (!proposalModalMeeting) return;
    
    setProposalSaving(true);
    try {
      await updateMeeting.mutateAsync({
        id: proposalModalMeeting.id,
        status: "proposta_enviada",
        valor_proposta: valorProposta,
        primeiro_followup_em: primeiroFollowupEm,
      } as any);

      // Call edge function to generate follow-up cadence
      const { data, error: fnError } = await supabase.functions.invoke(
        "generate-followup-steps",
        { body: { meeting_id: proposalModalMeeting.id } }
      );

      if (fnError) {
        toast.error(`Erro ao gerar cadência de follow-up: ${fnError.message}`);
        setProposalSaving(false);
        return; // Keep modal open
      }

      triggerConfetti();
      toast.success("Proposta enviada e follow-ups gerados! 🚀🎉");


      setProposalModalMeeting(null);
    } catch (error) {
      toast.error("Erro ao registrar proposta");
    } finally {
      setProposalSaving(false);
    }
  };

  const handleSaveProposalValue = async () => {
    if (!editingProposalValue) return;
    
    const valorNumerico = parseFloat(editingProposalValue.valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    
    try {
      await updateMeeting.mutateAsync({
        id: editingProposalValue.id,
        valor_proposta: valorNumerico,
      });
      toast.success("Valor da proposta atualizado");
      setEditingProposalValue(null);
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  const [outcomeLoading, setOutcomeLoading] = useState(false);

  const handleWin = async (valorFechado: number, caixaGerado: number) => {
    if (!winModalMeeting) return;
    
    setOutcomeLoading(true);
    try {
      // Call edge function for status + followup cleanup
      const { error: fnError } = await supabase.functions.invoke("set-deal-outcome", {
        body: { meeting_id: winModalMeeting.id, outcome: "fechado" },
      });
      if (fnError) throw fnError;

      // Update financial fields
      await updateMeeting.mutateAsync({
        id: winModalMeeting.id,
        valor_fechado: valorFechado,
        caixa_gerado: caixaGerado,
        fechado_em: new Date().toISOString(),
      });

      // Invalidate followup queries
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["followup-counts"] });


      toast.success("Venda fechada com sucesso! 🏆🎉");
      setWinModalMeeting(null);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao registrar venda");
    } finally {
      setOutcomeLoading(false);
    }
  };

  const handleLoss = async (outcome: "perdida_simples" | "perdida_definitiva", motivo: string) => {
    if (!lossModalMeeting) return;
    
    setOutcomeLoading(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("set-deal-outcome", {
        body: { meeting_id: lossModalMeeting.id, outcome, motivo },
      });
      if (fnError) throw fnError;

      // Invalidate followup queries
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      queryClient.invalidateQueries({ queryKey: ["followup-counts"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });


      toast.info(
        outcome === "perdida_simples"
          ? "Perdido simples — cadência mensal mantida"
          : "Proposta registrada como perdida"
      );
      setLossModalMeeting(null);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao registrar perda");
    } finally {
      setOutcomeLoading(false);
    }
  };

  const handleQualificacaoChange = async (meetingId: string, avaliacao: AvaliacaoReuniao, meeting: Meeting) => {
    try {
      await updateMeeting.mutateAsync({
        id: meetingId,
        avaliacao_reuniao: avaliacao,
      });


      toast.success("Qualificação atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar qualificação");
    }
  };

  const handleSaveValues = async () => {
    if (!editingValues) return;
    
    try {
      await updateMeeting.mutateAsync({
        id: editingValues.id,
        valor_fechado: parseFloat(editingValues.valorFechado) || 0,
        caixa_gerado: parseFloat(editingValues.caixaGerado) || 0,
      });
      toast.success("Valores atualizados");
      setEditingValues(null);
    } catch (error) {
      toast.error("Erro ao salvar");
    }
  };

  const handleFonteChange = async (meetingId: string, fonte: string) => {
    try {
      await updateMeeting.mutateAsync({
        id: meetingId,
        fonte_lead: fonte as PlataformaOrigem,
      });
      toast.success("Fonte atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar fonte");
    }
  };

  const fonteLabels: Record<string, string> = {
    google: "Google",
    meta: "Meta",
    blog: "Blog",
    organico: "Orgânico",
    indicacao: "Indicação",
    reativacao: "Reativação",
    outros: "Outro",
  };

  const startEditing = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  };

  const handleEditBlur = async (meetingId: string, field: string) => {
    if (!editingCell || editingCell.id !== meetingId) return;

    try {
      let value: string | number | null = editValue.trim() || null;
      
      // Converter para número se for campo de valor
      if (field === "valor_fechado" && value) {
        value = parseFloat(value as string);
      }
      
      await updateMeeting.mutateAsync({
        id: meetingId,
        [field]: value,
      });
    } catch (error) {
      toast.error("Erro ao salvar");
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, meetingId: string, field: string) => {
    if (e.key === "Enter") {
      handleEditBlur(meetingId, field);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const getLeadName = (meeting: Meeting) => {
    return meeting.nome_lead || meeting.leads?.nome || "—";
  };

  const getSdrName = (meeting: Meeting) => {
    return meeting.sdr?.nome || "—";
  };

  const getCloserName = (meeting: Meeting) => {
    return meeting.closer?.nome || "—";
  };

  /**
   * Calcula dias de aging: diferença entre hoje e inicio_em,
   * ambos convertidos para America/Sao_Paulo antes do diff.
   */
  const getAgingDays = (inicioEm: string): number => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
    const todayStr = fmt.format(new Date());
    const inicioStr = fmt.format(new Date(inicioEm));
    const diffMs = new Date(todayStr).getTime() - new Date(inicioStr).getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const getAgingBadgeClass = (days: number): string => {
    if (days >= 7) return "bg-destructive/15 text-destructive";
    if (days >= 3) return "bg-warning/15 text-warning";
    return "bg-secondary text-secondary-foreground";
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
    <>
      <div className="rounded-lg border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px] font-semibold">Horário</TableHead>
              <TableHead className="font-semibold">Lead</TableHead>
              <TableHead className="w-[160px] font-semibold">Telefone</TableHead>
              <TableHead className="w-[90px] font-semibold">Data</TableHead>
              <TableHead className="w-[100px] font-semibold">Fonte</TableHead>
              <TableHead className="w-[140px] font-semibold">Status</TableHead>
              <TableHead className="w-[130px] font-semibold">Ações</TableHead>
              <TableHead className="w-[130px] font-semibold">Qualificação</TableHead>
              <TableHead className="w-[110px] font-semibold">Valor Líquido</TableHead>
              <TableHead className="w-[100px] font-semibold">SDR</TableHead>
              <TableHead className="w-[100px] font-semibold">Closer</TableHead>
              <TableHead className="min-w-[180px] font-semibold">Observação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  Nenhuma reunião encontrada para você.
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => (
                <TableRow 
                  key={meeting.id} 
                  className={cn(
                    "hover:bg-muted/30",
                    meeting.status === "reuniao_agendada" && meeting.inicio_em && new Date(meeting.inicio_em) < new Date() && 
                      "bg-destructive/5 hover:bg-destructive/10",
                    meeting.status === "fechado" && "bg-success/5",
                    meeting.status === "perdido" && "bg-destructive/5"
                  )}
                >
                  <TableCell className="font-medium text-sm">
                    {format(new Date(meeting.inicio_em), "HH:mm")}
                  </TableCell>
                  
                  <TableCell>
                    {editingCell?.id === meeting.id && editingCell?.field === "nome_lead" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleEditBlur(meeting.id, "nome_lead")}
                        onKeyDown={(e) => handleKeyDown(e, meeting.id, "nome_lead")}
                        autoFocus
                        className="h-8 text-sm"
                      />
                    ) : (
                      <button
                        onClick={() => startEditing(meeting.id, "nome_lead", getLeadName(meeting))}
                        className="text-left hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 w-full"
                      >
                        <span className="font-medium">{getLeadName(meeting)}</span>
                      </button>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingCell?.id === meeting.id && editingCell?.field === "telefone" ? (
                      <Input
                        type="tel"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => {
                          if (editValue.trim()) {
                            const { valid, normalized } = validatePhone(editValue);
                            if (valid) {
                              setEditValue(normalized);
                              handleEditBlur(meeting.id, "telefone");
                            } else {
                              toast.error(PHONE_ERROR_MESSAGE);
                              setEditingCell(null);
                            }
                          } else {
                            handleEditBlur(meeting.id, "telefone");
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editValue.trim()) {
                              const { valid, normalized } = validatePhone(editValue);
                              if (valid) {
                                setEditValue(normalized);
                                setTimeout(() => handleEditBlur(meeting.id, "telefone"), 0);
                              } else {
                                toast.error(PHONE_ERROR_MESSAGE);
                                setEditingCell(null);
                              }
                            } else {
                              handleEditBlur(meeting.id, "telefone");
                            }
                          } else if (e.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        autoFocus
                        className="h-8 text-sm"
                        placeholder="Ex: +55 11 99999-9999"
                      />
                    ) : (
                      <button
                        onClick={() => startEditing(meeting.id, "telefone", (meeting as any).telefone || "")}
                        className={cn(
                          "text-left hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 w-full text-sm",
                          !(meeting as any).telefone && "text-muted-foreground italic"
                        )}
                      >
                        {(meeting as any).telefone || "Adicionar tel..."}
                      </button>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(meeting.inicio_em), "dd/MM/yy", { locale: ptBR })}
                  </TableCell>
                  
                  <TableCell>
                    <Select
                      value={(meeting as any).fonte_lead || "outros"}
                      onValueChange={(value) => handleFonteChange(meeting.id, value)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full border-0 bg-transparent hover:bg-muted/50">
                        <SelectValue>{fonteLabels[(meeting as any).fonte_lead || "outros"]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="organico">Orgânico</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="reativacao">Reativação</SelectItem>
                        <SelectItem value="outros">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusVendasToggle
                        status={meeting.status}
                        onStatusChange={(status) => handleStatusChange(meeting, status)}
                        disabled={updateMeeting.isPending}
                      />
                      {meeting.status === "proposta_enviada" && (() => {
                        const days = getAgingDays(meeting.inicio_em);
                        const fu = followupCounts.get(meeting.id);
                        return (
                          <>
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              getAgingBadgeClass(days)
                            )}>
                              Aging: {days}d
                            </span>
                            {fu && fu.total > 0 && (
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                fu.atrasados > 0
                                  ? "bg-destructive/15 text-destructive"
                                  : fu.hoje > 0
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-secondary text-secondary-foreground"
                              )}>
                                {fu.atrasados > 0
                                  ? `FU atrasados: ${fu.atrasados}`
                                  : fu.hoje > 0
                                    ? `FU hoje: ${fu.hoje}`
                                    : `FU: ${fu.total}`}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {meeting.status === "proposta_enviada" && (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-success hover:bg-success/90"
                            onClick={() => setWinModalMeeting(meeting)}
                            disabled={updateMeeting.isPending}
                          >
                            Ganhar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => setLossModalMeeting(meeting)}
                            disabled={updateMeeting.isPending}
                          >
                            Perder
                          </Button>
                        </div>
                        <Popover
                          open={editingProposalValue?.id === meeting.id}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingProposalValue({
                                id: meeting.id,
                                valor: ((meeting as any).valor_proposta || "").toString(),
                              });
                            } else {
                              setEditingProposalValue(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button className={cn(
                              "text-xs hover:bg-muted/50 rounded px-1.5 py-0.5 whitespace-nowrap",
                              (meeting as any).valor_proposta 
                                ? "text-primary font-medium" 
                                : "text-warning"
                            )}>
                              {(meeting as any).valor_proposta 
                                ? formatCurrency((meeting as any).valor_proposta)
                                : "📝 Valor"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-3">
                            <div className="space-y-3">
                              <Label className="text-xs font-medium">Valor da Proposta</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="R$ 0,00"
                                value={editingProposalValue?.valor || ""}
                                onChange={(e) => setEditingProposalValue(prev => 
                                  prev ? { ...prev, valor: e.target.value } : null
                                )}
                                onKeyDown={(e) => e.key === "Enter" && handleSaveProposalValue()}
                                className="h-8"
                                autoFocus
                              />
                              <Button 
                                size="sm" 
                                className="w-full" 
                                onClick={handleSaveProposalValue}
                                disabled={updateMeeting.isPending}
                              >
                                {updateMeeting.isPending ? "Salvando..." : "Salvar"}
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {meeting.status === "fechado" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-success font-medium">🏆 Fechado</span>
                        {(role === "admin" || role === "manager") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setRevertMeeting(meeting)}
                            disabled={updateMeeting.isPending}
                          >
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    {meeting.status === "perdido" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-destructive font-medium">💔 Perdido</span>
                        {(role === "admin" || role === "manager") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setRevertMeeting(meeting)}
                            disabled={updateMeeting.isPending}
                          >
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <QualificacaoSelect
                      value={meeting.avaliacao_reuniao as any}
                      onValueChange={(value) => handleQualificacaoChange(meeting.id, value, meeting)}
                      disabled={updateMeeting.isPending}
                    />
                  </TableCell>
                  
                  <TableCell className="text-sm">
                    {meeting.status === "fechado" ? (
                      <Popover 
                        open={editingValues?.id === meeting.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setEditingValues({
                              id: meeting.id,
                              valorFechado: ((meeting as any).valor_fechado || 0).toString(),
                              caixaGerado: ((meeting as any).caixa_gerado || 0).toString(),
                            });
                          } else {
                            setEditingValues(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button className="font-semibold text-success hover:bg-muted/50 rounded px-1 py-0.5">
                            {formatCurrency((meeting as any).valor_fechado)}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">Editar Valores</h4>
                            <div className="space-y-2">
                              <Label className="text-xs">Valor Líquido</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingValues?.valorFechado || ""}
                                onChange={(e) => setEditingValues(prev => 
                                  prev ? { ...prev, valorFechado: e.target.value } : null
                                )}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Entrada (Caixa Gerado)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingValues?.caixaGerado || ""}
                                onChange={(e) => setEditingValues(prev => 
                                  prev ? { ...prev, caixaGerado: e.target.value } : null
                                )}
                                className="h-8"
                              />
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full" 
                              onClick={handleSaveValues}
                              disabled={updateMeeting.isPending}
                            >
                              {updateMeeting.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {getSdrName(meeting)}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {getCloserName(meeting)}
                  </TableCell>
                  
                  <TableCell>
                    {editingCell?.id === meeting.id && editingCell?.field === "observacao" ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleEditBlur(meeting.id, "observacao")}
                        onKeyDown={(e) => handleKeyDown(e, meeting.id, "observacao")}
                        autoFocus
                        className="h-8 text-sm"
                      />
                    ) : (
                      <button
                        onClick={() => startEditing(meeting.id, "observacao", meeting.observacao || "")}
                        className={cn(
                          "text-left hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 w-full text-sm",
                          !meeting.observacao && "text-muted-foreground italic"
                        )}
                      >
                        {meeting.observacao || (meeting as any).motivo_perda || "Adicionar obs..."}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WinModal
        open={!!winModalMeeting}
        onClose={() => setWinModalMeeting(null)}
        onConfirm={handleWin}
        isLoading={outcomeLoading || updateMeeting.isPending}
      />

      <VendasLossModal
        open={!!lossModalMeeting}
        onClose={() => setLossModalMeeting(null)}
        onConfirm={handleLoss}
        isLoading={outcomeLoading}
      />

      <ProposalValueModal
        open={!!proposalModalMeeting}
        onClose={() => setProposalModalMeeting(null)}
        onConfirm={handleProposalConfirm}
        isLoading={proposalSaving}
        leadName={proposalModalMeeting?.nome_lead || proposalModalMeeting?.leads?.nome}
      />

      <AlertDialog open={!!revertMeeting} onOpenChange={(open) => !open && setRevertMeeting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverter status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja reverter o status de{" "}
              <strong>{revertMeeting?.nome_lead || revertMeeting?.leads?.nome || "este lead"}</strong>{" "}
              de <strong>{revertMeeting?.status === "fechado" ? "Fechado" : "Perdido"}</strong> para{" "}
              <strong>Proposta Enviada</strong>? Os valores financeiros e motivo de perda serão limpos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!revertMeeting) return;
                try {
                  await updateMeeting.mutateAsync({
                    id: revertMeeting.id,
                    status: "proposta_enviada",
                    valor_fechado: null,
                    caixa_gerado: null,
                    fechado_em: null,
                    motivo_perda: null,
                  });
                  toast.success("Status revertido para Proposta Enviada");
                  setRevertMeeting(null);
                } catch (error) {
                  toast.error("Erro ao reverter status");
                }
              }}
            >
              Reverter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
