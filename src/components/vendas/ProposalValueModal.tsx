import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProposalValueModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (valorProposta: number, primeiroFollowupEm: string) => void;
  isLoading: boolean;
  leadName?: string;
}

export function ProposalValueModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  leadName,
}: ProposalValueModalProps) {
  const [valor, setValor] = useState("");
  const [followupDate, setFollowupDate] = useState<Date>();
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");

  const handleConfirm = () => {
    const valorNumerico = parseFloat(valor);
    let hasError = false;

    if (!valor || isNaN(valorNumerico) || valorNumerico <= 0) {
      setError("Informe um valor válido maior que zero");
      hasError = true;
    } else {
      setError("");
    }

    if (!followupDate) {
      setDateError("Selecione a data do primeiro follow-up");
      hasError = true;
    } else {
      setDateError("");
    }

    if (hasError) return;

    // Format as YYYY-MM-DD
    const dateStr = format(followupDate!, "yyyy-MM-dd");
    onConfirm(valorNumerico, dateStr);
  };

  const handleClose = () => {
    setValor("");
    setFollowupDate(undefined);
    setError("");
    setDateError("");
    onClose();
  };

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valor da Proposta 🚀</DialogTitle>
          <DialogDescription>
            {leadName
              ? `Informe o valor da proposta enviada para ${leadName}.`
              : "Informe o valor da proposta enviada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="valor-proposta">Valor da Proposta *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                id="valor-proposta"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className="pl-10"
                autoFocus
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label>Quando você vai falar com o lead? *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !followupDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followupDate
                    ? format(followupDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followupDate}
                  onSelect={(date) => {
                    setFollowupDate(date);
                    setDateError("");
                  }}
                  disabled={(date) => date < tomorrow}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {dateError && <p className="text-destructive text-sm">{dateError}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
