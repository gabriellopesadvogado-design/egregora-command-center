import { useState, useMemo } from "react";
import { Search, Filter, X } from "lucide-react";
import { subDays, format } from "date-fns";
import { useMeetings, type MeetingsFilters, type PlataformaOrigem } from "@/hooks/useMeetings";
import { useProposalStats } from "@/hooks/useProposalStats";
import { useAllProfiles } from "@/hooks/useUsers";
import { ProposalsByStageChart } from "@/components/proposals/ProposalsByStageChart";
import { AgingChart } from "@/components/proposals/AgingChart";
import { AverageTimeCard } from "@/components/proposals/AverageTimeCard";
import { FollowupComplianceChart } from "@/components/proposals/FollowupComplianceChart";
import { FollowupComplianceTable } from "@/components/proposals/FollowupComplianceTable";
import { useFollowupCompliance } from "@/hooks/useFollowupCompliance";
import { SimplePeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/pre-venda/SimplePeriodFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const fonteOptions: { value: PlataformaOrigem; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "blog", label: "Blog" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "reativacao", label: "Reativação" },
  { value: "outros", label: "Outro" },
];

export default function Proposals() {
  const [period, setPeriod] = useState<PeriodType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCloser, setSelectedCloser] = useState<string | undefined>();
  const [selectedSdr, setSelectedSdr] = useState<string | undefined>();
  const [selectedFonte, setSelectedFonte] = useState<PlataformaOrigem[]>([]);
  const [includeIgnored, setIncludeIgnored] = useState(false);

  const complianceStart = useMemo(() => subDays(new Date(), 30), []);
  const complianceEnd = useMemo(() => new Date(), []);
  const { data: complianceData = [], isLoading: complianceLoading } = useFollowupCompliance({
    startDate: complianceStart,
    endDate: complianceEnd,
    includeIgnored,
  });

  const { data: users = [] } = useAllProfiles();
  const sdrs = users.filter((u) => u.cargo === "sdr" && u.ativo);
  const closers = users.filter((u) => ["closer", "admin", "gestor"].includes(u.cargo) && u.ativo);

  const dateRange = getDateRangeForPeriod(period);
  const filters: MeetingsFilters = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    closerId: selectedCloser,
    sdrId: selectedSdr,
    plataforma: selectedFonte.length > 0 ? selectedFonte : undefined,
    searchTerm: searchTerm || undefined,
  };

  const { data: meetings = [], isLoading } = useMeetings(filters);

  // Filtra apenas meetings com status proposta_enviada, ganha ou perdida
  const propostas = meetings.filter((m) =>
    ["proposta_enviada", "ganha", "perdida"].includes(m.status)
  );

  const stats = useProposalStats(propostas);

  const toggleFonte = (fonte: PlataformaOrigem) => {
    setSelectedFonte((prev) =>
      prev.includes(fonte)
        ? prev.filter((f) => f !== fonte)
        : [...prev, fonte]
    );
  };

  const clearFilters = () => {
    setSelectedFonte([]);
    setSearchTerm("");
    setSelectedCloser(undefined);
    setSelectedSdr(undefined);
  };

  const activeFiltersCount =
    selectedFonte.length +
    (selectedCloser ? 1 : 0) +
    (selectedSdr ? 1 : 0);
  const hasFilters = activeFiltersCount > 0 || searchTerm.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">
            Dashboard de acompanhamento de propostas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-[200px]"
            />
          </div>

          <SimplePeriodFilter value={period} onChange={setPeriod} />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filtros</h4>
                  {hasFilters && (
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
                    value={selectedSdr || "all"}
                    onValueChange={(v) => setSelectedSdr(v === "all" ? undefined : v)}
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
                    value={selectedCloser || "all"}
                    onValueChange={(v) => setSelectedCloser(v === "all" ? undefined : v)}
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

                {/* Origem */}
                <div className="space-y-2">
                  <Label className="text-sm">Origem</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {fonteOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`fonte-${option.value}`}
                          checked={selectedFonte.includes(option.value)}
                          onCheckedChange={() => toggleFonte(option.value)}
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
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProposalsByStageChart porStatus={stats.porStatus} />
          <AgingChart aging={stats.aging} />
          <AverageTimeCard tempoMedio={stats.tempoMedioFechamento} />
        </div>
      )}

      {/* Follow-up Compliance Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cumprimento de Follow-up por Closer</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Incluir ignorados</span>
            <Switch checked={includeIgnored} onCheckedChange={setIncludeIgnored} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Últimos 30 dias — tarefas vencidas até hoje</p>

        {complianceLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[280px] md:col-span-2" />
            <Skeleton className="h-[280px]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FollowupComplianceChart data={complianceData} />
            <FollowupComplianceTable data={complianceData} />
          </div>
        )}
      </div>
    </div>
  );
}
