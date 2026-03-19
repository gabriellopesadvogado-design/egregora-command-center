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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/hooks/useMeetings";

interface RescheduleModalProps {
  open: boolean;
  meeting: Meeting | null;
  onClose: () => void;
  onConfirm: (novaData: Date) => void;
  isLoading?: boolean;
}

export function RescheduleModal({
  open,
  meeting,
  onClose,
  onConfirm,
  isLoading,
}: RescheduleModalProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("10:00");

  const handleConfirm = () => {
    if (!date) return;

    const [hours, minutes] = time.split(":").map(Number);
    const novaData = new Date(date);
    novaData.setHours(hours, minutes, 0, 0);

    onConfirm(novaData);
  };

  const handleClose = () => {
    setDate(undefined);
    setTime("10:00");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar Reunião</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Lead</Label>
            <p className="font-medium">
              {meeting?.nome_lead || meeting?.leads?.nome || "—"}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Closer Responsável</Label>
            <p className="font-medium">{meeting?.closer?.nome || "—"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Nova Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Horário *</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !date}>
            {isLoading ? "Salvando..." : "Confirmar Reagendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
