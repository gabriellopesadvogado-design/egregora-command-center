import { useState, useMemo } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, subMonths } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { NewLeadModal } from "@/components/leads/NewLeadModal";
import { CreateMeetingModal } from "@/components/leads/CreateMeetingModal";
import { MarkNotEligibleModal } from "@/components/leads/MarkNotEligibleModal";
import { LeadDetailsModal } from "@/components/leads/LeadDetailsModal";
import { useLeadsPage, useNoMeetingCount, useSDRs, type LeadsPageFilters, type LeadWithStatus } from "@/hooks/useLeadsPage";
import { useAuth } from "@/hooks/useAuth";

const origemOptions = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "google_ads", label: "Google Ads" },
  { value: "indicacao", label: "Indicação" },
  { value: "organico", label: "Orgânico" },
  { value: "hubspot_direto", label: "HubSpot Direto" },
  { value: "reativacao", label: "Reativação" },
];

const canalOptions = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "site", label: "Site" },
  { value: "direto", label: "Direto" },
];

const tipoOptions = [
  { value: "nacionalidade_portuguesa", label: "Nac. Portuguesa" },
  { value: "residencia_brasileira", label: "Res. Brasileira" },
  { value: "outro", label: "Outro" },
];

type PeriodKey = "today" | "week" | "month" | "3months" | "all";

function getPeriodRange(period: PeriodKey): { start?: string; end?: string } {
  const now = new Date();
  switch (period) {
    case "today": return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() };
    case "week": return { start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), end: now.toISOString() };
    case "month": return { start: startOfMonth(now).toISOString(), end: now.toISOString() };
    case "3months": return { start: subMonths(now, 3).toISOString(), end: now.toISOString() };
    default: return {};
  }
}

export default function Leads() {
  const { role } = useAuth();
  const isAdminOrGestor = role === "admin" || role === "gestor";
  const canAct = role !== "closer";

  const [searchTerm, setSearchTerm] = useState("");
  const [origem, setOrigem] = useState("all");
  const [canal, setCanal] = useState("all");
  const [tipoInteresse, setTipoInteresse] = useState("all");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [sdrId, setSdrId] = useState("all");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [showNewLead, setShowNewLead] = useState(false);
  const [meetingLead, setMeetingLead] = useState<LeadWithStatus | null>(null);
  const [notEligibleLead, setNotEligibleLead] = useState<LeadWithStatus | null>(null);
  const [detailsLead, setDetailsLead] = useState<LeadWithStatus | null>(null);

  const { data: sdrs = [] } = useSDRs();
  const { data: noMeetingCount = 0 } = useNoMeetingCount();

  const periodRange = getPeriodRange(period);
  const filters: LeadsPageFilters = {
    searchTerm: searchTerm || undefined,
    origem: origem !== "all" ? origem : undefined,
    canal: canal !== "all" ? canal : undefined,
    tipoInteresse: tipoInteresse !== "all" ? tipoInteresse : undefined,
    periodStart: periodRange.start,
    periodEnd: periodRange.end,
    sdrId: sdrId !== "all" ? sdrId : undefined,
  };

  const { data, isLoading } = useLeadsPage(filters, page);
  const leads = data?.leads ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / 25);

  // Client-side sort
  const sortedLeads = useMemo(() => {
    const sorted = [...leads];
    sorted.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? "";
      const bVal = (b as any)[sortField] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [leads, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Leads</h1>
          {noMeetingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {noMeetingCount} sem reunião
            </Badge>
          )}
        </div>
        {canAct && (
          <Button onClick={() => setShowNewLead(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={origem} onValueChange={(v) => { setOrigem(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {origemOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={canal} onValueChange={(v) => { setCanal(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            {canalOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={tipoInteresse} onValueChange={(v) => { setTipoInteresse(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {tipoOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodKey); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta semana</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
          </SelectContent>
        </Select>

        {isAdminOrGestor && (
          <Select value={sdrId} onValueChange={(v) => { setSdrId(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="SDR" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos SDRs</SelectItem>
              {sdrs.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-8 h-9 w-[220px]"
          />
        </div>
      </div>

      {/* Table */}
      <LeadsTable
        leads={sortedLeads}
        isLoading={isLoading}
        canAct={canAct}
        onCreateMeeting={setMeetingLead}
        onMarkNotEligible={setNotEligibleLead}
        onViewDetails={setDetailsLead}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} ({totalCount} leads)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewLeadModal open={showNewLead} onClose={() => setShowNewLead(false)} />
      <CreateMeetingModal open={!!meetingLead} onClose={() => setMeetingLead(null)} lead={meetingLead} />
      <MarkNotEligibleModal open={!!notEligibleLead} onClose={() => setNotEligibleLead(null)} lead={notEligibleLead} />
      <LeadDetailsModal open={!!detailsLead} onClose={() => setDetailsLead(null)} lead={detailsLead} />
    </div>
  );
}
