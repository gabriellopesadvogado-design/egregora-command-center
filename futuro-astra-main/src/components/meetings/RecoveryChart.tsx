import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TrendingUp } from "lucide-react";

interface RecoveryChartProps {
  total: number;
  recuperadas: number;
  percentual: number;
  isLoading: boolean;
}

export function RecoveryChart({ total, recuperadas, percentual, isLoading }: RecoveryChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = [
    { name: "Canceladas/No Show", value: total, color: "hsl(var(--muted-foreground))" },
    { name: "Recuperadas", value: recuperadas, color: "hsl(var(--success))" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          Taxa de Recuperação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="flex-1 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  width={120}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    fill="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center px-4 border-l">
            <div className="text-3xl font-bold text-success">{percentual}%</div>
            <div className="text-xs text-muted-foreground">recuperação</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
