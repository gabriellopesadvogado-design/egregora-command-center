import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Meeting } from "@/hooks/useMeetings";

interface ReuniaoRealizadaModalProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConfirm: (observacao?: string) => void;
  isLoading?: boolean;
}

export function ReuniaoRealizadaModal({ open, meeting, onClose, onConfirm, isLoading }: ReuniaoRealizadaModalProps) {
  const [observacao, setObservacao] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setObservacao("");
    }
  };

  const handleConfirm = () => {
    onConfirm(observacao || undefined);
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>✅ Confirmar Reunião Realizada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {meeting && (
            <p className="text-sm text-muted-foreground">
              Confirma que a reunião com <strong>{meeting.nome_lead}</strong> foi realizada?
            </p>
          )}
          <div className="space-y-2">
            <Label>Observação pós-reunião</Label>
            <Textarea
              placeholder="Como foi a reunião? Pontos relevantes..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Confirmar Realizada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
