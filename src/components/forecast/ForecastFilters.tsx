import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import {
  SimplePeriodFilter,
  PeriodType,
  getDateRangeForPeriod,
} from "@/components/pre-venda/SimplePeriodFilter";
import type { ForecastFilters as IForecastFilters } from "@/hooks/useForecast";
import type { Database } from "@/integrations/supabase/types";

type MeetingStatus = Database["public"]["Enums"]["meeting_status"];
type AvaliacaoReuniao = Database["public"]["Enums"]["avaliacao_reuniao"];
type PlataformaOrigem = Database["public"]["Enums"]["plataforma_origem"];

interface User {
  id: string;
  nome: string;
}

interface ForecastFiltersProps {
  filters: IForecastFilters;
  onFiltersChange: (filters: IForecastFilters) => void;
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  sdrs: User[];
  closers: User[];
}

const FONTE_OPTIONS: { value: PlataformaOrigem; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "blog", label: "Blog" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "reativacao", label: "Reativação" },
  { value: "outros", label: "Outro" },
];

const QUALITY_OPTIONS: { value: AvaliacaoReuniao; label: string; emoji: string }[] = [
  { value: "boa", label: "Muito Bom", emoji: "🌟" },
  { value: "neutra", label: "Bom", emoji: "👍" },
  { value: "ruim", label: "Ruim", emoji: "👎" },
];

const STATUS_OPTIONS: { value: MeetingStatus; label: string; emoji: string }[] = [
  { value: "proposta_enviada", label: "Em aberto", emoji: "🚀" },
  { value: "ganha", label: "Ganha", emoji: "🏆" },
  { value: "perdida", label: "Perdida", emoji: "💔" },
];

export function ForecastFilters({
  filters,
  onFiltersChange,
  period,
  onPeriodChange,
  sdrs,
  closers,
}: ForecastFiltersProps) {
  const handlePeriodChange = (newPeriod: PeriodType) => {
    onPeriodChange(newPeriod);
    const dateRange = getDateRangeForPeriod(newPeriod);
    onFiltersChange({
      ...filters,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  const handleFonteToggle = (fonte: PlataformaOrigem) => {
    const currentFontes = filters.fonte || [];
    const newFontes = currentFontes.includes(fonte)
      ? currentFontes.filter((f) => f !== fonte)
      : [...currentFontes, fonte];
    onFiltersChange({ ...filters, fonte: newFontes.length > 0 ? newFontes : undefined });
  };

  const handleQualityToggle = (quality: AvaliacaoReuniao) => {
    const currentQuality = filters.qualidade || [];
    const newQuality = currentQuality.includes(quality)
      ? currentQuality.filter((q) => q !== quality)
      : [...currentQuality, quality];
    onFiltersChange({
      ...filters,
      qualidade: newQuality.length > 0 ? newQuality : undefined,
    });
  };

  const handleStatusToggle = (status: MeetingStatus) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];
    onFiltersChange({
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
    onPeriodChange("all");
  };

  const hasActiveFilters =
    filters.fonte?.length ||
    filters.sdrId ||
    filters.closerId ||
    filters.qualidade?.length ||
    filters.status?.length ||
    filters.next14Days ||
    period !== "all";

  const activeFilterCount = [
    filters.fonte?.length ? 1 : 0,
    filters.sdrId ? 1 : 0,
    filters.closerId ? 1 : 0,
    filters.qualidade?.length ? 1 : 0,
    filters.status?.length ? 1 : 0,
    filters.next14Days ? 1 : 0,
    period !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SimplePeriodFilter value={period} onChange={handlePeriodChange} />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto px-2 py-1 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* SDR */}
            <div className="space-y-2">
              <Label className="text-sm">SDR</Label>
              <Select
                value={filters.sdrId || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    sdrId: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sdrs.map((sdr) => (
                    <SelectItem key={sdr.id} value={sdr.id}>
                      {sdr.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Closer */}
            <div className="space-y-2">
              <Label className="text-sm">Closer</Label>
              <Select
                value={filters.closerId || "all"}
                onValueChange={(value) =>
                  onFiltersChange({
                    ...filters,
                    closerId: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {closers.map((closer) => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fonte/Canal */}
            <div className="space-y-2">
              <Label className="text-sm">Canal/Fonte</Label>
              <div className="flex flex-wrap gap-2">
                {FONTE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`fonte-${option.value}`}
                      checked={filters.fonte?.includes(option.value) || false}
                      onCheckedChange={() => handleFonteToggle(option.value)}
                    />
                    <label
                      htmlFor={`fonte-${option.value}`}
                      className="text-xs cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualidade */}
            <div className="space-y-2">
              <Label className="text-sm">Qualidade</Label>
              <div className="flex flex-wrap gap-2">
                {QUALITY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`quality-${option.value}`}
                      checked={filters.qualidade?.includes(option.value) || false}
                      onCheckedChange={() => handleQualityToggle(option.value)}
                    />
                    <label
                      htmlFor={`quality-${option.value}`}
                      className="text-xs cursor-pointer"
                    >
                      {option.emoji} {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-sm">Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status?.includes(option.value) || false}
                      onCheckedChange={() => handleStatusToggle(option.value)}
                    />
                    <label
                      htmlFor={`status-${option.value}`}
                      className="text-xs cursor-pointer"
                    >
                      {option.emoji} {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Próximos 14 dias */}
            <div className="flex items-center justify-between">
              <Label htmlFor="next14days" className="text-sm cursor-pointer">
                Próximos 14 dias
              </Label>
              <Switch
                id="next14days"
                checked={filters.next14Days || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, next14Days: checked })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
