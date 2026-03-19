import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DailyDataPoint } from "@/hooks/useForecastReliability";

interface ReliabilityChartProps {
  data: DailyDataPoint[] | undefined;
  isCumulative: boolean;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const COLORS = {
  forecast: "hsl(var(--primary))",
  realized: "hsl(142, 76%, 36%)",
};

export function ReliabilityChart({
  data,
  isCumulative,
  isLoading,
}: ReliabilityChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (!isCumulative) return data;

    let forecastCum = 0;
    let realizedCum = 0;

    return data.map((point) => {
      forecastCum += point.forecastValue;
      realizedCum += point.realizedValue;
      return {
        date: point.date,
        forecastValue: forecastCum,
        realizedValue: realizedCum,
      };
    });
  }, [data, isCumulative]);

  const formatDateTick = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const formattedDate = (() => {
        try {
          return format(parseISO(label), "dd/MM/yyyy", { locale: ptBR });
        } catch {
          return label;
        }
      })();

      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrencyFull(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = chartData.length > 0 && chartData.some(
    (d) => d.forecastValue > 0 || d.realizedValue > 0
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Forecast Previsto vs Realizado
            {isCumulative && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                (Acumulado)
              </span>
            )}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                Compara o forecast ponderado previsto (por expected_close_date)
                com o valor real fechado (por data de fechamento). Limitação:
                alterações históricas em expected_close_date não são rastreadas.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateTick}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
              <Line
                type="monotone"
                dataKey="forecastValue"
                name="Forecast Previsto"
                stroke={COLORS.forecast}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="realizedValue"
                name="Realizado"
                stroke={COLORS.realized}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="font-medium">Sem dados para exibir</p>
              <p className="text-sm mt-1">
                Propostas com fechamentos aparecerão aqui.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
