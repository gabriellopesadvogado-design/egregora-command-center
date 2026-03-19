import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloserAvailability, type CloserSlot } from "@/hooks/useCloserAvailability";

// Status que indicam reunião realizada
const REALIZED_STATUSES = ["reuniao_realizada", "proposta_enviada", "fechado", "perdido"];

function getSlotColor(slot: CloserSlot): string {
  const meetingTime = new Date(slot.inicioEm);
  const hasPassedTime = isPast(meetingTime);
  
  // Verde - reunião realizada
  if (REALIZED_STATUSES.includes(slot.status)) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
  }
  
  // Vermelho - horário passou mas não foi realizada (agendada ou no_show)
  if (hasPassedTime && slot.status === "reuniao_agendada") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  }
  
  // Laranja - ainda aguardando (agendada e horário não passou)
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
}

interface CloserDayAgendaProps {
  date: Date;
}

export function CloserDayAgenda({ date }: CloserDayAgendaProps) {
  const { data: availability = [], isLoading } = useCloserAvailability(date);

  // Separar closers com reuniões dos livres
  const closersWithMeetings = availability.filter((c) => c.slots.length > 0);
  const closersAvailable = availability.filter((c) => c.slots.length === 0);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (availability.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">
          Agenda de {format(date, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
      </div>

      <div className="space-y-2">
        {/* Closers com horários ocupados - badges âmbar */}
        {closersWithMeetings.map((closer) => (
          <div
            key={closer.closerId}
            className="flex items-start gap-3 p-2 rounded-md bg-muted/40"
          >
            <div className="flex items-center gap-2 min-w-[140px]">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{closer.nome}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {closer.slots.map((slot, idx) => (
                <Badge
                  key={idx}
                  className={`${getSlotColor(slot)} border-0`}
                  title={slot.leadName}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {slot.horario}
                </Badge>
              ))}
            </div>
          </div>
        ))}

        {/* Closers livres - badges verdes */}
        {closersAvailable.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground">Livres:</span>
            <div className="flex flex-wrap gap-1.5">
              {closersAvailable.map((closer) => (
                <Badge
                  key={closer.closerId}
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200 border-0"
                >
                  {closer.nome}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
