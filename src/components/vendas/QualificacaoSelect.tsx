import { cn } from "@/lib/utils";
import type { AvaliacaoReuniao } from "@/hooks/useMeetings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QualificacaoSelectProps {
  value: AvaliacaoReuniao | null;
  onValueChange: (value: AvaliacaoReuniao) => void;
  disabled?: boolean;
}

const qualificacaoConfig: Record<AvaliacaoReuniao, { emoji: string; label: string; className: string }> = {
  boa: { 
    emoji: "🌟", 
    label: "Muito Bom", 
    className: "text-yellow-600 dark:text-yellow-400" 
  },
  neutra: { 
    emoji: "👍", 
    label: "Bom", 
    className: "text-blue-600 dark:text-blue-400" 
  },
  ruim: { 
    emoji: "👎", 
    label: "Ruim", 
    className: "text-red-600 dark:text-red-400" 
  },
};

export function QualificacaoSelect({ value, onValueChange, disabled }: QualificacaoSelectProps) {
  const config = value ? qualificacaoConfig[value] : null;

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => onValueChange(v as AvaliacaoReuniao)}
      disabled={disabled}
    >
      <SelectTrigger 
        className={cn(
          "h-8 text-xs w-full border-0 bg-transparent hover:bg-muted/50",
          config?.className
        )}
      >
        <SelectValue placeholder="Qualificar">
          {config ? (
            <span className="flex items-center gap-1.5">
              <span>{config.emoji}</span>
              <span>{config.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Qualificar...</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(qualificacaoConfig).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-1.5">
              <span>{cfg.emoji}</span>
              <span>{cfg.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
