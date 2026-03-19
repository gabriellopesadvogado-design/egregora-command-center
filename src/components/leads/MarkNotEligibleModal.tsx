import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMeetingFromLead } from "@/hooks/useLeads";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { LeadWithStatus } from "@/hooks/useLeadsPage";

interface Props {
  open: boolean;
  onClose: () => void;
  lead: LeadWithStatus | null;
}

export function MarkNotEligibleModal({ open, onClose, lead }: Props) {
  const { user } = useAuth();
  const [motivo, setMotivo] = useState("");
  const createMeeting = useCreateMeetingFromLead();

  const handleSubmit = async () => {
    if (!lead || !motivo.trim()) {
      toast.error("Informe o motivo");
      return;
    }

    try {
      await createMeeting.mutateAsync({
        lead_id: lead.id,
        nome_lead: lead.nome,
        email_lead: lead.email,
        telefone_lead: lead.telefone,
        whatsapp_lead: lead.whatsapp,
        status: "nao_elegivel",
        sdr_id: user?.id || null,
        notas: motivo.trim(),
      });
      toast.success(`${lead.nome} marcado como não elegível`);
      setMotivo("");
      onClose();
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como Não Elegível</DialogTitle>
          <DialogDescription>Lead: {lead?.nome}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label>Motivo *</Label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que este lead não é elegível?" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={createMeeting.isPending}>
            {createMeeting.isPending ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
