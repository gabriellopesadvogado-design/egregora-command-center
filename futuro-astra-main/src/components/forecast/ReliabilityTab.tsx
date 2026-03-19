import { useState } from "react";
import { subDays, addDays } from "date-fns";
import { useForecastReliability, ReliabilityFilters as IReliabilityFilters } from "@/hooks/useForecastReliability";
import { ReliabilityFilters } from "./ReliabilityFilters";
import { ReliabilityChart } from "./ReliabilityChart";
import { ReliabilityCards } from "./ReliabilityCards";
import { useAllProfiles } from "@/hooks/useUsers";

export function ReliabilityTab() {
  const [filters, setFilters] = useState<IReliabilityFilters>({
    startDate: subDays(new Date(), 30),
    endDate: addDays(new Date(), 30),
  });
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("weekly");
  const [isCumulative, setIsCumulative] = useState(false);

  const { data, isLoading } = useForecastReliability(filters);
  const { data: users } = useAllProfiles();

  const sdrs = users?.filter((u) => u.role === "sdr" && u.ativo) || [];
  const closers = users?.filter((u) => u.role === "closer" && u.ativo) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReliabilityFilters
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        isCumulative={isCumulative}
        onCumulativeChange={setIsCumulative}
        sdrs={sdrs}
        closers={closers}
      />

      {/* Chart */}
      <ReliabilityChart
        data={viewMode === "daily" ? data?.dailyData : data?.weeklyData}
        isCumulative={isCumulative}
        isLoading={isLoading}
      />

      {/* Metrics Cards */}
      <ReliabilityCards stats={data} isLoading={isLoading} />
    </div>
  );
}
