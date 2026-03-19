import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCelebration } from "@/hooks/useCelebration";

interface WeeklyTargetProgressProps {
  data: {
    target: {
      meta_fechamentos_qtd: number;
      meta_fechamentos_valor: number | null;
    };
    atual: {
      qtd: number;
      valor: number;
    };
    progresso: {
      qtd: number;
      valor: number | null;
    };
  } | null | undefined;
  isLoading: boolean;
}

export function WeeklyTargetProgress({ data, isLoading }: WeeklyTargetProgressProps) {
  const { triggerGoalCelebration } = useCelebration();
  const hasTriggeredCelebration = useRef(false);

  const progressQtd = data?.progresso.qtd ?? 0;
  const goalReached = progressQtd >= 100;

  // Trigger celebration when goal is reached
  useEffect(() => {
    if (goalReached && !hasTriggeredCelebration.current) {
      hasTriggeredCelebration.current = true;
      triggerGoalCelebration();
    }
  }, [goalReached, triggerGoalCelebration]);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-success";
    if (progress >= 80) return "bg-success/70";
    if (progress >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <Card className={cn("border-0 shadow-sm", goalReached && "ring-2 ring-success")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {goalReached ? (
              <Trophy className="h-5 w-5 text-success" />
            ) : (
              <Target className="h-5 w-5 text-primary" />
            )}
            <CardTitle className="text-base">Meta da Semana</CardTitle>
          </div>
          {goalReached && (
            <span className="text-xs font-bold text-success animate-pulse">
              🎉 META BATIDA!
            </span>
          )}
        </div>
        <CardDescription>Progresso em direção à meta semanal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : !data ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="mx-auto h-8 w-8 opacity-50 mb-2" />
            <p className="text-sm">Nenhuma meta definida para esta semana</p>
          </div>
        ) : (
          <>
            {/* Quantity Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fechamentos</span>
                <span className="font-medium">
                  {data.atual.qtd} / {data.target.meta_fechamentos_qtd}
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={Math.min(progressQtd, 100)}
                  className="h-3"
                />
                <div
                  className={cn(
                    "absolute inset-0 h-3 rounded-full transition-all",
                    getProgressColor(progressQtd)
                  )}
                  style={{ width: `${Math.min(progressQtd, 100)}%` }}
                />
              </div>
              <p className="text-xs text-right text-muted-foreground">
                {progressQtd.toFixed(0)}%
              </p>
            </div>

            {/* Value Progress (if applicable) */}
            {data.target.meta_fechamentos_valor && data.progresso.valor !== null && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">
                    {data.atual.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    /{" "}
                    {data.target.meta_fechamentos_valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="relative">
                  <Progress
                    value={Math.min(data.progresso.valor, 100)}
                    className="h-3"
                  />
                  <div
                    className={cn(
                      "absolute inset-0 h-3 rounded-full transition-all",
                      getProgressColor(data.progresso.valor)
                    )}
                    style={{ width: `${Math.min(data.progresso.valor, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-right text-muted-foreground">
                  {data.progresso.valor.toFixed(0)}%
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
