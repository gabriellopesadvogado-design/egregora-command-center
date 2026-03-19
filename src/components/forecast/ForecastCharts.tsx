import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ForecastStats } from "@/hooks/useForecast";

interface ForecastChartsProps {
  stats: ForecastStats | undefined;
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
  boa: "hsl(142, 76%, 36%)",      // success green
  neutra: "hsl(199, 89%, 48%)",   // info blue
  ruim: "hsl(0, 84%, 60%)",       // destructive red
};

const QUALITY_LABELS = {
  boa: "Muito Bom",
  neutra: "Bom",
  ruim: "Ruim",
};

export function ForecastCharts({ stats, isLoading }: ForecastChartsProps) {
  const distribution = stats?.qualityDistribution;

  const pieData = distribution
    ? [
        { name: "Muito Bom", value: distribution.boa.forecast, color: COLORS.boa },
        { name: "Bom", value: distribution.neutra.forecast, color: COLORS.neutra },
        { name: "Ruim", value: distribution.ruim.forecast, color: COLORS.ruim },
      ].filter((d) => d.value > 0)
    : [];

  const barData = distribution
    ? [
        {
          name: "Ruim",
          pipeline: distribution.ruim.value,
          forecast: distribution.ruim.forecast,
        },
        {
          name: "Bom",
          pipeline: distribution.neutra.value,
          forecast: distribution.neutra.forecast,
        },
        {
          name: "Muito Bom",
          pipeline: distribution.boa.value,
          forecast: distribution.boa.forecast,
        },
      ]
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label || payload[0]?.name}</p>
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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasPieData = pieData.length > 0 && pieData.some((d) => d.value > 0);
  const hasBarData = barData.some((d) => d.pipeline > 0 || d.forecast > 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Forecast por Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPieData ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Pipeline vs Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasBarData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-sm text-foreground">
                      {value === "pipeline" ? "Pipeline" : "Forecast"}
                    </span>
                  )}
                />
                <Bar dataKey="pipeline" name="Pipeline" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="forecast" name="Forecast" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Sem dados para exibir
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
