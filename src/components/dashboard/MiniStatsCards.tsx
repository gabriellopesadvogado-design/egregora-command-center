import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  Wallet,
  Receipt,
  Timer
} from "lucide-react";

interface StatsData {
  reunioesRealizadas: number;
  fechamentos: number;
  taxaConversao: number;
  ticketMedio: number;
  cicloVenda: number;
  valorFechado: number;
  caixaGerado: number;
}

interface MiniStatsCardsProps {
  stats?: StatsData | null;
  isLoading?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const statsConfig = [
  {
    key: "reunioesRealizadas",
    label: "Reuniões",
    icon: Calendar,
    format: (v: number) => v.toString(),
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    key: "fechamentos",
    label: "Fechamentos",
    icon: CheckCircle2,
    format: (v: number) => v.toString(),
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    key: "taxaConversao",
    label: "Conversão",
    icon: TrendingUp,
    format: (v: number) => `${v.toFixed(0)}%`,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    key: "ticketMedio",
    label: "Ticket Médio",
    icon: Receipt,
    format: (v: number) => formatCurrency(v),
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    key: "cicloVenda",
    label: "Ciclo Venda",
    icon: Timer,
    format: (v: number) => `${Math.round(v)}d`,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    key: "valorFechado",
    label: "Valor",
    icon: DollarSign,
    format: (v: number) => formatCurrency(v),
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    key: "caixaGerado",
    label: "Caixa",
    icon: Wallet,
    format: (v: number) => formatCurrency(v),
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

export function MiniStatsCards({ stats, isLoading }: MiniStatsCardsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {statsConfig.map((config) => {
            const Icon = config.icon;
            const value = stats?.[config.key as keyof StatsData] ?? 0;
            
            return (
              <div
                key={config.key}
                className="flex flex-col items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={`p-1.5 rounded-md ${config.bgColor} mb-1.5`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <p className="text-lg font-semibold">{config.format(value)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {config.label}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
