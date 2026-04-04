import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Phone, MessageCircle, Send, MessageSquare, Edit2, Save, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Componente para editar informações migratórias
function MigratoryInfoSection({ meeting }: { meeting: Meeting }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    nacionalidade: meeting.nacionalidade || "",
    servico_interesse: meeting.servico_interesse || "",
    rnm_classificacao: meeting.rnm_classificacao || "",
    rnm_data_emissao: meeting.rnm_data_emissao || "",
    rnm_data_vencimento: meeting.rnm_data_vencimento || "",
    casado_conjuge_brasileiro: meeting.casado_conjuge_brasileiro || false,
    possui_filhos_brasileiros: meeting.possui_filhos_brasileiros || false,
    pais_lingua_portuguesa: meeting.pais_lingua_portuguesa || false,
  });

  // Reset form when meeting changes
  useEffect(() => {
    setFormData({
      nacionalidade: meeting.nacionalidade || "",
      servico_interesse: meeting.servico_interesse || "",
      rnm_classificacao: meeting.rnm_classificacao || "",
      rnm_data_emissao: meeting.rnm_data_emissao || "",
      rnm_data_vencimento: meeting.rnm_data_vencimento || "",
      casado_conjuge_brasileiro: meeting.casado_conjuge_brasileiro || false,
      possui_filhos_brasileiros: meeting.possui_filhos_brasileiros || false,
      pais_lingua_portuguesa: meeting.pais_lingua_portuguesa || false,
    });
    setIsEditing(false);
  }, [meeting.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("crm_meetings")
        .update({
          nacionalidade: formData.nacionalidade || null,
          servico_interesse: formData.servico_interesse || null,
          rnm_classificacao: formData.rnm_classificacao || null,
          rnm_data_emissao: formData.rnm_data_emissao || null,
          rnm_data_vencimento: formData.rnm_data_vencimento || null,
          casado_conjuge_brasileiro: formData.casado_conjuge_brasileiro,
          possui_filhos_brasileiros: formData.possui_filhos_brasileiros,
          pais_lingua_portuguesa: formData.pais_lingua_portuguesa,
        })
        .eq("id", meeting.id);

      if (error) throw error;

      toast.success("Informações migratórias atualizadas!");
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar informações");
    } finally {
      setSaving(false);
    }
  };

  const rnmClassificacoes = [
    "V1 - Pesquisa/Ensino",
    "V2 - Tratamento de Saúde", 
    "V3 - Acolhida Humanitária",
    "V4 - Estudo",
    "V5 - Trabalho",
    "V6 - Férias-Trabalho",
    "V7 - Religioso",
    "F1 - Pesquisador",
    "F2 - Tratamento de Saúde",
    "F3 - Asilado/Refugiado",
    "F4 - Estudante",
    "F5 - Trabalhador sem vínculo",
    "F6 - Trabalhador com vínculo",
    "F7 - Religioso",
    "F8 - Investidor",
    "F9 - Diretor/Administrador",
    "F10 - Cientista/Atleta/Artista",
    "R - Reunião Familiar",
    "P - Permanente",
    "Não possui RNM",
  ];

  const servicosInteresse = [
    "Naturalização",
    "Autorização de Residência",
    "Renovação RNM",
    "Transformação de Visto",
    "Reunião Familiar",
    "Refúgio",
    "Outro",
  ];

  if (!isEditing) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground">Informações Migratórias</h4>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3 w-3 mr-1" /> Editar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Nacionalidade</span>
          <span>{meeting.nacionalidade || "—"}</span>
          <span className="text-muted-foreground">Serviço de Interesse</span>
          <span>{meeting.servico_interesse || "—"}</span>
          <span className="text-muted-foreground">Classificação RNM</span>
          <span>{meeting.rnm_classificacao || "—"}</span>
          <span className="text-muted-foreground">RNM Emissão</span>
          <span>{meeting.rnm_data_emissao ? format(new Date(meeting.rnm_data_emissao), "dd/MM/yyyy") : "—"}</span>
          <span className="text-muted-foreground">RNM Vencimento</span>
          <span>{meeting.rnm_data_vencimento ? format(new Date(meeting.rnm_data_vencimento), "dd/MM/yyyy") : "—"}</span>
          <span className="text-muted-foreground">Cônjuge brasileiro</span>
          <span>{meeting.casado_conjuge_brasileiro ? "✅ Sim" : "—"}</span>
          <span className="text-muted-foreground">Filhos brasileiros</span>
          <span>{meeting.possui_filhos_brasileiros ? "✅ Sim" : "—"}</span>
          <span className="text-muted-foreground">País língua portuguesa</span>
          <span>{meeting.pais_lingua_portuguesa ? "✅ Sim" : "—"}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Editar Informações Migratórias</h4>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
            <X className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Nacionalidade</Label>
            <Input
              value={formData.nacionalidade}
              onChange={(e) => setFormData({ ...formData, nacionalidade: e.target.value })}
              placeholder="Ex: Haitiano"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Serviço de Interesse</Label>
            <Select
              value={formData.servico_interesse}
              onValueChange={(v) => setFormData({ ...formData, servico_interesse: v })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {servicosInteresse.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Classificação RNM</Label>
          <Select
            value={formData.rnm_classificacao}
            onValueChange={(v) => setFormData({ ...formData, rnm_classificacao: v })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Selecione a classificação..." />
            </SelectTrigger>
            <SelectContent>
              {rnmClassificacoes.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data Emissão RNM</Label>
            <Input
              type="date"
              value={formData.rnm_data_emissao}
              onChange={(e) => setFormData({ ...formData, rnm_data_emissao: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Vencimento RNM</Label>
            <Input
              type="date"
              value={formData.rnm_data_vencimento}
              onChange={(e) => setFormData({ ...formData, rnm_data_vencimento: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label className="text-xs text-muted-foreground">Critérios de Elegibilidade</Label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="conjuge"
                checked={formData.casado_conjuge_brasileiro}
                onCheckedChange={(c) => setFormData({ ...formData, casado_conjuge_brasileiro: !!c })}
              />
              <label htmlFor="conjuge" className="text-sm cursor-pointer">
                Casado(a) com brasileiro(a)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filhos"
                checked={formData.possui_filhos_brasileiros}
                onCheckedChange={(c) => setFormData({ ...formData, possui_filhos_brasileiros: !!c })}
              />
              <label htmlFor="filhos" className="text-sm cursor-pointer">
                Possui filhos brasileiros
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="lingua"
                checked={formData.pais_lingua_portuguesa}
                onCheckedChange={(c) => setFormData({ ...formData, pais_lingua_portuguesa: !!c })}
              />
              <label htmlFor="lingua" className="text-sm cursor-pointer">
                País de língua portuguesa
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DealDetailPanel({ meeting, open, onClose }: DealDetailPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const updateMeeting = useUpdateMeeting();
  const meetingId = meeting?.id;
  
  // Buscar contato WhatsApp vinculado
  const { data: whatsappContact } = useQuery({
    queryKey: ["whatsapp-contact-by-phone", meeting?.whatsapp_lead || meeting?.telefone_lead],
    queryFn: async () => {
      const phone = meeting?.whatsapp_lead || meeting?.telefone_lead;
      if (!phone) return null;
      
      const cleanPhone = phone.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("id, phone_number")
        .or(`phone_number.ilike.%${cleanPhone}%,phone_number.ilike.%${cleanPhone.slice(-9)}%`)
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!meeting && !!(meeting.whatsapp_lead || meeting.telefone_lead),
  });

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

          {/* Informações Migratórias (Editável) */}
          <MigratoryInfoSection meeting={meeting} />

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

          {/* Notas e Atividades */}
          <NotasAtividades meetingId={meeting.id} />

          <Separator />

          {/* Links externos */}
          <div className="space-y-2">
            {/* Abrir no WhatsApp (conversa interna) */}
            {whatsappContact ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onClose();
                  navigate(`/conversas?contact=${whatsappContact.id}`);
                }}
              >
                <MessageSquare className="h-4 w-4 text-green-500" />
                Abrir conversa no WhatsApp
              </Button>
            ) : (meeting.whatsapp_lead || meeting.telefone_lead) ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 opacity-50"
                disabled
              >
                <MessageSquare className="h-4 w-4" />
                Sem conversa no WhatsApp
              </Button>
            ) : null}

            {/* HubSpot link */}
            {meeting.hubspot_deal_id && (
              <a
                href={`https://app.hubspot.com/contacts/48864156/record/0-3/${meeting.hubspot_deal_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline p-2"
              >
                <ExternalLink className="h-4 w-4" /> Abrir no HubSpot
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
