import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface QualityChartProps {
  data: {
    boa: number;
    neutra: number;
    ruim: number;
  } | undefined;
  isLoading: boolean;
}

const COLORS = {
  boa: "hsl(var(--success))",
  neutra: "hsl(var(--warning))",
  ruim: "hsl(var(--destructive))",
};

const LABELS = {
  boa: "Boa",
  neutra: "Neutra",
  ruim: "Ruim",
};

export function QualityChart({ data, isLoading }: QualityChartProps) {
  const chartData = data
    ? [
        { name: LABELS.boa, value: data.boa, color: COLORS.boa },
        { name: LABELS.neutra, value: data.neutra, color: COLORS.neutra },
        { name: LABELS.ruim, value: data.ruim, color: COLORS.ruim },
      ].filter((d) => d.value > 0)
    : [];

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  // Add percentage to name for legend display
  const chartDataWithPercent = chartData.map((d) => ({
    ...d,
    name: `${d.name} (${total > 0 ? Math.round((d.value / total) * 100) : 0}%)`,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Qualidade das Reuniões</CardTitle>
        <CardDescription>Distribuição de avaliações</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : total === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhuma reunião avaliada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chartDataWithPercent}
                cx="50%"
                cy="45%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartDataWithPercent.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value, "Reuniões"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 24 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
