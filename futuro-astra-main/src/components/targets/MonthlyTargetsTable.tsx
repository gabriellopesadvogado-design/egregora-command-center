import { useState, useMemo } from "react";
import { format, differenceInDays, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMonthlyTargetsWithProgress, useYearlyTargetByYear } from "@/hooks/useTargets";
import { TrendingUp, Trophy, DollarSign, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { YearSelector } from "./YearSelector";

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

export function MonthlyTargetsTable() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { data: targets, isLoading } = useMonthlyTargetsWithProgress(selectedYear);
  const { data: yearlyTarget } = useYearlyTargetByYear(selectedYear);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatMonth = (mesAno: string) => {
    const date = new Date(mesAno + "T00:00:00");
    return format(date, "MMMM yyyy", { locale: ptBR });
  };

  const getDaysRemaining = (mesAno: string) => {
    const fimMes = endOfMonth(new Date(mesAno + "T00:00:00"));
    const hoje = new Date();
    if (fimMes < hoje) return null;
    return differenceInDays(fimMes, hoje);
  };

  // Calcular totais anuais usando a meta anual definida
  const totaisAnuais = useMemo(() => {
    const valorTotal = targets?.reduce((sum, t) => sum + t.resultado.valorFechado, 0) || 0;
    const metaAnual = yearlyTarget?.meta_faturamento || 0;
    const qtdContratos = targets?.reduce((sum, t) => sum + t.resultado.qtdFechamentos, 0) || 0;

    return {
      metaAnual,
      valorTotal,
      progresso: metaAnual > 0 ? (valorTotal / metaAnual) * 100 : 0,
      diferenca: valorTotal - metaAnual,
      qtdContratos,
      hasYearlyTarget: !!yearlyTarget,
    };
  }, [targets, yearlyTarget]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Histórico de Metas Mensais
        </CardTitle>
        <YearSelector value={selectedYear} onChange={setSelectedYear} />
      </CardHeader>
      <CardContent>
        {/* Barra de Meta Anual Destacada */}
        <div className="annual-target-container mb-6 rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-6 w-6 text-warning fill-warning" />
              <span className="text-lg font-bold">Meta Anual {selectedYear}</span>
            </div>
            {totaisAnuais.hasYearlyTarget ? (
              <Badge className="bg-warning/20 text-warning border-warning/30">
                {totaisAnuais.qtdContratos} contratos
              </Badge>
            ) : (
              <Badge variant="outline" className="border-warning/50 text-warning">
                Meta não definida
              </Badge>
            )}
          </div>

          {totaisAnuais.hasYearlyTarget ? (
            <>
              <div className="relative h-6 w-full overflow-hidden rounded-full bg-secondary/50">
                <div
                  className={cn(
                    "annual-target-bar h-full transition-all duration-500",
                    totaisAnuais.progresso >= 100 && "annual-shine"
                  )}
                  style={{ width: `${Math.min(totaisAnuais.progresso, 100)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                  {Math.round(totaisAnuais.progresso)}%
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span>
                  <span className="text-lg font-bold">{formatCurrency(totaisAnuais.valorTotal)}</span>
                  <span className="text-muted-foreground"> / {formatCurrency(totaisAnuais.metaAnual)}</span>
                </span>
                <span className={cn(
                  "font-medium",
                  totaisAnuais.diferenca >= 0 ? "text-success" : "text-muted-foreground"
                )}>
                  {totaisAnuais.diferenca >= 0
                    ? `+${formatCurrency(totaisAnuais.diferenca)} acima!`
                    : `Faltam ${formatCurrency(Math.abs(totaisAnuais.diferenca))}`}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Defina uma meta anual no formulário acima para acompanhar o progresso.
            </p>
          )}
        </div>

        {/* Counter */}
        <p className="mb-4 text-sm text-muted-foreground">
          {isLoading
            ? "Carregando..."
            : targets?.length
              ? `Mostrando ${targets.length} meta${targets.length > 1 ? "s" : ""} de ${selectedYear}`
              : `Nenhuma meta cadastrada em ${selectedYear}`}
        </p>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : !targets?.length ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma meta mensal cadastrada em {selectedYear}
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => {
              const isGoalAchieved = target.progresso >= 100;
              const diasRestantes = getDaysRemaining(target.mes_ano);
              const diferenca = target.resultado.valorFechado - target.meta_faturamento;
              
              return (
                <div
                  key={target.id}
                  className={cn(
                    "rounded-lg border p-4 transition-all",
                    isGoalAchieved && "border-success/50 bg-success/5",
                    target.progresso >= 80 && target.progresso < 100 && "goal-pulse"
                  )}
                >
                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{formatMonth(target.mes_ano)}</p>
                        <p className="text-sm text-muted-foreground">
                          Meta: {formatCurrency(target.meta_faturamento)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {diasRestantes !== null && (
                        <Badge variant="outline" className="text-xs">
                          {diasRestantes} dias restantes
                        </Badge>
                      )}
                      {isGoalAchieved && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                          <Trophy className="h-5 w-5 text-warning" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Faturamento</span>
                      {getStatusBadge(target.progresso, target.isPast)}
                    </div>
                    <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          getProgressColor(target.progresso),
                          isGoalAchieved && "leader-shine"
                        )}
                        style={{ width: `${Math.min(target.progresso, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                        {Math.round(target.progresso)}%
                      </span>
                    </div>
                    
                    {/* Values */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-semibold">{formatCurrency(target.resultado.valorFechado)}</span>
                        <span className="text-muted-foreground"> / {formatCurrency(target.meta_faturamento)}</span>
                      </div>
                      <div className="text-sm">
                        {diferenca >= 0 ? (
                          <span className="text-success font-medium">
                            +{formatCurrency(diferenca)} acima!
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Faltam {formatCurrency(Math.abs(diferenca))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contracts count */}
                    <p className="text-xs text-muted-foreground">
                      {target.resultado.qtdFechamentos} contratos fechados
                    </p>
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
