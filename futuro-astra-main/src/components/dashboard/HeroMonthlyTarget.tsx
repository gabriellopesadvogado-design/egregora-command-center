import { useEffect, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Calendar, Sparkles, TrendingUp } from "lucide-react";
import { useCelebration } from "@/hooks/useCelebration";
import { cn } from "@/lib/utils";

interface MonthlyTargetData {
  target: {
    meta_faturamento: number;
  } | null;
  valorAtual: number;
  qtdFechamentos: number;
  progresso: number;
  diasRestantes: number;
}

interface HeroMonthlyTargetProps {
  data?: MonthlyTargetData | null;
  isLoading?: boolean;
}

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function HeroMonthlyTarget({ data, isLoading }: HeroMonthlyTargetProps) {
  const { triggerFireworks } = useCelebration();
  const celebratedRef = useRef(false);
  const progresso = data?.progresso || 0;

  // Trigger fireworks when monthly goal is achieved
  useEffect(() => {
    if (progresso >= 100 && !celebratedRef.current) {
      celebratedRef.current = true;
      setTimeout(() => triggerFireworks(), 500);
    }
  }, [progresso, triggerFireworks]);

  const mensagemMotivacional = useMemo(() => {
    if (progresso >= 100) return "🏆 META BATIDA! Você é um campeão!";
    if (progresso >= 80) return "🔥 Quase lá! Falta pouco para a glória!";
    if (progresso >= 50) return "💪 No caminho certo! Continue assim!";
    if (progresso >= 25) return "🚀 Bom começo! Vamos acelerar!";
    return "✨ O mês acabou de começar. Bora!";
  }, [progresso]);

  const mesAtual = monthNames[new Date().getMonth()];
  const anoAtual = new Date().getFullYear();

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />;
  }

  if (!data?.target) {
    return (
      <Card className="hero-monthly-container">
        <CardContent className="p-8 text-center">
          <Crown className="h-12 w-12 mx-auto text-warning mb-4" />
          <h2 className="text-xl font-bold mb-2">Meta Mensal não definida</h2>
          <p className="text-muted-foreground">
            Configure uma meta de faturamento para {mesAtual} na página de Metas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const meta = data.target.meta_faturamento;
  const valorAtual = data.valorAtual;
  const faltam = Math.max(0, meta - valorAtual);

  return (
    <Card className={cn(
      "relative overflow-hidden hero-monthly-container",
      progresso >= 80 && progresso < 100 && "goal-pulse",
      progresso >= 100 && "ring-4 ring-warning"
    )}>
      {/* Success Banner */}
      {progresso >= 100 && (
        <div className="absolute top-0 inset-x-0 annual-shine text-center py-2.5 text-white font-bold flex items-center justify-center gap-2 z-10">
          <Crown className="h-5 w-5" />
          META MENSAL BATIDA!
          <Crown className="h-5 w-5" />
        </div>
      )}

      <CardContent className={cn("p-8", progresso >= 100 && "pt-14")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
              <Crown className="h-8 w-8 text-warning" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Meta Mensal</h2>
              <p className="text-muted-foreground">{mesAtual} {anoAtual}</p>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Calendar className="h-4 w-4" />
            {data.diasRestantes} dias restantes
          </Badge>
        </div>

        {/* Motivational Message */}
        <div className="text-center mb-6">
          <p className="text-xl font-semibold text-foreground/80">
            {mensagemMotivacional}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-6">
          <div className="h-10 bg-secondary rounded-full overflow-hidden shadow-inner">
            <div 
              className={cn(
                "h-full transition-all duration-1000 ease-out rounded-full",
                progresso >= 100 ? "annual-shine" : "annual-target-bar"
              )}
              style={{ width: `${Math.min(progresso, 100)}%` }}
            />
          </div>
          {/* Percentage overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              "text-xl font-bold drop-shadow-sm",
              progresso >= 50 ? "text-white" : "text-foreground"
            )}>
              {Math.round(progresso)}%
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-lg mb-6">
          <div className="text-left">
            <p className="text-sm text-muted-foreground mb-1">Faturado</p>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(valorAtual)}
            </p>
          </div>
          <div className="text-center">
            <Sparkles className="h-8 w-8 text-warning mx-auto mb-1" />
            <TrendingUp className="h-6 w-6 text-muted-foreground mx-auto" />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Meta</p>
            <p className="text-3xl font-bold text-muted-foreground">
              {formatCurrency(meta)}
            </p>
          </div>
        </div>

        {/* Info Badges */}
        <div className="flex gap-3 justify-center flex-wrap">
          <Badge 
            variant="secondary" 
            className="px-4 py-2 text-sm font-medium bg-success/10 text-success border-success/20"
          >
            <TrendingUp className="h-4 w-4 mr-1.5" />
            {data.qtdFechamentos} contratos fechados
          </Badge>
          {faltam > 0 && (
            <Badge 
              variant="outline" 
              className="px-4 py-2 text-sm font-medium"
            >
              Faltam {formatCurrencyFull(faltam)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
