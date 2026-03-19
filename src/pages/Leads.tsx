import { useState, useMemo } from "react";
import { Search, Filter, X, Phone } from "lucide-react";

import { ExportLeadsCsvButton } from "@/components/leads/ExportLeadsCsvButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { AddPhoneModal } from "@/components/leads/AddPhoneModal";
import { LeadsPeriodFilter, getLeadsPeriodDateRange, type LeadsPeriodType } from "@/components/leads/LeadsPeriodFilter";
import { useLeadsWithMeetings, type LeadsFilters, type MeetingStatus, type PlataformaOrigem } from "@/hooks/useLeadsWithMeetings";

const statusOptions: { value: MeetingStatus; label: string; emoji: string }[] = [
  { value: "reuniao_agendada", label: "Agendada", emoji: "🕐" },
  { value: "reuniao_realizada", label: "Realizada", emoji: "✅" },
  { value: "proposta_enviada", label: "Proposta Enviada", emoji: "🚀" },
  { value: "fechado", label: "Fechado", emoji: "🏆" },
  { value: "perdido", label: "Perdido", emoji: "💔" },
  { value: "nao_elegivel", label: "Não Elegível", emoji: "🚫" },
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

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<MeetingStatus[]>([]);
  const [selectedFonte, setSelectedFonte] = useState<PlataformaOrigem[]>([]);
  const [period, setPeriod] = useState<LeadsPeriodType>("all");
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>();
  const [phoneModal, setPhoneModal] = useState<{ leadName: string; meetingId: string } | null>(null);
  const [showOnlyNoPhone, setShowOnlyNoPhone] = useState(false);

  const dateRange = period === "custom" && customRange
    ? { startDate: customRange.start, endDate: customRange.end }
    : getLeadsPeriodDateRange(period);

  const filters: LeadsFilters = {
    searchTerm: searchTerm || undefined,
    status: selectedStatus.length > 0 ? selectedStatus : undefined,
    fonte: selectedFonte.length > 0 ? selectedFonte : undefined,
    ...dateRange,
  };

  const { data: leads = [], isLoading } = useLeadsWithMeetings(filters);

  const leadsWithoutPhone = useMemo(
    () => leads.filter((l) => !l.telefone),
    [leads]
  );

  const leadsWithPhoneCount = useMemo(
    () => leads.filter((l) => l.telefone).length,
    [leads]
  );

  const displayedLeads = showOnlyNoPhone ? leadsWithoutPhone : leads;

  const hasFilters = selectedStatus.length > 0 || selectedFonte.length > 0 || period !== "all";

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
    setPeriod("all");
    setCustomRange(undefined);
    setShowOnlyNoPhone(false);
  };

  return (
    <div className="space-y-4">
      {/* Banner: leads sem telefone */}
      {leadsWithoutPhone.length > 0 && !isLoading && (
        <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">
              {leadsWithoutPhone.length} lead{leadsWithoutPhone.length !== 1 ? "s" : ""} sem telefone cadastrado
            </span>
          </div>
          <Button
            variant={showOnlyNoPhone ? "secondary" : "outline"}
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowOnlyNoPhone(!showOnlyNoPhone)}
          >
            {showOnlyNoPhone ? "Mostrar todos" : "Ver leads sem telefone"}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads 👥</h1>
          <p className="text-muted-foreground text-sm">
            {displayedLeads.length} lead{displayedLeads.length !== 1 ? "s" : ""} encontrado{displayedLeads.length !== 1 ? "s" : ""}
            {showOnlyNoPhone && " (sem telefone)"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ExportLeadsCsvButton leads={displayedLeads} />
          

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-[200px]"
            />
          </div>

          <LeadsPeriodFilter
            value={period}
            onChange={setPeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Filter className="h-4 w-4" />
                Filtros
                {hasFilters && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {selectedStatus.length + selectedFonte.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {statusOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedStatus.includes(option.value)}
                  onCheckedChange={() => toggleStatus(option.value)}
                >
                  {option.emoji} {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuLabel>Origem</DropdownMenuLabel>
              {fonteOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedFonte.includes(option.value)}
                  onCheckedChange={() => toggleFonte(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(hasFilters || showOnlyNoPhone) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-1 text-muted-foreground"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      <LeadsTable
        leads={displayedLeads}
        isLoading={isLoading}
        onAddPhone={(leadName, meetingId) => setPhoneModal({ leadName, meetingId })}
      />

      <AddPhoneModal
        open={!!phoneModal}
        onClose={() => setPhoneModal(null)}
        leadName={phoneModal?.leadName || ""}
        meetingId={phoneModal?.meetingId || ""}
      />
    </div>
  );
}
