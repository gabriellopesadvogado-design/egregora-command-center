import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface QualityData {
  campaign: string;
  ruim: number;
  bom: number;
  muito_bom: number;
  custo_ruim: number;
  custo_bom: number;
  custo_muito_bom: number;
  total: number;
  spend: number;
}

interface LeadQualityChartProps {
  data: QualityData[];
  totals: { ruim: number; bom: number; muito_bom: number };
}

const QUALITY_COLORS = {
  muito_bom: "hsl(160, 84%, 39%)",
  bom: "hsl(38, 92%, 50%)",
  ruim: "hsl(350, 80%, 55%)",
};

const QUALITY_LABELS = {
  muito_bom: "Muito Bom",
  bom: "Bom",
  ruim: "Ruim",
};

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { 
  style: "currency", 
  currency: "BRL", 
  maximumFractionDigits: 0 
}).format(n);

export function LeadQualityChart({ data, totals }: LeadQualityChartProps) {
  const pieData = [
    { name: "Boa", value: totals.muito_bom, color: QUALITY_COLORS.muito_bom },
    { name: "Neutra", value: totals.bom, color: QUALITY_COLORS.bom },
    { name: "Ruim", value: totals.ruim, color: QUALITY_COLORS.ruim },
  ].filter(d => d.value > 0);

  const total = totals.ruim + totals.bom + totals.muito_bom;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const pct = total ? ((payload[0].value / total) * 100).toFixed(0) : 0;
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">{payload[0].value} leads ({pct}%)</p>
        </div>
      );
    }
    return null;
  };

  if (!data?.length && total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Nenhum dado de qualidade disponível.<br/>
        <span className="text-xs">Classifique os leads no Conversas para ver aqui.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de pizza geral */}
      {total > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela por campanha */}
      {data?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 text-muted-foreground font-medium">Campanha</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Spend</th>
                <th className="text-right py-2 text-red-400 font-medium">Ruim</th>
                <th className="text-right py-2 text-amber-400 font-medium">Neutra</th>
                <th className="text-right py-2 text-green-400 font-medium">Boa</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Custo/Boa</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.campaign} className="border-b border-border/30 hover:bg-muted/20">
                  <td className="py-2 font-medium max-w-[120px] truncate" title={row.campaign}>
                    {row.campaign}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">
                    {row.spend > 0 ? fmt(row.spend) : "—"}
                  </td>
                  <td className="py-2 text-right text-red-400">{row.ruim}</td>
                  <td className="py-2 text-right text-amber-400">{row.bom}</td>
                  <td className="py-2 text-right text-green-400">{row.muito_bom}</td>
                  <td className="py-2 text-right">{row.muito_bom ? fmt(row.custo_muito_bom) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
