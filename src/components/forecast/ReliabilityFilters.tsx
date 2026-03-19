import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Filter, X } from "lucide-react";
import { subDays, addDays } from "date-fns";
import type { ReliabilityFilters as IReliabilityFilters } from "@/hooks/useForecastReliability";
import type { AvaliacaoReuniao, PlataformaOrigem } from "@/hooks/useMeetings";

interface User {
  id: string;
  nome: string;
}

interface ReliabilityFiltersProps {
  filters: IReliabilityFilters;
  onFiltersChange: (filters: IReliabilityFilters) => void;
  viewMode: "daily" | "weekly";
  onViewModeChange: (mode: "daily" | "weekly") => void;
  isCumulative: boolean;
  onCumulativeChange: (value: boolean) => void;
  sdrs: User[];
  closers: User[];
}

const QUICK_PERIODS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
];

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

export function ReliabilityFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  isCumulative,
  onCumulativeChange,
  sdrs,
  closers,
}: ReliabilityFiltersProps) {
  const handleQuickPeriod = (days: number) => {
    const half = Math.floor(days / 2);
    const startDate = subDays(new Date(), half);
    const endDate = addDays(new Date(), half);
    onFiltersChange({ ...filters, startDate, endDate });
  };

  const getActivePeriod = (): number | null => {
    if (!filters.startDate || !filters.endDate) return 60;
    const diffTime = Math.abs(filters.endDate.getTime() - filters.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 29 && diffDays <= 31) return 30;
    if (diffDays >= 59 && diffDays <= 61) return 60;
    if (diffDays >= 89 && diffDays <= 91) return 90;
    return null;
  };

  const activePeriod = getActivePeriod();

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

  const clearFilters = () => {
    onFiltersChange({
      startDate: subDays(new Date(), 30),
      endDate: addDays(new Date(), 30),
    });
  };

  const hasActiveFilters =
    filters.fonte?.length ||
    filters.sdrId ||
    filters.closerId ||
    filters.qualidade?.length;

  const activeFilterCount = [
    filters.fonte?.length ? 1 : 0,
    filters.sdrId ? 1 : 0,
    filters.closerId ? 1 : 0,
    filters.qualidade?.length ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Quick period buttons */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
        {QUICK_PERIODS.map((period) => (
          <Button
            key={period.days}
            variant={activePeriod === period.days ? "default" : "ghost"}
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => handleQuickPeriod(period.days)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      {/* Daily/Weekly toggle */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
        <Button
          variant={viewMode === "daily" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => onViewModeChange("daily")}
        >
          Diário
        </Button>
        <Button
          variant={viewMode === "weekly" ? "default" : "ghost"}
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => onViewModeChange("weekly")}
        >
          Semanal
        </Button>
      </div>

      {/* Cumulative checkbox */}
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5">
        <Checkbox
          id="cumulative"
          checked={isCumulative}
          onCheckedChange={(checked) => onCumulativeChange(!!checked)}
        />
        <Label htmlFor="cumulative" className="text-sm cursor-pointer">
          Acumulado
        </Label>
      </div>

      {/* Additional filters popover */}
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
                      id={`rel-fonte-${option.value}`}
                      checked={filters.fonte?.includes(option.value) || false}
                      onCheckedChange={() => handleFonteToggle(option.value)}
                    />
                    <label
                      htmlFor={`rel-fonte-${option.value}`}
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
                      id={`rel-quality-${option.value}`}
                      checked={filters.qualidade?.includes(option.value) || false}
                      onCheckedChange={() => handleQualityToggle(option.value)}
                    />
                    <label
                      htmlFor={`rel-quality-${option.value}`}
                      className="text-xs cursor-pointer"
                    >
                      {option.emoji} {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
