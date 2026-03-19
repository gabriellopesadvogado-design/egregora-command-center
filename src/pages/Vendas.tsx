import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
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
import { VendasTable } from "@/components/vendas/VendasTable";
import { SimplePeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/pre-venda/SimplePeriodFilter";
import { useCloserMeetings } from "@/hooks/useCloserMeetings";
import { useAllProfiles } from "@/hooks/useUsers";
import type { MeetingsFilters as FiltersType, MeetingStatus, PlataformaOrigem } from "@/hooks/useMeetings";

const statusOptions: { value: MeetingStatus; label: string; emoji: string }[] = [
  { value: "agendada", label: "Agendada", emoji: "🕐" },
  { value: "aconteceu", label: "Realizada", emoji: "✅" },
  { value: "proposta_enviada", label: "Proposta Enviada", emoji: "🚀" },
  { value: "ganha", label: "Ganha", emoji: "🏆" },
  { value: "perdida", label: "Perdida", emoji: "💔" },
  { value: "no_show", label: "No Show", emoji: "🚫" },
  { value: "cancelada", label: "Cancelada", emoji: "❌" },
];

const fonteOptions: { value: PlataformaOrigem; label: string }[] = [
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "blog", label: "Blog" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "reativacao", label: "Reativação" },
  { value: "outros", label: "Outro" },
];

export default function Vendas() {
  const [period, setPeriod] = useState<PeriodType>("this_week");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<MeetingStatus[]>([]);
  const [selectedFonte, setSelectedFonte] = useState<PlataformaOrigem[]>([]);
  const [selectedCloser, setSelectedCloser] = useState<string | undefined>();
  const [selectedSdr, setSelectedSdr] = useState<string | undefined>();

  const { data: users = [] } = useAllProfiles();
  const sdrs = users.filter((u) => u.role === "sdr" && u.ativo);
  const closers = users.filter((u) => ["closer", "admin", "manager"].includes(u.role) && u.ativo);

  const dateRange = getDateRangeForPeriod(period);
  
  const filters = {
    ...dateRange,
    searchTerm: searchTerm || undefined,
    status: selectedStatus.length > 0 ? selectedStatus : undefined,
    plataforma: selectedFonte.length > 0 ? selectedFonte : undefined,
    closerId: selectedCloser,
    sdrId: selectedSdr,
  };

  const { data: meetings = [], isLoading } = useCloserMeetings(filters);

  const toggleStatus = (status: MeetingStatus) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const toggleFonte = (fonte: PlataformaOrigem) => {
    setSelectedFonte((prev) =>
      prev.includes(fonte)
        ? prev.filter((f) => f !== fonte)
        : [...prev, fonte]
    );
  };

  const clearFilters = () => {
    setSelectedStatus([]);
    setSelectedFonte([]);
    setSearchTerm("");
    setSelectedCloser(undefined);
    setSelectedSdr(undefined);
  };

  const activeFiltersCount = 
    selectedStatus.length + 
    selectedFonte.length + 
    (selectedCloser ? 1 : 0) + 
    (selectedSdr ? 1 : 0);
  const hasFilters = activeFiltersCount > 0 || searchTerm.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendas 💼</h1>
          <p className="text-muted-foreground text-sm">
            Suas reuniões e oportunidades
            {!isLoading && ` • ${meetings.length} reuniões encontradas`}
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
                {/* Header com botão limpar */}
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

                {/* SDR - Select */}
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

                {/* Closer - Select */}
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

                {/* Status - Checkboxes em grid */}
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {statusOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`status-${option.value}`}
                          checked={selectedStatus.includes(option.value)}
                          onCheckedChange={() => toggleStatus(option.value)}
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

                {/* Origem - Checkboxes em grid */}
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

      <VendasTable meetings={meetings} isLoading={isLoading} />
    </div>
  );
}
