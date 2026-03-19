import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, Calendar, Trophy } from "lucide-react";
import { useCelebration } from "@/hooks/useCelebration";

interface WeeklyTargetData {
  target: {
    meta_fechamentos_qtd: number;
    meta_fechamentos_valor?: number | null;
  } | null;
  atual: {
    qtd: number;
    valor: number;
  };
  progresso: {
    qtd: number;
    valor: number | null;
  };
}

interface MonthlyTargetData {
  target: {
    meta_faturamento: number;
  } | null;
  valorAtual: number;
  progresso: number;
  diasRestantes: number;
}

interface HeroTargetsProps {
  weeklyData?: WeeklyTargetData | null;
  monthlyData?: MonthlyTargetData | null;
  isLoading?: boolean;
}

function CircularProgress({ 
  progress, 
  size = 140, 
  strokeWidth = 10,
  className = ""
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const getColor = () => {
    if (progress >= 100) return "hsl(var(--success))";
    if (progress >= 80) return "hsl(var(--success) / 0.7)";
    if (progress >= 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{Math.round(progress)}%</span>
      </div>
    </div>
  );
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

export function HeroTargets({ weeklyData, monthlyData, isLoading }: HeroTargetsProps) {
  const { triggerGoalCelebration, triggerFireworks } = useCelebration();
  const weeklyCelebratedRef = useRef(false);
  const monthlyCelebratedRef = useRef(false);

  // Trigger celebrations when goals are met
  useEffect(() => {
    if (weeklyData?.progresso?.qtd && weeklyData.progresso.qtd >= 100 && !weeklyCelebratedRef.current) {
      weeklyCelebratedRef.current = true;
      setTimeout(() => triggerGoalCelebration(), 500);
    }
  }, [weeklyData?.progresso?.qtd, triggerGoalCelebration]);

  useEffect(() => {
    if (monthlyData?.progresso && monthlyData.progresso >= 100 && !monthlyCelebratedRef.current) {
      monthlyCelebratedRef.current = true;
      setTimeout(() => triggerFireworks(), 1000);
    }
  }, [monthlyData?.progresso, triggerFireworks]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[220px]" />
        <Skeleton className="h-[220px]" />
      </div>
    );
  }

  const weeklyProgress = weeklyData?.progresso?.qtd || 0;
  const monthlyProgress = monthlyData?.progresso || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Meta Semanal */}
      <Card className={`relative overflow-hidden ${weeklyProgress >= 90 ? 'goal-pulse' : ''} ${weeklyProgress >= 100 ? 'ring-2 ring-success' : ''}`}>
        {weeklyProgress >= 100 && (
          <div className="absolute top-0 left-0 right-0 bg-success text-success-foreground text-center py-1.5 text-sm font-semibold flex items-center justify-center gap-2 animate-fade-in">
            <Trophy className="h-4 w-4" />
            META SEMANAL BATIDA!
            <Trophy className="h-4 w-4" />
          </div>
        )}
        <CardContent className={`p-6 ${weeklyProgress >= 100 ? 'pt-10' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Meta Semanal</h3>
              <p className="text-xs text-muted-foreground">Fechamentos</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <CircularProgress progress={weeklyProgress} />
            
            <div className="flex-1 pl-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Quantidade</p>
                <p className="text-2xl font-bold">
                  {weeklyData?.atual?.qtd || 0}
                  <span className="text-muted-foreground font-normal text-lg">
                    /{weeklyData?.target?.meta_fechamentos_qtd || 0}
                  </span>
                </p>
              </div>
              
              {weeklyData?.target?.meta_fechamentos_valor && (
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(weeklyData.atual.valor)}
                    <span className="text-muted-foreground font-normal text-base">
                      /{formatCurrency(weeklyData.target.meta_fechamentos_valor)}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta Mensal */}
      <Card className={`relative overflow-hidden ${monthlyProgress >= 90 ? 'goal-pulse' : ''} ${monthlyProgress >= 100 ? 'ring-2 ring-warning' : ''}`}>
        {monthlyProgress >= 100 && (
          <div className="absolute top-0 left-0 right-0 bg-warning text-warning-foreground text-center py-1.5 text-sm font-semibold flex items-center justify-center gap-2 animate-fade-in">
            <Trophy className="h-4 w-4" />
            META MENSAL BATIDA!
            <Trophy className="h-4 w-4" />
          </div>
        )}
        <CardContent className={`p-6 ${monthlyProgress >= 100 ? 'pt-10' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Meta Mensal</h3>
                <p className="text-xs text-muted-foreground">Faturamento</p>
              </div>
            </div>
            {monthlyData?.diasRestantes !== undefined && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {monthlyData.diasRestantes} dias
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <CircularProgress progress={monthlyProgress} />
            
            <div className="flex-1 pl-6 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Atual</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrency(monthlyData?.valorAtual || 0)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Meta</p>
                <p className="text-xl font-semibold text-muted-foreground">
                  {formatCurrency(monthlyData?.target?.meta_faturamento || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
