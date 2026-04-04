import { useState } from "react";
import { useMetaDashboard, MetaDatePreset } from "@/hooks/useMetaDashboard";
import { DashboardKPICard } from "@/components/trafego/DashboardKPICard";
import { TrendChart } from "@/components/trafego/TrendChart";
import { SpendDistributionChart } from "@/components/trafego/SpendDistributionChart";
import { CampaignsTable } from "@/components/trafego/CampaignsTable";
import { ChannelRevenueChart } from "@/components/trafego/ChannelRevenueChart";
import { CreativeAlertsWidget } from "@/components/trafego/CreativeAlertsWidget";
import { AIInsightsCard } from "@/components/trafego/AIInsightsCard";
import { DateRangeFilter } from "@/components/trafego/DateRangeFilter";
import { MetaRefreshIndicator } from "@/components/trafego/MetaRefreshIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LinkIcon, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Trafego() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<MetaDatePreset>("last_7d");
  
  const {
    isConnected,
    isLoading,
    kpis,
    trendData,
    campaignData,
    dailySpendData,
    bestCreatives,
    worstCreatives,
    performanceSummary,
    isTrendLoading,
    isCampaignLoading,
    isAdLoading,
    isSpendLoading,
    isRefreshing,
    lastUpdated,
    refreshAll,
  } = useMetaDashboard(dateRange);

  if (!isConnected && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <LinkIcon className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Conecte seu Meta Ads</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Para ver seus dados reais de tráfego pago, conecte sua conta do Meta Ads nas configurações.
        </p>
        <Button onClick={() => navigate("/settings")} className="mt-4">
          Ir para Configurações
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tráfego Pago</h1>
          <p className="mt-1 text-muted-foreground">
            Métricas de Meta Ads e Google Ads em tempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={refreshAll}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <MetaRefreshIndicator lastUpdated={lastUpdated} isRefreshing={isRefreshing} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          kpis.slice(0, 4).map((kpi) => (
            <DashboardKPICard key={kpi.id} kpi={kpi} />
          ))
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : (
              <TrendChart data={trendData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            {isSpendLoading ? (
              <div className="h-64 bg-muted rounded animate-pulse" />
            ) : (
              <SpendDistributionChart data={campaignData || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {isCampaignLoading ? (
            <div className="h-64 bg-muted rounded animate-pulse" />
          ) : (
            <CampaignsTable campaigns={campaignData || []} />
          )}
        </CardContent>
      </Card>

      {/* Creatives Row */}
      {isAdLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><CardContent className="p-6"><div className="h-48 bg-muted rounded animate-pulse" /></CardContent></Card>
          <Card><CardContent className="p-6"><div className="h-48 bg-muted rounded animate-pulse" /></CardContent></Card>
        </div>
      ) : (
        <CreativeAlertsWidget bestCreatives={bestCreatives || []} worstCreatives={worstCreatives || []} />
      )}

      {/* AI Insights */}
      <AIInsightsCard />
    </div>
  );
}
