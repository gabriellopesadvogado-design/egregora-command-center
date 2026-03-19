import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, useWeeklyTarget, useRankings, useMonthlyTargetProgress, type PeriodFilter as PeriodFilterType } from "@/hooks/useDashboardStats";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { HeroMonthlyTarget } from "@/components/dashboard/HeroMonthlyTarget";
import { WeeklyTargetCard } from "@/components/dashboard/WeeklyTargetCard";
import { CompetitiveRanking } from "@/components/dashboard/CompetitiveRanking";
import { MiniStatsCards } from "@/components/dashboard/MiniStatsCards";
import { QualityChart } from "@/components/dashboard/QualityChart";
import { ConversionByPeriod } from "@/components/dashboard/ConversionByPeriod";

export default function Dashboard() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<PeriodFilterType>("week");

  const { data: stats, isLoading: statsLoading } = useDashboardStats(period);
  const { data: weeklyTarget, isLoading: targetLoading } = useWeeklyTarget();
  const { data: monthlyTarget, isLoading: monthlyLoading } = useMonthlyTargetProgress();
  const { data: rankings, isLoading: rankingsLoading } = useRankings(period);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {profile?.nome?.split(" ")[0] || "Usuário"}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Aqui está o resumo da sua atividade
          </p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* HERO: Meta Mensal em destaque absoluto */}
      <HeroMonthlyTarget 
        data={monthlyTarget}
        isLoading={monthlyLoading}
      />

      {/* Metas Semanais lado a lado */}
      <div className="grid gap-4 md:grid-cols-2">
        <WeeklyTargetCard
          type="reunioes"
          atual={weeklyTarget?.reunioes?.atual || 0}
          meta={weeklyTarget?.reunioes?.meta || 0}
          progresso={weeklyTarget?.reunioes?.progresso || 0}
          isLoading={targetLoading}
        />
        <WeeklyTargetCard
          type="contratos"
          atual={weeklyTarget?.fechamentos?.atual || 0}
          meta={weeklyTarget?.fechamentos?.meta || 0}
          progresso={weeklyTarget?.fechamentos?.progresso || 0}
          valor={weeklyTarget?.fechamentos?.valor}
          valorMeta={weeklyTarget?.fechamentos?.valorMeta}
          isLoading={targetLoading}
        />
      </div>

      {/* Rankings lado a lado */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CompetitiveRanking 
          type="closers"
          data={rankings?.closers}
          isLoading={rankingsLoading}
        />
        <CompetitiveRanking 
          type="sdrs"
          data={rankings?.sdrs}
          isLoading={rankingsLoading}
        />
      </div>

      {/* Métricas menores + Quality Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <MiniStatsCards stats={stats} isLoading={statsLoading} />
          <ConversionByPeriod />
        </div>
        <QualityChart data={stats?.qualityDistribution} isLoading={statsLoading} />
      </div>
    </div>
  );
}
