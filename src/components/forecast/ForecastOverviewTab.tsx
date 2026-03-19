import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForecast, ForecastFilters as IForecastFilters } from "@/hooks/useForecast";
import { ForecastCards } from "@/components/forecast/ForecastCards";
import { ForecastCharts } from "@/components/forecast/ForecastCharts";
import { ForecastTable } from "@/components/forecast/ForecastTable";
import { ForecastFilters } from "@/components/forecast/ForecastFilters";
import { useAllProfiles } from "@/hooks/useUsers";
import { PeriodType } from "@/components/pre-venda/SimplePeriodFilter";

export function ForecastOverviewTab() {
  const [filters, setFilters] = useState<IForecastFilters>({
    status: ["proposta_enviada"],
  });
  const [period, setPeriod] = useState<PeriodType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useForecast({ ...filters, searchTerm });
  const { data: users } = useAllProfiles();

  const sdrs = users?.filter((u) => u.cargo === "sdr" && u.ativo) || [];
  const closers = users?.filter((u) => u.cargo === "closer" && u.ativo) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-end">
        <ForecastFilters
          filters={filters}
          onFiltersChange={setFilters}
          period={period}
          onPeriodChange={setPeriod}
          sdrs={sdrs}
          closers={closers}
        />
      </div>

      {/* Stats Cards */}
      <ForecastCards stats={data?.stats} isLoading={isLoading} />

      {/* Charts */}
      <ForecastCharts stats={data?.stats} isLoading={isLoading} />

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Propostas Detalhadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastTable
            proposals={data?.proposals || []}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </CardContent>
      </Card>
    </div>
  );
}
