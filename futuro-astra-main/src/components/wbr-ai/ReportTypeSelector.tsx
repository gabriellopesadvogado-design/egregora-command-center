import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FileText, TrendingUp } from "lucide-react";

interface ReportTypeSelectorProps {
  value: "WBR_SEMANAL" | "ANALISE_MENSAL";
  onChange: (value: "WBR_SEMANAL" | "ANALISE_MENSAL") => void;
}

export function ReportTypeSelector({ value, onChange }: ReportTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tipo de Relatório</label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as "WBR_SEMANAL" | "ANALISE_MENSAL")}
        className="justify-start"
      >
        <ToggleGroupItem
          value="WBR_SEMANAL"
          aria-label="WBR Semanal"
          className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <FileText className="h-4 w-4" />
          WBR Semanal
        </ToggleGroupItem>
        <ToggleGroupItem
          value="ANALISE_MENSAL"
          aria-label="Análise Mensal"
          className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <TrendingUp className="h-4 w-4" />
          Análise Mensal
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
