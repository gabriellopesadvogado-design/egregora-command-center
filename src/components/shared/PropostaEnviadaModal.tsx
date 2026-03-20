import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Meeting } from "@/hooks/useMeetings";
import { toast } from "sonner";

interface PropostaEnviadaModalProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConfirm: (valorProposta: number, dataProposta: string, observacao?: string) => void;
  isLoading?: boolean;
}

export function PropostaEnviadaModal({ open, meeting, onClose, onConfirm, isLoading }: PropostaEnviadaModalProps) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState<Date>(new Date());
  const [observacao, setObservacao] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      onClose();
      setValor("");
      setData(new Date());
      setObservacao("");
    }
  };

  const handleConfirm = () => {
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) {
      toast.error("Informe o valor da proposta");
      return;
    }
    onConfirm(v, data.toISOString(), observacao || undefined);
    setValor("");
    setData(new Date());
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🚀 Registrar Proposta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {meeting && (
            <p className="text-sm text-muted-foreground">Lead: <strong>{meeting.nome_lead}</strong></p>
          )}
          <div className="space-y-2">
            <Label>Valor da proposta (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={e => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Data da proposta *</Label>
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
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              placeholder="Detalhes da proposta..."
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Registrar Proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
