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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCelebration } from "@/hooks/useCelebration";

interface WinModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (valorFechado: number, caixaGerado: number) => void;
  isLoading?: boolean;
  valorProposto?: number | null;
}

export function WinModal({ open, onClose, onConfirm, isLoading, valorProposto }: WinModalProps) {
  const [valorFechado, setValorFechado] = useState(valorProposto?.toString() || "");
  const [caixaGerado, setCaixaGerado] = useState("");
  const { triggerFireworks } = useCelebration();

  const handleConfirm = () => {
    const valor = parseFloat(valorFechado);
    const caixa = parseFloat(caixaGerado);

    if (isNaN(valor) || valor <= 0) {
      toast.error("Informe o valor fechado");
      return;
    }

    triggerFireworks();
    onConfirm(valor, isNaN(caixa) ? 0 : caixa);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-success">🎉 Proposta Ganha!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valorFechado">Valor Líquido Fechado *</Label>
            <Input
              id="valorFechado"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valorFechado}
              onChange={(e) => setValorFechado(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caixaGerado">Caixa Gerado (entrada)</Label>
            <Input
              id="caixaGerado"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={caixaGerado}
              onChange={(e) => setCaixaGerado(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-success hover:bg-success/90">
            {isLoading ? "Salvando..." : "Confirmar Fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
