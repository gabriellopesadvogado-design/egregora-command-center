import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { validatePhone, PHONE_ERROR_MESSAGE } from "@/utils/normalizePhone";
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
import { StatusToggle } from "./StatusToggle";
import { QuickAddRow } from "./QuickAddRow";
import { useUpdateMeeting, type Meeting, type MeetingStatus, type PlataformaOrigem } from "@/hooks/useMeetings";

import { useClosers } from "@/hooks/useClosers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCelebration } from "@/hooks/useCelebration";

interface MeetingsTableProps {
  meetings: Meeting[];
  isLoading: boolean;
}

export function MeetingsTable({ meetings, isLoading }: MeetingsTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const updateMeeting = useUpdateMeeting();
  const { data: closers = [] } = useClosers();
  const { triggerConfetti } = useCelebration();
  

  const handleStatusChange = async (meeting: Meeting, newStatus: MeetingStatus) => {
    try {
      await updateMeeting.mutateAsync({
        id: meeting.id,
        status: newStatus,
      });

      
      if (newStatus === "reuniao_realizada") {
        triggerConfetti();
        toast.success("Reunião realizada! 🎉");
      } else {
        toast.success("Status atualizado");
      }
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleCloserChange = async (meetingId: string, closerId: string) => {
    try {
      await updateMeeting.mutateAsync({
        id: meetingId,
        closer_id: closerId,
      });
      toast.success("Closer atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar closer");
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
      await updateMeeting.mutateAsync({
        id: meetingId,
        [field]: editValue.trim() || null,
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

  const getCloserName = (closerId: string) => {
    return closers.find((c) => c.id === closerId)?.nome || "—";
  };

  const getSdrName = (meeting: Meeting) => {
    return (meeting as any).sdr?.nome || "—";
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
    <div className="rounded-lg border overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px] font-semibold">Horário</TableHead>
            <TableHead className="font-semibold">Lead</TableHead>
            <TableHead className="w-[160px] font-semibold">Telefone</TableHead>
            <TableHead className="w-[90px] font-semibold">Data</TableHead>
            <TableHead className="w-[100px] font-semibold">Fonte</TableHead>
            <TableHead className="w-[100px] font-semibold">Status</TableHead>
            <TableHead className="w-[120px] font-semibold">Closer</TableHead>
            <TableHead className="w-[100px] font-semibold">SDR</TableHead>
            <TableHead className="min-w-[180px] font-semibold">Observação</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <QuickAddRow />
          
          {meetings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                Nenhuma reunião encontrada. Adicione uma acima!
              </TableCell>
            </TableRow>
          ) : (
            meetings.map((meeting) => (
              <TableRow 
                key={meeting.id} 
                className={cn(
                  "hover:bg-muted/30",
                  meeting.status === "agendada" && new Date(meeting.inicio_em) < new Date() && 
                    "bg-red-100 hover:bg-red-200 dark:bg-red-950/50 dark:hover:bg-red-950/70"
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
                  <StatusToggle
                    status={meeting.status}
                    onStatusChange={(status) => handleStatusChange(meeting, status)}
                    disabled={updateMeeting.isPending}
                  />
                </TableCell>
                
                <TableCell>
                  <Select
                    value={meeting.closer_id}
                    onValueChange={(id) => handleCloserChange(meeting.id, id)}
                  >
                    <SelectTrigger className="h-8 text-xs w-full border-0 bg-transparent hover:bg-muted/50">
                      <SelectValue>{getCloserName(meeting.closer_id)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {closers.map((closer) => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                <TableCell className="text-sm text-muted-foreground">
                  {getSdrName(meeting)}
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
                      {meeting.observacao || "Adicionar obs..."}
                    </button>
                  )}
                </TableCell>
                
                <TableCell></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
