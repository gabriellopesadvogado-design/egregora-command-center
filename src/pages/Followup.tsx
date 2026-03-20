import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClosers } from "@/hooks/useClosers";
import { cn } from "@/lib/utils";
import { Calendar as RescheduleCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useFollowups,
  useMarkFollowupDone,
  useMarkFollowupIgnored,
  useSetDealOutcome,
  useRescheduleFollowup,
  type FollowupStep,
} from "@/hooks/useFollowups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Copy,
  ExternalLink,
  AlertTriangle,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  CalendarIcon,
  CalendarClock,
  ListTodo,
  Trophy,
  XCircle,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Followup() {
  const { profile, role } = useAuth();
  const isAdminManager = role === "admin" || role === "gestor";
  const [selectedCloserId, setSelectedCloserId] = useState<string | undefined>(
    isAdminManager ? undefined : profile?.id
  );
  const [canalFilter, setCanalFilter] = useState<string>("all");
  const [codigoFilter, setCodigoFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [showAll, setShowAll] = useState(false);

  const closers = useClosers();
  const { overdue, forToday, next7days, future, isLoading, error } = useFollowups(
    isAdminManager ? selectedCloserId : profile?.id,
    showAll
  );

  const [doneModal, setDoneModal] = useState<FollowupStep | null>(null);
  const [ignoreConfirm, setIgnoreConfirm] = useState<string | null>(null);
  const [doneNotas, setDoneNotas] = useState("");
  const [updateDeal, setUpdateDeal] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("proposta_enviada");
  const markDone = useMarkFollowupDone();
  const markIgnored = useMarkFollowupIgnored();
  const setDealOutcome = useSetDealOutcome();
  const rescheduleFollowup = useRescheduleFollowup();
  const { toast } = useToast();

  // Reschedule modal state
  const [rescheduleStep, setRescheduleStep] = useState<FollowupStep | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleCanal, setRescheduleCanal] = useState<"whatsapp" | "ligacao">("whatsapp");
  const [rescheduleHorario, setRescheduleHorario] = useState("");
  const [rescheduleNotas, setRescheduleNotas] = useState("");
  const [reschedulePause, setReschedulePause] = useState(true);

  // Outcome modals state
  const [winConfirm, setWinConfirm] = useState<FollowupStep | null>(null);
  const [lossModal, setLossModal] = useState<FollowupStep | null>(null);
  const [lossTipo, setLossTipo] = useState<"perdido_simples" | "perdido">("perdido_simples");
  const [lossMotivo, setLossMotivo] = useState("");

  const [openSections, setOpenSections] = useState({
    overdue: true,
    today: true,
    week: true,
    future: false,
  });

  // Client-side filters
  const applyFilters = (items: FollowupStep[]) => {
    let filtered = items;
    if (canalFilter !== "all") {
      filtered = filtered.filter((s) => s.canal === canalFilter);
    }
    if (codigoFilter.trim()) {
      const q = codigoFilter.trim().toLowerCase();
      filtered = filtered.filter((s) => s.codigo?.toLowerCase().includes(q));
    }
    if (phoneFilter.trim()) {
      const digits = phoneFilter.trim();
      filtered = filtered.filter((s) =>
        s.meeting?.telefone?.replace(/\D/g, "").endsWith(digits)
      );
    }
    return filtered;
  };

  const filteredOverdue = useMemo(() => applyFilters(overdue), [overdue, canalFilter, codigoFilter, phoneFilter]);
  const filteredToday = useMemo(() => applyFilters(forToday), [forToday, canalFilter, codigoFilter, phoneFilter]);
  const filteredWeek = useMemo(() => applyFilters(next7days), [next7days, canalFilter, codigoFilter, phoneFilter]);
  const filteredFuture = useMemo(() => applyFilters(future), [future, canalFilter, codigoFilter, phoneFilter]);

  const totalPendentes = filteredOverdue.length + filteredToday.length + filteredWeek.length + filteredFuture.length;

  const handleDoneConfirm = () => {
    if (!doneModal) return;
    markDone.mutate(
      {
        id: doneModal.id,
        notas: doneNotas || undefined,
        newMeetingStatus: updateDeal ? newStatus : undefined,
        meetingId: updateDeal ? doneModal.meeting_id : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "Follow-up concluído!" });
          setDoneModal(null);
          setDoneNotas("");
          setUpdateDeal(false);
        },
        onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
      }
    );
  };

  const handleIgnoreConfirm = () => {
    if (!ignoreConfirm) return;
    markIgnored.mutate(ignoreConfirm, {
      onSuccess: () => {
        toast({ title: "Follow-up ignorado" });
        setIgnoreConfirm(null);
      },
      onError: () => toast({ title: "Erro ao ignorar", variant: "destructive" }),
    });
  };

  const handleWinConfirm = () => {
    if (!winConfirm) return;
    setDealOutcome.mutate(
      { meetingId: winConfirm.meeting_id, outcome: "fechado" },
      {
        onSuccess: () => {
          toast({ title: "🏆 Deal marcado como ganho!" });
          setWinConfirm(null);
        },
        onError: (err) =>
          toast({ title: "Erro ao marcar como ganho", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleLossConfirm = () => {
    if (!lossModal) return;
    setDealOutcome.mutate(
      {
        meetingId: lossModal.meeting_id,
        outcome: lossTipo,
        motivo: lossMotivo || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: lossTipo === "perdida_simples"
              ? "Deal perdido (simples) — cadência mensal mantida"
              : "Deal perdido (definitivo) — removido do follow-up",
          });
          setLossModal(null);
          setLossMotivo("");
          setLossTipo("perdida_simples");
        },
        onError: (err) =>
          toast({ title: "Erro ao marcar como perdido", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleRescheduleConfirm = () => {
    if (!rescheduleStep || !rescheduleDate) return;
    const dataPrevistaStr = format(rescheduleDate, "yyyy-MM-dd");
    rescheduleFollowup.mutate(
      {
        meeting_id: rescheduleStep.meeting_id,
        canal: rescheduleCanal,
        data_prevista: dataPrevistaStr,
        horario: rescheduleHorario || undefined,
        notas: rescheduleNotas || undefined,
        pause_default: reschedulePause,
        step_id: rescheduleStep.id,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "📅 Follow-up reagendado!",
            description: `${data.paused_steps} tarefa(s) padrão pausada(s).`,
          });
          setRescheduleStep(null);
          setRescheduleDate(undefined);
          setRescheduleCanal("whatsapp");
          setRescheduleHorario("");
          setRescheduleNotas("");
          setReschedulePause(true);
        },
        onError: (err) =>
          toast({ title: "Erro ao reagendar", description: err.message, variant: "destructive" }),
      }
    );
  };

  const conversasUrl = import.meta.env.VITE_CONVERSAS_URL;

  const handleCopyCodigo = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast({ title: "Código copiado!" });
  };

  const CanalIcon = ({ canal }: { canal: "ligacao" | "whatsapp" }) =>
    canal === "whatsapp" ? (
      <span title="WhatsApp" className="flex items-center gap-1 text-green-600">
        <MessageCircle className="h-4 w-4" /> WA
      </span>
    ) : (
      <span title="Ligação" className="flex items-center gap-1 text-blue-600">
        <Phone className="h-4 w-4" /> Lig
      </span>
    );

  const renderTable = (items: FollowupStep[], showDiasAtraso: boolean) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum follow-up nesta seção.
        </p>
      );
    }
    const today = new Date();
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Qualificação</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Data Prevista</TableHead>
            {showDiasAtraso && <TableHead>Dias atraso</TableHead>}
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((step) => {
            const dataPrev = parseISO(step.data_prevista);
            const diasAtraso = differenceInDays(today, dataPrev);
            return (
              <TableRow key={step.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {step.meeting?.nome_lead || "—"}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {step.meeting?.telefone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {step.meeting.telefone}
                            </span>
                          ) : (
                            "Sem telefone"
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {step.notas && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MessageCircle className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs whitespace-pre-wrap">
                            {step.notas}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {step.meeting?.avaliacao_reuniao ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      step.meeting.avaliacao_reuniao === "boa" ? "text-yellow-600 dark:text-yellow-400" :
                      step.meeting.avaliacao_reuniao === "neutra" ? "text-blue-600 dark:text-blue-400" :
                      "text-red-600 dark:text-red-400"
                    }`}>
                      {step.meeting.avaliacao_reuniao === "boa" ? "🌟 Muito Bom" :
                       step.meeting.avaliacao_reuniao === "neutra" ? "👍 Bom" : "👎 Ruim"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1.5">
                    {step.tipo === "manual" && (
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">
                        MANUAL
                      </Badge>
                    )}
                    {step.tipo !== "manual" && (
                      step.codigo ? (
                        <>
                          <Badge className="text-sm font-mono tracking-wide px-3 py-1">
                            {step.codigo}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleCopyCodigo(step.codigo!)}
                            title="Copiar código"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )
                    )}
                    {step.manual_titulo && (
                      <span className="text-xs text-muted-foreground italic">{step.manual_titulo}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <CanalIcon canal={step.canal as "ligacao" | "whatsapp"} />
                </TableCell>
                <TableCell>
                  <div>
                    {format(dataPrev, "dd/MM/yyyy", { locale: ptBR })}
                    {(step.codigo === "DC-LIG" || step.tipo === "manual") && (() => {
                      const match = step.notas?.match(/Horário:\s*(\d{1,2}:\d{2})/);
                      return match ? (
                        <div className="text-xs text-muted-foreground">às {match[1]}</div>
                      ) : null;
                    })()}
                  </div>
                </TableCell>
                {showDiasAtraso && (
                  <TableCell>
                    <Badge variant="destructive" className="font-bold">
                      {diasAtraso}d
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    {conversasUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(conversasUrl, "_blank")}
                        title="Abrir app de conversas"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" /> Conversas
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDoneModal(step);
                        setDoneNotas("");
                        setUpdateDeal(false);
                      }}
                    >
                      <Check className="h-4 w-4 mr-1" /> Feito
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIgnoreConfirm(step.id)}
                    >
                      <X className="h-4 w-4 mr-1" /> Ignorar
                    </Button>
                    {/* Reagendar button */}
                    {step.status === "pendente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                        onClick={() => {
                          setRescheduleStep(step);
                          setRescheduleCanal(step.canal as "ligacao" | "whatsapp");
                          setRescheduleDate(undefined);
                          setRescheduleHorario("");
                          setRescheduleNotas("");
                          setReschedulePause(true);
                        }}
                      >
                        <CalendarClock className="h-4 w-4 mr-1" /> Reagendar
                      </Button>
                    )}
                    {/* Deal outcome buttons */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500/50 text-green-700 hover:bg-green-50 hover:text-green-800 dark:text-green-400 dark:hover:bg-green-950"
                      onClick={() => setWinConfirm(step)}
                    >
                      <Trophy className="h-4 w-4 mr-1" /> Ganha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setLossModal(step);
                        setLossTipo("perdida_simples");
                        setLossMotivo("");
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Perdida
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const SectionHeader = ({
    title,
    count,
    open,
    sectionKey,
    icon,
    destructive,
  }: {
    title: string;
    count: number;
    open: boolean;
    sectionKey: "overdue" | "today" | "week" | "future";
    icon?: React.ReactNode;
    destructive?: boolean;
  }) => (
    <CollapsibleTrigger
      className={`flex items-center gap-2 w-full py-3 px-3 text-left font-semibold text-base rounded-md transition-colors ${
        destructive
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "hover:bg-muted/50"
      }`}
      onClick={() =>
        setOpenSections((p) => ({ ...p, [sectionKey]: !p[sectionKey] }))
      }
    >
      {open ? (
        <ChevronDown className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0" />
      )}
      {icon}
      {title}
      <Badge
        variant={destructive ? "destructive" : "secondary"}
        className="ml-auto"
      >
        {count}
      </Badge>
    </CollapsibleTrigger>
  );

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Follow-ups</h1>
        <p className="text-destructive">Erro ao carregar follow-ups.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Follow-ups</h1>

      {/* KPI Cards */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className={filteredOverdue.length > 0 ? "border-destructive bg-destructive/5" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 shrink-0 ${filteredOverdue.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">Atrasados</p>
                <p className={`text-2xl font-bold ${filteredOverdue.length > 0 ? "text-destructive" : ""}`}>
                  {filteredOverdue.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Para hoje</p>
                <p className="text-2xl font-bold">{filteredToday.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Próx. 7 dias</p>
                <p className="text-2xl font-bold">{filteredWeek.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ListTodo className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total pendentes</p>
                <p className="text-2xl font-bold">{totalPendentes}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {isAdminManager && (
          <Select
            value={selectedCloserId || "all"}
            onValueChange={(v) =>
              setSelectedCloserId(v === "all" ? undefined : v)
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os closers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os closers</SelectItem>
              {closers.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={canalFilter} onValueChange={setCanalFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
            <SelectItem value="ligacao">📞 Ligação</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtrar código..."
          value={codigoFilter}
          onChange={(e) => setCodigoFilter(e.target.value)}
          className="w-[180px]"
        />

        <Input
          placeholder="Últimos 4 dígitos tel..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value.replace(/\D/g, ""))}
          className="w-[170px]"
          maxLength={4}
        />

        <div className="flex items-center gap-2 ml-auto">
          <Switch checked={showAll} onCheckedChange={setShowAll} id="show-all" />
          <Label htmlFor="show-all" className="text-sm cursor-pointer">
            Mostrar feitos/ignorados
          </Label>
        </div>
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Atrasados */}
          <Collapsible open={openSections.overdue}>
            <SectionHeader
              title="Atrasados"
              count={filteredOverdue.length}
              open={openSections.overdue}
              sectionKey="overdue"
              icon={<AlertTriangle className="h-4 w-4" />}
              destructive={filteredOverdue.length > 0}
            />
            <CollapsibleContent>
              {filteredOverdue.length > 0 && (
                <div className="border border-destructive/30 rounded-md bg-destructive/5 mt-1 overflow-hidden">
                  {renderTable(filteredOverdue, true)}
                </div>
              )}
              {filteredOverdue.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum follow-up atrasado 🎉
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Para hoje */}
          <Collapsible open={openSections.today}>
            <SectionHeader
              title="Para hoje"
              count={filteredToday.length}
              open={openSections.today}
              sectionKey="today"
              icon={<Clock className="h-4 w-4" />}
            />
            <CollapsibleContent>
              {renderTable(filteredToday, false)}
            </CollapsibleContent>
          </Collapsible>

          {/* Próximos 7 dias */}
          <Collapsible open={openSections.week}>
            <SectionHeader
              title="Próximos 7 dias"
              count={filteredWeek.length}
              open={openSections.week}
              sectionKey="week"
              icon={<Calendar className="h-4 w-4" />}
            />
            <CollapsibleContent>
              {renderTable(filteredWeek, false)}
            </CollapsibleContent>
          </Collapsible>

          {/* Futuros */}
          <Collapsible open={openSections.future}>
            <SectionHeader
              title="Futuros"
              count={filteredFuture.length}
              open={openSections.future}
              sectionKey="future"
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <CollapsibleContent>
              {renderTable(filteredFuture, false)}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Done Modal */}
      <Dialog open={!!doneModal} onOpenChange={(o) => !o && setDoneModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={doneNotas}
                onChange={(e) => setDoneNotas(e.target.value)}
                placeholder="Anotações sobre o contato..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={updateDeal} onCheckedChange={setUpdateDeal} />
              <Label>Atualizar status do deal?</Label>
            </div>
            {updateDeal && (
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposta_enviada">
                    Proposta Enviada
                  </SelectItem>
                  <SelectItem value="ganha">Ganha</SelectItem>
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDoneConfirm} disabled={markDone.isPending}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Confirm */}
      <AlertDialog
        open={!!ignoreConfirm}
        onOpenChange={(o) => !o && setIgnoreConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ignorar follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              Este follow-up será marcado como ignorado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleIgnoreConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Win Confirm */}
      <AlertDialog
        open={!!winConfirm}
        onOpenChange={(o) => !o && setWinConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🏆 Marcar deal como ganho?</AlertDialogTitle>
            <AlertDialogDescription>
              O deal de <strong>{winConfirm?.meeting?.nome_lead || "—"}</strong> será marcado como ganho e todos os follow-ups pendentes serão encerrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setDealOutcome.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWinConfirm}
              disabled={setDealOutcome.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {setDealOutcome.isPending ? "Salvando..." : "Confirmar Ganha"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loss Modal */}
      <Dialog open={!!lossModal} onOpenChange={(o) => !o && setLossModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar deal como perdido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deal: <strong>{lossModal?.meeting?.nome_lead || "—"}</strong>
            </p>
            <RadioGroup value={lossTipo} onValueChange={(v) => setLossTipo(v as any)}>
              <div className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="perdida_simples" id="loss-simples" className="mt-0.5" />
                <Label htmlFor="loss-simples" className="cursor-pointer">
                  <div className="font-medium">Perdido simples (manter mensal)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Encerra a cadência inicial, mas mantém os follow-ups mensais (MEN1, MEN2, MEN3, MEN6).
                  </div>
                </Label>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="perdida_definitiva" id="loss-definitiva" className="mt-0.5" />
                <Label htmlFor="loss-definitiva" className="cursor-pointer">
                  <div className="font-medium">Perdido definitivo</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Remove completamente do follow-up. Todos os steps pendentes serão encerrados.
                  </div>
                </Label>
              </div>
            </RadioGroup>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={lossMotivo}
                onChange={(e) => setLossMotivo(e.target.value)}
                placeholder="Por que o deal foi perdido?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossModal(null)} disabled={setDealOutcome.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleLossConfirm}
              disabled={setDealOutcome.isPending}
            >
              {setDealOutcome.isPending ? "Salvando..." : "Confirmar Perdida"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={!!rescheduleStep} onOpenChange={(o) => !o && setRescheduleStep(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📅 Reagendar Follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-muted-foreground text-sm">Lead</Label>
              <p className="font-medium">{rescheduleStep?.meeting?.nome_lead || "—"}</p>
            </div>

            <div className="space-y-2">
              <Label>Nova Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !rescheduleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDate
                      ? format(rescheduleDate, "PPP", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <RescheduleCalendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => date < new Date()}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Canal *</Label>
              <Select value={rescheduleCanal} onValueChange={(v) => setRescheduleCanal(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="ligacao">📞 Ligação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário (opcional)</Label>
              <Input
                type="time"
                value={rescheduleHorario}
                onChange={(e) => setRescheduleHorario(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={rescheduleNotas}
                onChange={(e) => setRescheduleNotas(e.target.value)}
                placeholder="Ex: Lead pediu para ligar semana que vem..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
              <Switch
                checked={reschedulePause}
                onCheckedChange={setReschedulePause}
                id="pause-default"
              />
              <Label htmlFor="pause-default" className="cursor-pointer text-sm leading-tight">
                <span className="font-medium">Pausar cadência padrão</span>
                <span className="block text-xs text-muted-foreground">
                  Encerra tarefas padrão pendentes futuras e mantém apenas esta tarefa manual
                </span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleStep(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRescheduleConfirm}
              disabled={rescheduleFollowup.isPending || !rescheduleDate}
            >
              {rescheduleFollowup.isPending ? "Salvando..." : "Confirmar Reagendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
