import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { useConversionByPeriod, type PeriodBucket } from "@/hooks/useConversionByPeriod";

function PeriodRow({ bucket }: { bucket: PeriodBucket }) {
  const totalBar = bucket.resolvidas || 1;
  const greenPct = (bucket.ganhas / totalBar) * 100;
  const redPct = (bucket.perdidas / totalBar) * 100;

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm font-medium text-foreground truncate">
        {bucket.label}
      </span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
        {bucket.resolvidas > 0 ? (
          <>
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${greenPct}%` }}
            />
            <div
              className="h-full bg-destructive transition-all"
              style={{ width: `${redPct}%` }}
            />
          </>
        ) : (
          <div className="h-full w-full bg-muted" />
        )}
      </div>
      <span className="w-10 text-right text-sm font-bold text-foreground">
        {bucket.resolvidas > 0 ? `${Math.round(bucket.taxa)}%` : "—"}
      </span>
      
    </div>
  );
}

export function ConversionByPeriod() {
  const { data, isLoading } = useConversionByPeriod();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Conversão por Período
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))
        ) : (
          data?.map((bucket, i) => (
            <PeriodRow key={i} bucket={bucket} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
