import { cn } from "@/lib/utils";
import { Clock, Bell } from "lucide-react";
import type { Meeting } from "@/hooks/useMeetings";

interface DealCardProps {
  meeting: Meeting;
  hasFollowupToday?: boolean;
  onClick: () => void;
}

function getAgingDays(updatedAt: string | null): number {
  if (!updatedAt) return 0;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getAgingColor(days: number) {
  if (days > 7) return "text-destructive";
  if (days >= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

const formatCurrency = (value: number | null | undefined) => {
  if (!value) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

export function DealCard({ meeting, hasFollowupToday, onClick }: DealCardProps) {
  const days = getAgingDays(meeting.updated_at);
  const responsavel = meeting.closer?.nome || meeting.sdr?.nome || "—";

  return (
    <div
      className="rounded-md border bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1.5"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-semibold text-sm leading-tight truncate">{meeting.nome_lead}</span>
        {hasFollowupToday && (
          <Bell className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
        )}
      </div>

      {meeting.valor_proposta && (
        <p className="text-xs font-medium text-primary">{formatCurrency(meeting.valor_proposta)}</p>
      )}

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground truncate">{responsavel}</span>
        <span className={cn("flex items-center gap-0.5", getAgingColor(days))}>
          <Clock className="h-3 w-3" />
          {days}d
        </span>
      </div>
    </div>
  );
}
