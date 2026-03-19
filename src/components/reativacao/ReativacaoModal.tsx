import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FAIXAS = [
  { value: "30_dias_closer", label: "30 dias (Closer)", tipo: "closer" },
  { value: "60_dias_sdr", label: "60 dias (SDR)", tipo: "sdr" },
  { value: "90_dias_sdr", label: "90 dias (SDR)", tipo: "sdr" },
  { value: "180_dias_sdr", label: "180 dias (SDR)", tipo: "sdr" },
] as const;

interface Props {
  meeting: any;
  open: boolean;
  onClose: () => void;
}

export function ReativacaoModal({ meeting, open, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState("");

  const diasPerda = differenceInDays(new Date(), new Date(meeting.updated_at));
  const faixaSugerida = diasPerda <= 30 ? "30_dias_closer" : diasPerda <= 60 ? "60_dias_sdr" : diasPerda <= 90 ? "90_dias_sdr" : "180_dias_sdr";

  const [faixa, setFaixa] = useState(faixaSugerida);
  const [responsavelId, setResponsavelId] = useState("");

  const faixaObj = FAIXAS.find((f) => f.value === faixa)!;
  const cargoFiltro = faixaObj.tipo === "closer" ? ["closer", "admin", "gestor"] : ["sdr"];

  const { data: responsaveis } = useQuery({
    queryKey: ["users_by_cargo", cargoFiltro],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("id, nome, cargo")
        .in("cargo", cargoFiltro)
        .eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (faixaObj.tipo === "closer" && meeting.closer_id) {
      setResponsavelId(meeting.closer_id);
    } else if (responsaveis?.length) {
      setResponsavelId(responsaveis[0].id);
    }
  }, [faixa, responsaveis, meeting.closer_id]);

  const handleReativar = async () => {
    if (!notas.trim()) { toast.error("Preencha as notas de reativação."); return; }
    if (!responsavelId) { toast.error("Selecione o responsável."); return; }
    setSaving(true);

    try {
      const dataHoje = format(new Date(), "dd/MM/yyyy");
      const faixaLabel = FAIXAS.find((f) => f.value === faixa)!.label;
      const notaAppend = `\n[REATIVADO em ${dataHoje}] Faixa: ${faixaLabel}. ${notas.trim()}`;

      // 1. Insert reativacao
      const { error: insertErr } = await (supabase as any).from("crm_reativacoes").insert({
        meeting_id: meeting.id,
        motivo_perda_original: meeting.motivo_perda,
        data_perda: meeting.updated_at,
        faixa_reativacao: faixa,
        responsavel_reativacao_id: responsavelId,
        notas_reativacao: notas.trim(),
        resultado: "em_andamento",
      });
      if (insertErr) throw insertErr;

      // 2. Update meeting
      const updatePayload: any = {
        status: "novo_lead",
        motivo_perda: null,
        notas: (meeting.notas || "") + notaAppend,
      };
      if (faixaObj.tipo === "closer") updatePayload.closer_id = responsavelId;
      else updatePayload.sdr_id = responsavelId;

      const { error: updateErr } = await supabase
        .from("crm_meetings")
        .update(updatePayload)
        .eq("id", meeting.id);
      if (updateErr) throw updateErr;

      toast.success(`Lead ${meeting.nome_lead} reativado com sucesso! Movido para o início do pipeline.`);
      queryClient.invalidateQueries({ queryKey: ["meetings_perdidos"] });
      queryClient.invalidateQueries({ queryKey: ["crm_reativacoes"] });
      onClose();
    } catch (err: any) {
      toast.error("Erro ao reativar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number | null) =>
    val != null ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reativar Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-1">
            <p className="font-medium">{meeting.nome_lead}</p>
            <p className="text-sm text-muted-foreground">Motivo: {meeting.motivo_perda || "—"}</p>
            <p className="text-sm text-muted-foreground">Valor original: {formatCurrency(meeting.valor_proposta)}</p>
            <p className="text-sm text-muted-foreground">
              Perdido em: {meeting.updated_at ? format(new Date(meeting.updated_at), "dd MMM yyyy", { locale: ptBR }) : "—"} ({diasPerda} dias atrás)
            </p>
            <p className="text-sm text-muted-foreground">Closer original: {(meeting as any).closer?.nome || "—"}</p>
          </div>

          {/* Faixa */}
          <div className="space-y-1">
            <Label>Faixa de reativação</Label>
            <Select value={faixa} onValueChange={setFaixa}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FAIXAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-1">
            <Label>Responsável pela reativação</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {responsaveis?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome} ({u.cargo})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label>Notas de reativação *</Label>
            <Textarea
              rows={3}
              placeholder="Por que reativar este lead? O que mudou?"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleReativar} disabled={saving}>
            {saving ? "Reativando..." : "Reativar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
