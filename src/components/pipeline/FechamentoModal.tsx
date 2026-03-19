import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useCelebration } from "@/hooks/useCelebration";

interface FechamentoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (valorFechamento: number, dataFechamento: string) => void;
  isLoading?: boolean;
  valorProposta?: number | null;
}

export function FechamentoModal({ open, onClose, onConfirm, isLoading, valorProposta }: FechamentoModalProps) {
  const [valor, setValor] = useState(valorProposta?.toString() || "");
  const [data, setData] = useState<Date>(new Date());
  const { triggerFireworks } = useCelebration();

  const handleConfirm = () => {
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) {
      toast.error("Informe o valor de fechamento");
      return;
    }
    triggerFireworks();
    onConfirm(v, data.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-success">🎉 Fechamento!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor de Fechamento *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Fechamento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(data, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => d && setData(d)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading} className="bg-success hover:bg-success/90">
            {isLoading ? "Salvando..." : "Confirmar Fechamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
