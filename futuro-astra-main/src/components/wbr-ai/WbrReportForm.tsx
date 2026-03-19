import { useState } from "react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportTypeSelector } from "./ReportTypeSelector";
import { TrafficInputs } from "./TrafficInputs";
import { SqlInputs } from "./SqlInputs";
import type {
  ManualInputs,
  TrafficSpend,
  SqlInputs as SqlInputsType,
} from "@/hooks/useWbrAiReports";

interface WbrReportFormProps {
  onSubmit: (params: {
    report_type: "WBR_SEMANAL" | "ANALISE_MENSAL";
    date_start: string;
    date_end: string;
    premium_mode: boolean;
    manual_inputs: ManualInputs;
  }) => void;
  isLoading: boolean;
}

export function WbrReportForm({ onSubmit, isLoading }: WbrReportFormProps) {
  // Default to last week
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });

  const [reportType, setReportType] = useState<"WBR_SEMANAL" | "ANALISE_MENSAL">(
    "WBR_SEMANAL"
  );
  const [dateStart, setDateStart] = useState<Date>(lastWeekStart);
  const [dateEnd, setDateEnd] = useState<Date>(lastWeekEnd);
  const [premiumMode, setPremiumMode] = useState(false);
  const [trafficSpend, setTrafficSpend] = useState<TrafficSpend | null>(null);
  const [sqlInputs, setSqlInputs] = useState<SqlInputsType | null>(null);
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      report_type: reportType,
      date_start: format(dateStart, "yyyy-MM-dd"),
      date_end: format(dateEnd, "yyyy-MM-dd"),
      premium_mode: premiumMode,
      manual_inputs: {
        traffic_spend: trafficSpend,
        sql: sqlInputs,
        observacoes_do_gestor: observacoes || undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Report Type */}
      <ReportTypeSelector value={reportType} onChange={setReportType} />

      {/* Date Range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateStart && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateStart ? (
                  format(dateStart, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateStart}
                onSelect={(date) => date && setDateStart(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateEnd && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateEnd ? (
                  format(dateEnd, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateEnd}
                onSelect={(date) => date && setDateEnd(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Premium Mode */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="premium-mode" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warning" />
            Modo Premium
          </Label>
          <p className="text-sm text-muted-foreground">
            Usa GPT-4.1 para análises mais profundas (mais lento)
          </p>
        </div>
        <Switch
          id="premium-mode"
          checked={premiumMode}
          onCheckedChange={setPremiumMode}
        />
      </div>

      {/* Optional Inputs */}
      <div className="space-y-4">
        <TrafficInputs value={trafficSpend} onChange={setTrafficSpend} />
        <SqlInputs value={sqlInputs} onChange={setSqlInputs} />
      </div>

      {/* Manager Observations */}
      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações do Gestor (Opcional)</Label>
        <Textarea
          id="observacoes"
          placeholder="Adicione contexto ou observações que a IA deve considerar na análise..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full gap-2"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Gerando relatório...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Gerar Relatório com IA
          </>
        )}
      </Button>
    </form>
  );
}
