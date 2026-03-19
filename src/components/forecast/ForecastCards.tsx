import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DollarSign, TrendingUp, Receipt, PieChart, Info } from "lucide-react";
import type { ForecastStats } from "@/hooks/useForecast";

interface ForecastCardsProps {
  stats: ForecastStats | undefined;
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
  value: string | React.ReactNode;
  icon: React.ElementType;
  tooltip?: string;
  isLoading: boolean;
  className?: string;
}) {
  return (
    <Card className={className}>
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

function ForecastPonderadoCard({
  forecast14Dias,
  forecast30Dias,
  forecast60Dias,
  isLoading,
}: {
  forecast14Dias: number;
  forecast30Dias: number;
  forecast60Dias: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">
                Forecast ponderado
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Forecast ponderado = Valor × Probabilidade baseada na qualidade do lead</p>
                </TooltipContent>
              </Tooltip>
            </div>
            {isLoading ? (
              <div className="space-y-2 mt-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-32" />
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">14 dias:</span>
                  <span className="text-lg font-bold">{formatCurrency(forecast14Dias)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">30 dias:</span>
                  <span className="text-lg font-bold">{formatCurrency(forecast30Dias)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">60 dias:</span>
                  <span className="text-lg font-bold">{formatCurrency(forecast60Dias)}</span>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QualityDistributionCard({
  stats,
  isLoading,
}: {
  stats: ForecastStats | undefined;
  isLoading: boolean;
}) {
  const distribution = stats?.qualityDistribution;
  const total = distribution
    ? distribution.boa.value + distribution.neutra.value + distribution.ruim.value
    : 0;

  const getPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const items = [
    {
      emoji: "🌟",
      label: "Muito Bom",
      value: distribution?.boa.value || 0,
      forecast: distribution?.boa.forecast || 0,
      count: distribution?.boa.count || 0,
      color: "bg-success",
    },
    {
      emoji: "👍",
      label: "Bom",
      value: distribution?.neutra.value || 0,
      forecast: distribution?.neutra.forecast || 0,
      count: distribution?.neutra.count || 0,
      color: "bg-info",
    },
    {
      emoji: "👎",
      label: "Ruim",
      value: distribution?.ruim.value || 0,
      forecast: distribution?.ruim.forecast || 0,
      count: distribution?.ruim.count || 0,
      color: "bg-destructive",
    },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">
            Qualidade do Pipeline
          </p>
          <div className="rounded-lg bg-primary/10 p-2">
            <PieChart className="h-5 w-5 text-primary" />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-sm">{item.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">
                      {getPercentage(item.value).toFixed(0)}% • {formatCurrency(item.value)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} transition-all`}
                      style={{ width: `${getPercentage(item.value)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ForecastCards({ stats, isLoading }: ForecastCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Pipeline em aberto"
        value={formatCurrency(stats?.pipelineTotal || 0)}
        icon={DollarSign}
        isLoading={isLoading}
      />
      <ForecastPonderadoCard
        forecast14Dias={stats?.forecast14Dias || 0}
        forecast30Dias={stats?.forecast30Dias || 0}
        forecast60Dias={stats?.forecast60Dias || 0}
        isLoading={isLoading}
      />
      <StatCard
        title="Ticket médio"
        value={formatCurrency(stats?.ticketMedio || 0)}
        icon={Receipt}
        isLoading={isLoading}
      />
      <QualityDistributionCard stats={stats} isLoading={isLoading} />
    </div>
  );
}
