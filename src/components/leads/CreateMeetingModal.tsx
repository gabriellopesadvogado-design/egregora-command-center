import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useCreateMeetingFromLead } from "@/hooks/useLeads";
import { useClosersAndAdmins, useSDRs, type LeadWithStatus } from "@/hooks/useLeadsPage";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: LeadWithStatus | null;
}

const tipoServicoOptions = [
  { value: "nacionalidade_portuguesa", label: "Nacionalidade Portuguesa" },
  { value: "residencia_brasileira", label: "Residência Brasileira" },
  { value: "outro", label: "Outro" },
];

export function CreateMeetingModal({ open, onClose, lead }: Props) {
  const { user, role } = useAuth();
  const { data: closers = [] } = useClosersAndAdmins();
  const { data: sdrs = [] } = useSDRs();
  const createMeeting = useCreateMeetingFromLead();

  const [closerId, setCloserId] = useState("");
  const [sdrId, setSdrId] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [dataReuniao, setDataReuniao] = useState("");
  const [notas, setNotas] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && role === "sdr" && user) {
      setSdrId(user.id);
    }
    if (!isOpen) {
      setCloserId(""); setSdrId(""); setTipoServico(""); setDataReuniao(""); setNotas("");
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!lead) return;
    if (!closerId) { toast.error("Selecione um closer"); return; }

    try {
      await createMeeting.mutateAsync({
        lead_id: lead.id,
        nome_lead: lead.nome,
        email_lead: lead.email,
        telefone_lead: lead.telefone,
        whatsapp_lead: lead.whatsapp,
        nacionalidade: lead.nacionalidade,
        tipo_servico: tipoServico || null,
        status: "novo_lead",
        closer_id: closerId,
        sdr_id: sdrId || user?.id || null,
        data_reuniao: dataReuniao ? new Date(dataReuniao).toISOString() : null,
        notas: notas.trim() || null,
      });
      toast.success(`Reunião criada para ${lead.nome}`);
      onClose();
    } catch {
      toast.error("Erro ao criar reunião");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Reunião</DialogTitle>
          <DialogDescription>Para o lead: {lead?.nome}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Closer responsável *</Label>
            <Select value={closerId} onValueChange={setCloserId}>
              <SelectTrigger><SelectValue placeholder="Selecionar closer" /></SelectTrigger>
              <SelectContent>
                {closers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SDR responsável</Label>
            <Select value={sdrId} onValueChange={setSdrId}>
              <SelectTrigger><SelectValue placeholder="Selecionar SDR" /></SelectTrigger>
              <SelectContent>
                {sdrs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de serviço</Label>
            <Select value={tipoServico} onValueChange={setTipoServico}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {tipoServicoOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data da reunião (opcional)</Label>
            <Input type="datetime-local" value={dataReuniao} onChange={(e) => setDataReuniao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notas iniciais</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observações..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createMeeting.isPending}>
            {createMeeting.isPending ? "Criando..." : "Criar Reunião"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
