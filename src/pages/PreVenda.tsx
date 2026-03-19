import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MeetingsTable } from "@/components/pre-venda/MeetingsTable";
import { SimplePeriodFilter, getDateRangeForPeriod, type PeriodType } from "@/components/pre-venda/SimplePeriodFilter";
import { CloserDayAgenda } from "@/components/pre-venda/CloserDayAgenda";
import { useMeetings, type MeetingsFilters as FiltersType } from "@/hooks/useMeetings";

export default function PreVenda() {
  const [period, setPeriod] = useState<PeriodType>("today");
  const [searchTerm, setSearchTerm] = useState("");

  const dateRange = getDateRangeForPeriod(period);
  
  const filters: FiltersType = {
    ...dateRange,
    searchTerm: searchTerm || undefined,
  };

  const { data: meetings = [], isLoading } = useMeetings(filters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reuniões 🏆</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento rápido de reuniões</p>
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
        </div>
      </div>

      <CloserDayAgenda date={dateRange.startDate || new Date()} />

      <MeetingsTable meetings={meetings} isLoading={isLoading} />
    </div>
  );
}
