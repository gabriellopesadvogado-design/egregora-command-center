import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, CalendarDays } from "lucide-react";
import { format, addMinutes, setHours, setMinutes, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScheduleMessagePopoverProps {
  disabled?: boolean;
  onSchedule: (scheduledAt: Date) => void;
  trigger: React.ReactNode;
}

export const ScheduleMessagePopover = ({
  disabled,
  onSchedule,
  trigger,
}: ScheduleMessagePopoverProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedHour, setSelectedHour] = useState<string>("09");
  const [selectedMinute, setSelectedMinute] = useState<string>("00");

  const hours = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );
  
  const minutes = ["00", "15", "30", "45"];

  const handleSchedule = () => {
    if (!selectedDate) return;

    const scheduledAt = setMinutes(
      setHours(selectedDate, parseInt(selectedHour)),
      parseInt(selectedMinute)
    );

    // Verificar se a data é no futuro (pelo menos 1 minuto)
    const minDate = addMinutes(new Date(), 1);
    if (isBefore(scheduledAt, minDate)) {
      return;
    }

    onSchedule(scheduledAt);
    setOpen(false);
    setSelectedDate(undefined);
  };

  const isValidSchedule = () => {
    if (!selectedDate) return false;
    
    const scheduledAt = setMinutes(
      setHours(selectedDate, parseInt(selectedHour)),
      parseInt(selectedMinute)
    );
    
    return !isBefore(scheduledAt, addMinutes(new Date(), 1));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="end" side="top">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            <span>Agendar envio</span>
          </div>
          
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={ptBR}
            disabled={(date) => isBefore(date, new Date(new Date().setHours(0, 0, 0, 0)))}
            className="rounded-md border"
          />
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedHour} onValueChange={setSelectedHour}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hours.map((hour) => (
                  <SelectItem key={hour} value={hour}>
                    {hour}h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={selectedMinute} onValueChange={setSelectedMinute}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minutes.map((minute) => (
                  <SelectItem key={minute} value={minute}>
                    {minute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedDate && (
            <p className="text-xs text-muted-foreground">
              Envio programado para:{" "}
              <span className="font-medium text-foreground">
                {format(
                  setMinutes(setHours(selectedDate, parseInt(selectedHour)), parseInt(selectedMinute)),
                  "dd/MM/yyyy 'às' HH:mm",
                  { locale: ptBR }
                )}
              </span>
            </p>
          )}
          
          <Button
            onClick={handleSchedule}
            disabled={!isValidSchedule()}
            className="w-full"
          >
            Confirmar agendamento
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
