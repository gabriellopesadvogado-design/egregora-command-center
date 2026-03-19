import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, DollarSign, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReliabilityStats } from "@/hooks/useForecastReliability";

interface ReliabilityCardsProps {
  stats: ReliabilityStats | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatCard({
  title,
  value,
  icon: Icon,
  tooltip,
  isLoading,
  className,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  tooltip?: string;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("transition-colors", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <div className="text-2xl font-bold mt-1">{value}</div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReliabilityCards({ stats, isLoading }: ReliabilityCardsProps) {
  const gap = stats?.gap || 0;
  const accuracy = stats?.accuracy;
  const isPositiveGap = gap >= 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Forecast (período)"
        value={formatCurrency(stats?.forecastTotal || 0)}
        icon={TrendingUp}
        tooltip="Soma do forecast ponderado das propostas previstas para fechar no período"
        isLoading={isLoading}
      />
      <StatCard
        title="Realizado (período)"
        value={formatCurrency(stats?.realizedTotal || 0)}
        icon={DollarSign}
        tooltip="Soma do valor das propostas efetivamente ganhas no período"
        isLoading={isLoading}
      />
      <StatCard
        title="Gap (R$)"
        value={formatCurrency(Math.abs(gap))}
        icon={isPositiveGap ? TrendingUp : TrendingDown}
        tooltip="Diferença entre Realizado e Forecast. Positivo = superou previsão"
        isLoading={isLoading}
        className={cn(
          "border-l-4",
          isPositiveGap ? "border-l-success" : "border-l-destructive"
        )}
      />
      <StatCard
        title="Acurácia"
        value={accuracy !== null ? `${(accuracy * 100).toFixed(0)}%` : "N/A"}
        icon={Target}
        tooltip="Realizado / Forecast. Acima de 100% = superou previsão"
        isLoading={isLoading}
      />
    </div>
  );
}
