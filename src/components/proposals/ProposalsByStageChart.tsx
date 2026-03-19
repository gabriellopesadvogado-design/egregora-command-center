import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ProposalsByStageChartProps {
  porStatus: {
    proposta_enviada: number;
    ganha: number;
    perdida: number;
  };
}

const statusLabels: Record<string, string> = {
  proposta_enviada: "Em Aberto",
  ganha: "Ganhas",
  perdida: "Perdidas",
};

const statusColors: Record<string, string> = {
  proposta_enviada: "hsl(221, 83%, 53%)",
  ganha: "hsl(142, 76%, 36%)",
  perdida: "hsl(0, 84%, 60%)",
};

export function ProposalsByStageChart({
  porStatus,
}: ProposalsByStageChartProps) {
  const total = porStatus.proposta_enviada + porStatus.ganha + porStatus.perdida;

  const data = Object.entries(porStatus).map(([key, value]) => ({
    name: statusLabels[key],
    value,
    key,
  }));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Propostas por Estágio
          </CardTitle>
          <span className="text-2xl font-bold">{total}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
