import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Meeting } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface ContratoEnviadoModalProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConfirm: (valorConfirmado: number, dataEnvio: string) => void;
  isLoading?: boolean;
}

export function ContratoEnviadoModal({ open, meeting, onClose, onConfirm, isLoading }: ContratoEnviadoModalProps) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());

  useEffect(() => {
    if (open && meeting) {
      setValor(meeting.valor_proposta?.toString() || "");
      setData(new Date());
    }
  }, [open, meeting]);

  const handleConfirm = () => {
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) {
      toast.error("Informe o valor confirmado");
      return;
    }
    onConfirm(v, data.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>📄 Contrato Enviado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {meeting && (
            <p className="text-sm text-muted-foreground">Lead: <strong>{meeting.nome_lead}</strong></p>
          )}
          <div className="space-y-2">
            <Label>Valor confirmado (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de envio do contrato *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(data, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={d => d && setData(d)}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Confirmar Envio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
