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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const MOTIVOS_PERDA = [
  "Não possui orçamento",
  "Não respondeu proposta",
  "Não assinou contrato",
  "Fechou com corrente",
  "Não consegui contato",
  "Não tem requisitos mínimos",
  "Não quis continuar com o processo",
  "Desqualificado (busca visto para outro país)",
  "Brasileiro",
  "Tem pedido de refúgio",
  "Outro",
] as const;

interface MotivoPerdaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, observacao: string) => void;
  isLoading?: boolean;
}

export function MotivoPerdaModal({ open, onClose, onConfirm, isLoading }: MotivoPerdaModalProps) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleConfirm = () => {
    if (!motivo) {
      toast.error("Selecione o motivo da perda");
      return;
    }
    onConfirm(motivo, observacao.trim());
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setMotivo("");
      setObservacao("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Proposta Perdida</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Motivo da Perda *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_PERDA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacaoPerda">Observação sobre a perda</Label>
            <Textarea
              id="observacaoPerda"
              placeholder="Detalhes adicionais (opcional)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} variant="destructive">
            {isLoading ? "Salvando..." : "Confirmar Perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
