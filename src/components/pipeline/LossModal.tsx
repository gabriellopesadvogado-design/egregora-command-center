import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface LossModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivoPerda: string) => void;
  isLoading?: boolean;
}

export function LossModal({ open, onClose, onConfirm, isLoading }: LossModalProps) {
  const [motivoPerda, setMotivoPerda] = useState("");

  const handleConfirm = () => {
    if (!motivoPerda.trim()) {
      toast.error("Informe o motivo da perda");
      return;
    }

    onConfirm(motivoPerda.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Proposta Perdida</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="motivoPerda">Motivo da Perda *</Label>
            <Textarea
              id="motivoPerda"
              placeholder="Descreva o motivo da perda..."
              value={motivoPerda}
              onChange={(e) => setMotivoPerda(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant="destructive"
          >
            {isLoading ? "Salvando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
