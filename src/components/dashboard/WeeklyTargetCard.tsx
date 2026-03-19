import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Calendar, Trophy } from "lucide-react";
import { useCelebration } from "@/hooks/useCelebration";
import { cn } from "@/lib/utils";

interface WeeklyTargetCardProps {
  type: "reunioes" | "contratos";
  atual: number;
  meta: number;
  progresso: number;
  valor?: number;
  valorMeta?: number | null;
  isLoading?: boolean;
}

function CircularProgress({ 
  progress, 
  size = 110, 
  strokeWidth = 10,
  colorType = "primary"
}: { 
  progress: number; 
  size?: number; 
  strokeWidth?: number;
  colorType?: "primary" | "success";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  const getColor = () => {
    if (progress >= 100) return colorType === "primary" ? "hsl(var(--primary))" : "hsl(var(--success))";
    if (progress >= 80) return colorType === "primary" ? "hsl(var(--primary) / 0.8)" : "hsl(var(--success) / 0.8)";
    if (progress >= 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
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

export function WeeklyTargetCard({ 
  type, 
  atual, 
  meta, 
  progresso,
  valor,
  valorMeta,
  isLoading 
}: WeeklyTargetCardProps) {
  const { triggerGoalCelebration, triggerConfetti } = useCelebration();
  const celebratedRef = useRef(false);
  
  const isReunioes = type === "reunioes";
  const faltam = Math.max(0, meta - atual);

  // Trigger celebration when goal is reached
  useEffect(() => {
    if (progresso >= 100 && !celebratedRef.current) {
      celebratedRef.current = true;
      setTimeout(() => {
        if (isReunioes) {
          triggerConfetti();
        } else {
          triggerGoalCelebration();
        }
      }, 300);
    }
  }, [progresso, isReunioes, triggerConfetti, triggerGoalCelebration]);

  if (isLoading) {
    return <Skeleton className="h-[200px]" />;
  }

  const hasNoTarget = !meta || meta === 0;

  if (hasNoTarget) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
          {isReunioes ? (
            <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
          ) : (
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
          )}
          <p className="text-sm text-muted-foreground">
            Meta de {isReunioes ? "reuniões" : "contratos"} não definida
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      progresso >= 90 && progresso < 100 && "goal-pulse",
      progresso >= 100 && (isReunioes 
        ? "ring-2 ring-primary shadow-lg shadow-primary/20" 
        : "ring-2 ring-success shadow-lg shadow-success/20"
      )
    )}>
      {/* Success Banner */}
      {progresso >= 100 && (
        <div className={cn(
          "text-center py-1.5 text-white text-sm font-bold flex items-center justify-center gap-2",
          isReunioes ? "bg-primary" : "bg-success"
        )}>
          <Trophy className="h-4 w-4" />
          META BATIDA!
          <Trophy className="h-4 w-4" />
        </div>
      )}

      <CardContent className={cn("p-5", progresso >= 100 && "pt-4")}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(
            "p-2 rounded-lg",
            isReunioes ? "bg-primary/10" : "bg-success/10"
          )}>
            {isReunioes ? (
              <Calendar className="h-5 w-5 text-primary" />
            ) : (
              <Target className="h-5 w-5 text-success" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-base">Meta Semanal</h3>
            <p className="text-xs text-muted-foreground">
              {isReunioes ? "Reuniões Realizadas" : "Contratos Fechados"}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-between gap-4">
          <CircularProgress 
            progress={progresso} 
            size={100}
            colorType={isReunioes ? "primary" : "success"}
          />

          <div className="flex-1 text-right space-y-2">
            <div>
              <p className="text-3xl font-bold">
                {atual}
                <span className="text-muted-foreground text-xl font-normal">/{meta}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {isReunioes ? "reuniões" : "contratos"}
              </p>
            </div>
            
            {faltam > 0 && (
              <p className={cn(
                "text-sm font-medium",
                isReunioes ? "text-primary" : "text-success"
              )}>
                Faltam {faltam} para bater!
              </p>
            )}

            {/* Show value for contracts if available */}
            {!isReunioes && valor !== undefined && valor > 0 && (
              <div className="pt-1 border-t">
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="text-lg font-semibold text-success">
                  {formatCurrency(valor)}
                  {valorMeta && (
                    <span className="text-muted-foreground text-sm font-normal">
                      /{formatCurrency(valorMeta)}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
