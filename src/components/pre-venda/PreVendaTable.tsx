import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Phone, MoreHorizontal, Eye, CheckCircle, Send, MessageSquarePlus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickAddRow } from "./QuickAddRow";
import { DealDetailPanel } from "@/components/pipeline/DealDetailPanel";
import { useStatusTransition } from "@/hooks/useStatusTransition";
import { type Meeting, type CrmStatus } from "@/hooks/useMeetings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PreVendaTableProps {
  meetings: Meeting[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  reuniao_agendada: { label: "Agendada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  reuniao_realizada: { label: "Realizada", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  proposta_enviada: { label: "Proposta Enviada", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

export function PreVendaTable({ meetings, isLoading }: PreVendaTableProps) {
  const { requestStatusChange } = useStatusTransition();
  const queryClient = useQueryClient();
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [noteModal, setNoteModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });
  const [noteText, setNoteText] = useState("");

  const handleAddNote = async () => {
    if (!noteModal.meeting || !noteText.trim()) {
      toast.error("Digite uma observação");
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      await supabase.from("crm_notas").insert({
        meeting_id: noteModal.meeting.id,
        user_id: user.id,
        conteudo: noteText.trim(),
        tipo: "nota",
      });
      queryClient.invalidateQueries({ queryKey: ["notas"] });
      toast.success("Observação adicionada");
      setNoteModal({ open: false, meeting: null });
      setNoteText("");
    } catch {
      toast.error("Erro ao adicionar observação");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
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
              <TableHead className="w-[100px] font-semibold">Fonte</TableHead>
              <TableHead className="w-[130px] font-semibold">Status</TableHead>
              <TableHead className="w-[100px] font-semibold">Closer</TableHead>
              <TableHead className="w-[100px] font-semibold">SDR</TableHead>
              <TableHead className="w-[80px] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <QuickAddRow />
            {meetings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma reunião encontrada. Adicione uma acima!
                </TableCell>
              </TableRow>
            ) : (
              meetings.map((meeting) => {
                const status = meeting.status as string;
                const config = statusConfig[status] || { label: status, className: "bg-muted" };
                const isPastUnrealized = status === "reuniao_agendada" && meeting.data_reuniao && new Date(meeting.data_reuniao) < new Date();

                return (
                  <TableRow
                    key={meeting.id}
                    className={cn(
                      "hover:bg-muted/30",
                      isPastUnrealized && "bg-destructive/5 hover:bg-destructive/10"
                    )}
                  >
                    <TableCell className="font-medium text-sm tabular-nums">
                      {meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setSelectedMeeting(meeting)}
                        className="text-left hover:underline font-medium"
                      >
                        {meeting.nome_lead}
                      </button>
                    </TableCell>
                    <TableCell>
                      {meeting.telefone_lead ? (
                        <a
                          href={`tel:${meeting.telefone_lead}`}
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" />
                          {meeting.telefone_lead}
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Sem telefone</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">
                      {meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "dd/MM/yy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {meeting.leads?.origem || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-xs", config.className)}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{meeting.closer?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{meeting.sdr?.nome || "—"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedMeeting(meeting)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {status === "reuniao_agendada" && (
                            <>
                              <DropdownMenuItem onClick={() => requestStatusChange(meeting, "reuniao_realizada")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Realizada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setNoteModal({ open: true, meeting })}>
                                <MessageSquarePlus className="h-4 w-4 mr-2" />
                                Adicionar Observação
                              </DropdownMenuItem>
                            </>
                          )}
                          {status === "reuniao_realizada" && (
                            <DropdownMenuItem onClick={() => requestStatusChange(meeting, "proposta_enviada")}>
                              <Send className="h-4 w-4 mr-2" />
                              Enviar Proposta
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DealDetailPanel
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />

      {/* Quick note modal */}
      <Dialog open={noteModal.open} onOpenChange={o => { if (!o) { setNoteModal({ open: false, meeting: null }); setNoteText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Observação</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Registre uma observação..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNoteModal({ open: false, meeting: null }); setNoteText(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleAddNote}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
