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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type LossOutcome = "perdido_simples" | "perdido";

interface VendasLossModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (outcome: LossOutcome, motivo: string) => void;
  isLoading?: boolean;
}

export function VendasLossModal({ open, onClose, onConfirm, isLoading }: VendasLossModalProps) {
  const [outcome, setOutcome] = useState<LossOutcome>("perdida_definitiva");
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo da perda");
      return;
    }
    onConfirm(outcome, motivo.trim());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setOutcome("perdida_definitiva");
      setMotivo("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Proposta Perdida</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de perda *</Label>
            <RadioGroup
              value={outcome}
              onValueChange={(v) => setOutcome(v as LossOutcome)}
              className="space-y-2"
            >
              <div className="flex items-start gap-2">
                <RadioGroupItem value="perdida_simples" id="simples" className="mt-0.5" />
                <Label htmlFor="simples" className="cursor-pointer leading-tight">
                  <span className="font-medium">Perdido simples</span>
                  <span className="block text-xs text-muted-foreground">
                    Mantém cadência mensal de follow-up (MEN1–MEN6)
                  </span>
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="perdida_definitiva" id="definitiva" className="mt-0.5" />
                <Label htmlFor="definitiva" className="cursor-pointer leading-tight">
                  <span className="font-medium">Perdido definitivo</span>
                  <span className="block text-xs text-muted-foreground">
                    Remove do follow-up e encerra todos os passos
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivoPerda">Motivo da Perda *</Label>
            <Textarea
              id="motivoPerda"
              placeholder="Descreva o motivo da perda..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
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
