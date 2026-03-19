import { cn } from "@/lib/utils";
import type { MeetingStatus } from "@/hooks/useMeetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusVendasToggleProps {
  status: MeetingStatus;
  onStatusChange: (status: MeetingStatus) => void;
  disabled?: boolean;
}

const statusConfig: Record<MeetingStatus, { emoji: string; className: string; label: string }> = {
  agendada: { 
    emoji: "🕐", 
    className: "bg-info/10 text-info", 
    label: "Agendada" 
  },
  aconteceu: { 
    emoji: "✅", 
    className: "bg-success/10 text-success", 
    label: "Realizada" 
  },
  proposta_enviada: { 
    emoji: "🚀", 
    className: "bg-primary/10 text-primary", 
    label: "Proposta Enviada" 
  },
  ganha: { 
    emoji: "🏆", 
    className: "bg-success/10 text-success", 
    label: "Ganha" 
  },
  perdida: { 
    emoji: "💔", 
    className: "bg-destructive/10 text-destructive", 
    label: "Perdida" 
  },
  no_show: { 
    emoji: "🚫", 
    className: "bg-warning/10 text-warning", 
    label: "No Show" 
  },
  cancelada: { 
    emoji: "❌", 
    className: "bg-destructive/10 text-destructive", 
    label: "Cancelada" 
  },
};

// Status editáveis em Vendas (inclui proposta_enviada e no_show)
const editableStatuses: MeetingStatus[] = ["agendada", "aconteceu", "no_show", "proposta_enviada", "cancelada"];

// Status finais que não podem ser alterados
const finalStatuses: MeetingStatus[] = ["ganha", "perdida"];

export function StatusVendasToggle({ status, onStatusChange, disabled }: StatusVendasToggleProps) {
  const config = statusConfig[status];
  const isFinalStatus = finalStatuses.includes(status);

  return (
    <Select
      value={status}
      onValueChange={(value) => onStatusChange(value as MeetingStatus)}
      disabled={disabled || isFinalStatus}
    >
      <SelectTrigger 
        className={cn(
          "h-8 w-[180px] border-0 text-xs font-medium",
          config.className,
          (disabled || isFinalStatus) && "opacity-70 cursor-not-allowed"
        )}
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span className="text-sm">{config.emoji}</span>
            {config.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {editableStatuses.map((s) => (
          <SelectItem key={s} value={s}>
            <span className="flex items-center gap-1.5">
              <span className="text-sm">{statusConfig[s].emoji}</span>
              {statusConfig[s].label}
            </span>
          </SelectItem>
        ))}
        {/* Status finais - mostrar apenas se for o status atual */}
        {isFinalStatus && (
          <SelectItem value={status} disabled>
            <span className="flex items-center gap-1.5">
              <span className="text-sm">{config.emoji}</span>
              {config.label}
            </span>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
