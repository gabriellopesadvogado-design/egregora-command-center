import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Phone, MessageCircle, Send } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateMeeting, type Meeting } from "@/hooks/useMeetings";
import { NotasAtividades } from "@/components/shared/NotasAtividades";
import { toast } from "sonner";

interface DealDetailPanelProps {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}

const statusLabels: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificado: "Qualificado",
  nao_elegivel: "Não Elegível",
  elegivel: "Elegível",
  reuniao_agendada: "Reunião Agendada",
  reuniao_realizada: "Reunião Realizada",
  proposta_enviada: "Proposta Enviada",
  followup_ativo: "Follow-up Ativo",
  contrato_enviado: "Contrato Enviado",
  fechado: "Fechado",
  perdido: "Perdido",
};

const formatCurrency = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

export function DealDetailPanel({ meeting, open, onClose }: DealDetailPanelProps) {
  const queryClient = useQueryClient();
  const updateMeeting = useUpdateMeeting();
  const [notas, setNotas] = useState("");
  const [notasDirty, setNotasDirty] = useState(false);

  // Sync notas when meeting changes
  const meetingId = meeting?.id;
  useState(() => {
    if (meeting) {
      setNotas(meeting.notas || "");
      setNotasDirty(false);
    }
  });

  // Follow-up steps
  const { data: followups = [] } = useQuery({
    queryKey: ["followups", meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from("crm_followup_steps")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("step_ordem");
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  // Proposals
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals-meeting", meetingId],
    queryFn: async () => {
      if (!meetingId) return [];
      const { data, error } = await supabase
        .from("crm_proposals")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!meetingId,
  });

  const handleSaveNotas = async () => {
    if (!meeting) return;
    try {
      await updateMeeting.mutateAsync({ id: meeting.id, notas });
      setNotasDirty(false);
      toast.success("Notas salvas");
    } catch {
      toast.error("Erro ao salvar notas");
    }
  };

  const handleMarkSent = async (stepId: string) => {
    const { error } = await supabase
      .from("crm_followup_steps")
      .update({ status: "enviado", data_execucao: new Date().toISOString() })
      .eq("id", stepId);
    if (error) {
      toast.error("Erro ao atualizar step");
      return;
    }
    toast.success("Step marcado como enviado");
    queryClient.invalidateQueries({ queryKey: ["followups", meetingId] });
    queryClient.invalidateQueries({ queryKey: ["followup-today"] });
  };

  if (!meeting) return null;

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{meeting.nome_lead}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6">
          {/* Lead data */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Dados do Lead</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{meeting.email_lead || "—"}</span>
              <span className="text-muted-foreground">Telefone</span>
              <span>
                {meeting.telefone_lead ? (
                  <a href={`tel:${meeting.telefone_lead}`} className="text-primary hover:underline flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {meeting.telefone_lead}
                  </a>
                ) : "—"}
              </span>
              <span className="text-muted-foreground">WhatsApp</span>
              <span>
                {meeting.whatsapp_lead ? (
                  <a href={`https://wa.me/${meeting.whatsapp_lead.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> {meeting.whatsapp_lead}
                  </a>
                ) : "—"}
              </span>
              <span className="text-muted-foreground">Nacionalidade</span>
              <span>{meeting.nacionalidade || "—"}</span>
              <span className="text-muted-foreground">Tipo serviço</span>
              <span>{meeting.tipo_servico || "—"}</span>
            </div>
          </section>

          <Separator />

          {/* Deal data */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Deal</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline">{statusLabels[meeting.status || ""] || meeting.status}</Badge>
              <span className="text-muted-foreground">Valor proposta</span>
              <span>{formatCurrency(meeting.valor_proposta)}</span>
              <span className="text-muted-foreground">Valor fechamento</span>
              <span>{formatCurrency(meeting.valor_fechamento)}</span>
              <span className="text-muted-foreground">Closer</span>
              <span>{meeting.closer?.nome || "—"}</span>
              <span className="text-muted-foreground">SDR</span>
              <span>{meeting.sdr?.nome || "—"}</span>
              <span className="text-muted-foreground">Data reunião</span>
              <span>{meeting.data_reuniao ? format(new Date(meeting.data_reuniao), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</span>
              <span className="text-muted-foreground">Data proposta</span>
              <span>{meeting.data_proposta ? format(new Date(meeting.data_proposta), "dd/MM/yyyy", { locale: ptBR }) : "—"}</span>
              <span className="text-muted-foreground">Data fechamento</span>
              <span>{meeting.data_fechamento ? format(new Date(meeting.data_fechamento), "dd/MM/yyyy", { locale: ptBR }) : "—"}</span>
              {meeting.motivo_perda && (
                <>
                  <span className="text-muted-foreground">Motivo perda</span>
                  <span className="text-destructive">{meeting.motivo_perda}</span>
                </>
              )}
            </div>
          </section>

          <Separator />

          {/* Follow-ups */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Follow-ups ({followups.length})</h4>
            {followups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum follow-up</p>
            ) : (
              <div className="space-y-1.5">
                {followups.map((step) => {
                  const isToday = step.data_programada === today;
                  const isPending = step.status === "pendente";
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2 text-sm",
                        isToday && isPending && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300"
                      )}
                    >
                      <div>
                        <span className="font-medium">{step.step_nome}</span>
                        <span className="ml-2 text-muted-foreground text-xs">
                          {format(new Date(step.data_programada), "dd/MM")}
                        </span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{step.status}</Badge>
                      </div>
                      {isPending && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleMarkSent(step.id)}>
                          <Send className="h-3 w-3 mr-1" /> Enviado
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <Separator />

          {/* Proposals */}
          {proposals.length > 0 && (
            <>
              <section className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">Propostas ({proposals.length})</h4>
                {proposals.map((p) => (
                  <div key={p.id} className="rounded-md border p-2 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{p.tipo_servico}</span>
                      <span>{formatCurrency(p.valor)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {p.status} | Envio: {p.data_envio ? format(new Date(p.data_envio), "dd/MM/yyyy") : "—"}
                    </div>
                  </div>
                ))}
              </section>
              <Separator />
            </>
          )}

          {/* Notas */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Notas</h4>
            <Textarea
              value={notas}
              onChange={(e) => { setNotas(e.target.value); setNotasDirty(true); }}
              rows={4}
              placeholder="Adicionar notas..."
            />
            {notasDirty && (
              <Button size="sm" onClick={handleSaveNotas} disabled={updateMeeting.isPending}>
                Salvar notas
              </Button>
            )}
          </section>

          {/* HubSpot link */}
          {meeting.hubspot_deal_id && (
            <a
              href={`https://app.hubspot.com/contacts/48864156/record/0-3/${meeting.hubspot_deal_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir no HubSpot
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
