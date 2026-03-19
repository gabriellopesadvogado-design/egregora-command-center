import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeeklyTargetsWithProgress } from "@/hooks/useTargets";
import { CalendarDays, Trophy, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthSelector } from "./MonthSelector";

function getProgressColor(progress: number): string {
  if (progress >= 100) return "bg-success";
  if (progress >= 80) return "bg-success/70";
  if (progress >= 50) return "bg-warning";
  return "bg-destructive";
}

function getStatusBadge(progress: number, isPast: boolean) {
  if (progress >= 100) {
    return (
      <Badge className="bg-success text-success-foreground gap-1">
        <Trophy className="h-3 w-3" />
        META BATIDA!
      </Badge>
    );
  }
  if (isPast) {
    return <Badge variant="secondary">Não atingida</Badge>;
  }
  if (progress >= 80) {
    return <Badge className="bg-warning text-warning-foreground">Quase lá!</Badge>;
  }
  if (progress >= 50) {
    return <Badge variant="outline">Em andamento</Badge>;
  }
  return <Badge variant="destructive">Atenção</Badge>;
}

export function WeeklyTargetsTable() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const { data: targets, isLoading } = useWeeklyTargetsWithProgress(selectedYear, selectedMonth);

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatWeek = (inicio: string, fim: string) => {
    const startDate = new Date(inicio + "T00:00:00");
    const endDate = new Date(fim + "T00:00:00");
    return `${format(startDate, "dd/MM", { locale: ptBR })} - ${format(endDate, "dd/MM/yy", { locale: ptBR })}`;
  };

  const monthName = format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy", { locale: ptBR });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Histórico de Metas Semanais
        </CardTitle>
        <MonthSelector 
          year={selectedYear} 
          month={selectedMonth} 
          onChange={handleMonthChange} 
        />
      </CardHeader>
      <CardContent>
        {/* Counter */}
        <p className="mb-4 text-sm text-muted-foreground capitalize">
          {isLoading
            ? "Carregando..."
            : targets?.length
              ? `Mostrando ${targets.length} meta${targets.length > 1 ? "s" : ""} de ${monthName}`
              : `Nenhuma meta cadastrada em ${monthName}`}
        </p>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : !targets?.length ? (
          <div className="py-8 text-center text-muted-foreground capitalize">
            Nenhuma meta semanal cadastrada em {monthName}
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => {
              const isGoalAchieved = target.progresso.contratos >= 100;
              
              return (
                <div
                  key={target.id}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    isGoalAchieved && "border-success/50 bg-success/5",
                    target.progresso.contratos >= 80 && target.progresso.contratos < 100 && "goal-pulse"
                  )}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{formatWeek(target.semana_inicio, target.semana_fim)}</p>
                        <p className="text-sm text-muted-foreground">
                          Meta: {target.meta_fechamentos_qtd} contratos / {target.meta_reunioes_realizadas || 0} reuniões
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isGoalAchieved && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                          <Trophy className="h-5 w-5 text-warning" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-3">
                    {/* Contratos */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          Contratos
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {target.resultado.fechamentos}/{target.meta_fechamentos_qtd}
                          </span>
                          {getStatusBadge(target.progresso.contratos, target.isPast)}
                        </div>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn(
                            "h-full transition-all duration-500",
                            getProgressColor(target.progresso.contratos),
                            target.progresso.contratos >= 100 && "leader-shine"
                          )}
                          style={{ width: `${Math.min(target.progresso.contratos, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(target.progresso.contratos)}% • {formatCurrency(target.resultado.valorFechado)} fechado
                      </p>
                    </div>

                    {/* Reuniões */}
                    {(target.meta_reunioes_realizadas || 0) > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            Reuniões
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {target.resultado.reunioesRealizadas}/{target.meta_reunioes_realizadas}
                            </span>
                            {getStatusBadge(target.progresso.reunioes, target.isPast)}
                          </div>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn(
                              "h-full transition-all duration-500",
                              getProgressColor(target.progresso.reunioes)
                            )}
                            style={{ width: `${Math.min(target.progresso.reunioes, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(target.progresso.reunioes)}% realizado
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 border-t pt-2">
                    <p className="text-xs text-muted-foreground">
                      Criado por {target.profiles?.nome || "-"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
