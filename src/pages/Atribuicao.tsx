import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Clock, 
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AttributionFunnel } from "@/components/atribuicao/AttributionFunnel";
import { AttributionTable } from "@/components/atribuicao/AttributionTable";
import { AttributionChart } from "@/components/atribuicao/AttributionChart";
import { LeadQualityChart } from "@/components/atribuicao/LeadQualityChart";
import { CampaignInsights } from "@/components/atribuicao/CampaignInsights";

type DateRange = "7d" | "30d" | "90d" | "all";

interface AttributionMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  proposals: number; // SQLs
  closedWon: number;
  closedLost: number;
  totalRevenue: number;
  totalAdSpend: number;
  avgDaysToClose: number;
  conversionRate: number;
  cpl: number;
  csql: number; // Custo por SQL
  cac: number;
  roas: number;
}

interface CampaignAttribution {
  campaign: string;
  leads: number;
  qualified: number;
  proposals: number;
  closed: number;
  revenue: number;
  spend: number;
  cpl: number;
  cac: number;
  roas: number;
  avgDays: number;
}

interface QualityData {
  campaign: string;
  ruim: number;
  bom: number;
  muito_bom: number;
  custo_ruim: number;
  custo_bom: number;
  custo_muito_bom: number;
  total: number;
  spend: number;
}

export default function Atribuicao() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  };

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["attribution-metrics", dateRange],
    queryFn: async (): Promise<AttributionMetrics> => {
      const dateFilter = getDateFilter();
      
      let query = supabase.from("lead_attribution").select("*");
      if (dateFilter) {
        query = query.gte("lead_created_at", dateFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const leads = data || [];
      const qualified = leads.filter(l => l.qualified_at);
      const proposals = leads.filter(l => l.deal_stage?.includes("Proposta"));
      const closedWon = leads.filter(l => l.is_won);
      const closedLost = leads.filter(l => l.deal_stage === "Perdido" || l.deal_stage === "Não Elegível");
      
      const totalRevenue = closedWon.reduce((sum, l) => sum + (l.deal_value || 0), 0);
      const daysToClose = closedWon.filter(l => l.days_to_close).map(l => l.days_to_close!);
      const avgDays = daysToClose.length ? daysToClose.reduce((a, b) => a + b, 0) / daysToClose.length : 0;

      // Buscar gasto de ads do período
      const { data: adAccount } = await supabase
        .from("ad_accounts")
        .select("account_id")
        .eq("is_active", true)
        .single();

      let totalAdSpend = 0;
      // Por enquanto usar valor estimado baseado em R$150/dia
      const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365;
      totalAdSpend = 150 * days; // TODO: Buscar via meta-api

      // SQL = chegou em "Proposta Enviada" (conforme configuração HubSpot)
      const sqls = leads.filter(l => 
        l.deal_stage === "Proposta Enviada" || 
        l.deal_stage === "Follow Up Ativo" || 
        l.deal_stage === "Contrato Enviado" || 
        l.is_won
      );

      return {
        totalLeads: leads.length,
        qualifiedLeads: qualified.length,
        proposals: sqls.length,
        closedWon: closedWon.length,
        closedLost: closedLost.length,
        totalRevenue,
        totalAdSpend,
        avgDaysToClose: Math.round(avgDays),
        conversionRate: leads.length ? (closedWon.length / leads.length) * 100 : 0,
        cpl: leads.length ? totalAdSpend / leads.length : 0,
        csql: sqls.length ? totalAdSpend / sqls.length : 0,
        cac: closedWon.length ? totalAdSpend / closedWon.length : 0,
        roas: totalAdSpend ? totalRevenue / totalAdSpend : 0,
      };
    },
  });

  const { data: campaignData, isLoading: campaignLoading } = useQuery({
    queryKey: ["attribution-campaigns", dateRange],
    queryFn: async (): Promise<CampaignAttribution[]> => {
      const dateFilter = getDateFilter();
      
      let query = supabase.from("lead_attribution").select("*");
      if (dateFilter) {
        query = query.gte("lead_created_at", dateFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por campanha
      const byCampaign: Record<string, typeof data> = {};
      (data || []).forEach(lead => {
        const campaign = lead.utm_campaign || lead.utm_source || "Direto";
        if (!byCampaign[campaign]) byCampaign[campaign] = [];
        byCampaign[campaign].push(lead);
      });

      return Object.entries(byCampaign).map(([campaign, leads]) => {
        const qualified = leads.filter(l => l.qualified_at).length;
        const sqls = leads.filter(l => 
          l.deal_stage === "Proposta Enviada" || 
          l.deal_stage === "Follow Up Ativo" ||
          l.deal_stage === "Contrato Enviado" || 
          l.is_won
        ).length;
        const closed = leads.filter(l => l.is_won).length;
        const revenue = leads.filter(l => l.is_won).reduce((sum, l) => sum + (l.deal_value || 0), 0);
        const daysArr = leads.filter(l => l.days_to_close).map(l => l.days_to_close!);
        const avgDays = daysArr.length ? Math.round(daysArr.reduce((a, b) => a + b, 0) / daysArr.length) : 0;
        
        // Estimativa de spend por campanha (proporcional)
        const spend = leads.length * 50; // TODO: Buscar spend real por campanha

        return {
          campaign,
          leads: leads.length,
          qualified,
          proposals: sqls,
          closed,
          revenue,
          spend,
          cpl: leads.length ? spend / leads.length : 0,
          csql: sqls ? spend / sqls : 0,
          cac: closed ? spend / closed : 0,
          roas: spend ? revenue / spend : 0,
          avgDays,
        };
      }).sort((a, b) => b.revenue - a.revenue);
    },
  });

  const { data: qualityData, isLoading: qualityLoading } = useQuery({
    queryKey: ["attribution-quality", dateRange],
    queryFn: async (): Promise<{ byCampaign: QualityData[]; totals: { ruim: number; bom: number; muito_bom: number } }> => {
      const dateFilter = getDateFilter();

      // Fonte principal: crm_meetings com avaliacao_reuniao
      // Faz join com crm_leads para pegar a campanha
      let q = supabase
        .from("crm_meetings")
        .select("avaliacao_reuniao, lead_id, created_at")
        .not("avaliacao_reuniao", "is", null);
      if (dateFilter) q = q.gte("created_at", dateFilter);
      const { data: meetings } = await q;

      // Buscar leads para pegar campanha
      const leadIds = [...new Set((meetings || []).map(m => m.lead_id).filter(Boolean))];
      const { data: leads } = leadIds.length
        ? await supabase.from("crm_leads").select("id, campanha, utm_source, utm_campaign, canal").in("id", leadIds)
        : { data: [] };

      const leadMap: Record<string, any> = {};
      (leads || []).forEach(l => { leadMap[l.id] = l; });

      // Normalizar qualidade: boa → bom, neutra → bom (intermediário), ruim → ruim
      const normalize = (q: string): keyof typeof totals => {
        if (q === "boa") return "muito_bom";
        if (q === "neutra") return "bom";
        return "ruim";
      };

      const totals = { ruim: 0, bom: 0, muito_bom: 0 };
      const byCampaign: Record<string, { ruim: number; bom: number; muito_bom: number }> = {};

      (meetings || []).forEach(m => {
        const q = normalize(m.avaliacao_reuniao);
        totals[q]++;
        
        const lead = m.lead_id ? leadMap[m.lead_id] : null;
        const campaign = lead?.campanha || lead?.utm_campaign || lead?.utm_source || lead?.canal || "Sem campanha";
        
        if (!byCampaign[campaign]) byCampaign[campaign] = { ruim: 0, bom: 0, muito_bom: 0 };
        byCampaign[campaign][q]++;
      });

      // Buscar spend real do Meta via Edge Function
      let spendMap: Record<string, number> = {};
      try {
        const datePreset = dateRange === "7d" ? "last_7d" : dateRange === "30d" ? "last_30d" : dateRange === "90d" ? "last_90d" : "this_year";
        const { data: session } = await supabase.auth.getSession();
        const spendRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || "https://zxwkjogjbyywufertkor.supabase.co"}/functions/v1/meta-campaign-spend`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.session?.access_token || ""}`,
            },
            body: JSON.stringify({ date_preset: datePreset }),
          }
        );
        const spendData = await spendRes.json();
        if (spendData.campaigns) {
          spendData.campaigns.forEach((c: any) => {
            if (c.internal_campaign) {
              spendMap[c.internal_campaign] = c.spend;
            }
          });
        }
      } catch {
        // Fallback para valores em cache se a API falhar
        spendMap = {
          "Meta_Leadads_Principal": 13036.26,
          "Meta_Escala": 2553.35,
          "Meta_Nova_Leads": 90.64,
        };
      }

      const result = Object.entries(byCampaign).map(([campaign, counts]) => {
        const total = counts.ruim + counts.bom + counts.muito_bom;
        const spend = spendMap[campaign] || 0;
        return {
          campaign,
          ...counts,
          total,
          spend,
          custo_ruim: counts.ruim && spend ? spend / counts.ruim : 0,
          custo_bom: counts.bom && spend ? spend / counts.bom : 0,
          custo_muito_bom: counts.muito_bom && spend ? spend / counts.muito_bom : 0,
        };
      }).sort((a, b) => b.spend - a.spend);

      return { byCampaign: result, totals };
    },
  });

  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  const fmtN = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  const KPICard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    trendUp 
  }: { 
    title: string; 
    value: string; 
    subtitle?: string; 
    icon: any;
    trend?: string;
    trendUp?: boolean;
  }) => (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {trend && (
              <div className={`flex items-center text-xs ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atribuição</h1>
          <p className="text-muted-foreground">Performance de campanhas e ROI real</p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {metricsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total de Leads"
              value={fmtN(metrics.totalLeads)}
              subtitle={`${metrics.qualifiedLeads} qualificados`}
              icon={Users}
            />
            <KPICard
              title="Taxa de Conversão"
              value={fmtPct(metrics.conversionRate)}
              subtitle={`${metrics.closedWon} fechados`}
              icon={Target}
            />
            <KPICard
              title="Receita Total"
              value={fmt(metrics.totalRevenue)}
              subtitle={`Ticket médio: ${fmt(metrics.closedWon ? metrics.totalRevenue / metrics.closedWon : 0)}`}
              icon={DollarSign}
            />
            <KPICard
              title="ROAS"
              value={`${metrics.roas.toFixed(2)}x`}
              subtitle={`Investido: ${fmt(metrics.totalAdSpend)}`}
              icon={TrendingUp}
              trend={metrics.roas >= 3 ? "Saudável" : "Atenção"}
              trendUp={metrics.roas >= 3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="CPL (Custo por Lead)"
              value={fmt(metrics.cpl)}
              subtitle={`${metrics.totalLeads} leads totais`}
              icon={BarChart3}
            />
            <KPICard
              title="Custo por SQL"
              value={fmt(metrics.csql)}
              subtitle={`${metrics.proposals} SQLs (proposta+)`}
              icon={Target}
              trend={metrics.csql < 500 ? "Saudável" : metrics.csql < 1000 ? "Atenção" : "Alto"}
              trendUp={metrics.csql < 500}
            />
            <KPICard
              title="CAC (Custo por Cliente)"
              value={fmt(metrics.cac)}
              subtitle={`${metrics.closedWon} clientes`}
              icon={DollarSign}
            />
            <KPICard
              title="Tempo Médio de Fechamento"
              value={`${metrics.avgDaysToClose} dias`}
              subtitle="Lead → Contrato"
              icon={Clock}
            />
          </div>
        </>
      )}

      {/* Funnel */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <Skeleton className="h-48" />
          ) : metrics && (
            <AttributionFunnel
              leads={metrics.totalLeads}
              qualified={metrics.qualifiedLeads}
              proposals={metrics.proposals}
              closedWon={metrics.closedWon}
              closedLost={metrics.closedLost}
            />
          )}
        </CardContent>
      </Card>

      {/* Chart + Table */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Receita por Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <AttributionChart data={campaignData || []} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Performance por Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            {campaignLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <AttributionTable data={campaignData || []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Qualidade de Leads + Insights */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Qualidade de Leads por Campanha
              <span className="text-xs font-normal text-muted-foreground ml-2">
                Boa / Neutra / Ruim (avaliada pelo Closer)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <LeadQualityChart
                data={qualityData?.byCampaign || []}
                totals={qualityData?.totals || { ruim: 0, bom: 0, muito_bom: 0 }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Insights & Ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {qualityLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <CampaignInsights data={qualityData?.byCampaign || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
