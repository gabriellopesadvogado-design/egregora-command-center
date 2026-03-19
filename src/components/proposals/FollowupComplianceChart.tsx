import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceRow } from "@/hooks/useFollowupCompliance";

function getColor(val: number | null) {
  if (val === null) return "hsl(var(--muted-foreground))";
  if (val >= 0.8) return "hsl(142 71% 45%)";
  if (val >= 0.5) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
}

interface Props {
  data: ComplianceRow[];
}

export function FollowupComplianceChart({ data }: Props) {
  const chartData = data.map((d) => ({
    name: d.closer_nome,
    compliance: d.compliance !== null ? Math.round(d.compliance * 100) : 0,
    raw: d,
  }));

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cumprimento por Closer (%)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, _name: string, props: any) => {
                  const r = props.payload.raw as ComplianceRow;
                  return [`${value}% (${r.done_total}/${r.due_total} feitos, ${r.overdue_total} atrasados)`, "Cumprimento"];
                }}
              />
              <Bar dataKey="compliance" radius={[0, 4, 4, 0]} barSize={24}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={getColor(entry.raw.compliance)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
