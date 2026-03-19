import { cn } from "@/lib/utils";
import type { MeetingStatus } from "@/hooks/useMeetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StatusToggleProps {
  status: MeetingStatus;
  onStatusChange: (status: MeetingStatus) => void;
  disabled?: boolean;
}

const statusConfig: Record<string, { emoji: string; className: string; label: string }> = {
  novo_lead: { emoji: "🆕", className: "bg-muted text-muted-foreground", label: "Novo Lead" },
  qualificado: { emoji: "✅", className: "bg-info/10 text-info", label: "Qualificado" },
  nao_elegivel: { emoji: "🚫", className: "bg-warning/10 text-warning", label: "Não Elegível" },
  elegivel: { emoji: "👍", className: "bg-success/10 text-success", label: "Elegível" },
  reuniao_agendada: { emoji: "🕐", className: "bg-info/10 text-info", label: "Agendada" },
  reuniao_realizada: { emoji: "✅", className: "bg-success/10 text-success", label: "Realizada" },
  proposta_enviada: { emoji: "🚀", className: "bg-primary/10 text-primary", label: "Proposta Enviada" },
  followup_ativo: { emoji: "📞", className: "bg-warning/10 text-warning", label: "Follow-up Ativo" },
  contrato_enviado: { emoji: "📄", className: "bg-info/10 text-info", label: "Contrato Enviado" },
  fechado: { emoji: "🏆", className: "bg-success/10 text-success", label: "Fechado" },
  perdido: { emoji: "💔", className: "bg-destructive/10 text-destructive", label: "Perdido" },
};

// Status editáveis na pré-venda
const editableStatuses: MeetingStatus[] = ["reuniao_agendada", "reuniao_realizada", "nao_elegivel"];

// Status finais gerenciados pela equipe de Vendas
const finalStatuses: MeetingStatus[] = ["proposta_enviada", "fechado", "perdido"];

export function StatusToggle({ status, onStatusChange, disabled }: StatusToggleProps) {
  const config = statusConfig[status] || statusConfig.novo_lead;
  const isFinalStatus = finalStatuses.includes(status);

  return (
    <Select
      value={status}
      onValueChange={(value) => onStatusChange(value as MeetingStatus)}
      disabled={disabled || isFinalStatus}
    >
      <SelectTrigger 
        className={cn(
          "h-8 w-[160px] border-0 text-xs font-medium",
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
