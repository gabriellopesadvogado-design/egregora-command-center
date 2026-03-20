import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SimplePeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/pre-venda/SimplePeriodFilter";
import { CloserDayAgenda } from "@/components/pre-venda/CloserDayAgenda";
import { PreVendaTable } from "@/components/pre-venda/PreVendaTable";
import { useMeetings, type MeetingsFilters as FiltersType, type CrmStatus } from "@/hooks/useMeetings";
import { useAllProfiles } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

const PRE_VENDA_STATUSES: CrmStatus[] = ["reuniao_agendada", "reuniao_realizada", "proposta_enviada"];

export default function PreVenda() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCloser, setSelectedCloser] = useState<string | undefined>();

  const { role, user } = useAuth();
  const isAdminOrGestor = role === "admin" || role === "gestor";

  const { data: users = [] } = useAllProfiles();
  const closers = users.filter(u => ["closer", "admin"].includes(u.cargo) && u.ativo);

  const dateRange = getDateRangeForPeriod(period);
  
  const filters: FiltersType = {
    ...dateRange,
    searchTerm: searchTerm || undefined,
    status: PRE_VENDA_STATUSES,
    closerId: selectedCloser || (isAdminOrGestor ? undefined : user?.id),
  };

  const { data: meetings = [], isLoading } = useMeetings(filters);

  // Only show meetings with data_reuniao
  const filteredMeetings = meetings.filter(m => m.data_reuniao);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pré-Venda</h1>
          <p className="text-muted-foreground text-sm">
            Agenda de {format(dateRange.startDate || new Date(), "dd 'de' MMMM", { locale: ptBR })}
            {!isLoading && ` • ${filteredMeetings.length} reuniões`}
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

          {isAdminOrGestor && (
            <Select
              value={selectedCloser || "all"}
              onValueChange={v => setSelectedCloser(v === "all" ? undefined : v)}
            >
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos closers</SelectItem>
                {closers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <SimplePeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      <CloserDayAgenda date={dateRange.startDate || new Date()} />

      <PreVendaTable meetings={filteredMeetings} isLoading={isLoading} />
    </div>
  );
}
