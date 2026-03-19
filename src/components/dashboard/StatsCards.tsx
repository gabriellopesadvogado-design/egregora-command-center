import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, TrendingUp, DollarSign, Wallet, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats: {
    reunioesRealizadas: number;
    fechamentos: number;
    taxaConversao: number;
    valorFechado: number;
    caixaGerado: number;
  } | undefined;
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const cards = [
    {
      name: "Reuniões Realizadas",
      value: stats?.reunioesRealizadas ?? 0,
      icon: Calendar,
      color: "text-info",
      bgColor: "bg-info/10",
      format: (v: number) => v.toString(),
    },
    {
      name: "Fechamentos",
      value: stats?.fechamentos ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
      format: (v: number) => v.toString(),
    },
    {
      name: "Taxa de Conversão",
      value: stats?.taxaConversao ?? 0,
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/10",
      format: (v: number) => `${v.toFixed(1)}%`,
    },
    {
      name: "Valor Fechado",
      value: stats?.valorFechado ?? 0,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      format: (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    },
    {
      name: "Caixa Gerado",
      value: stats?.caixaGerado ?? 0,
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
      format: (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.name} className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.name}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{card.format(card.value)}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
