import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CampaignData {
  campaign: string;
  revenue: number;
  spend: number;
  roas: number;
}

interface AttributionChartProps {
  data: CampaignData[];
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(160, 84%, 39%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(350, 80%, 55%)",
];

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { 
  style: "currency", 
  currency: "BRL",
  maximumFractionDigits: 0 
}).format(n);

export function AttributionChart({ data }: AttributionChartProps) {
  if (!data?.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum dado de campanha disponível
      </div>
    );
  }

  const chartData = data.slice(0, 5).map(d => ({
    name: d.campaign.length > 15 ? d.campaign.slice(0, 15) + "…" : d.campaign,
    receita: d.revenue,
    investido: d.spend,
    roas: d.roas,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.[0]) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">Receita: {fmt(item.receita)}</p>
          <p className="text-sm text-muted-foreground">Investido: {fmt(item.investido)}</p>
          <p className="text-sm text-muted-foreground">ROAS: {item.roas.toFixed(2)}x</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <XAxis type="number" tickFormatter={(v) => fmt(v)} fontSize={11} />
          <YAxis type="category" dataKey="name" width={100} fontSize={11} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
