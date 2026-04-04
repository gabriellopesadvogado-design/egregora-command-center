import { AlertTriangle, TrendingUp, TrendingDown, Zap, Target, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CampaignData {
  campaign: string;
  ruim: number;
  bom: number;
  muito_bom: number;
  total: number;
  spend: number;
  custo_muito_bom: number;
}

interface CampaignInsightsProps {
  data: CampaignData[];
}

type InsightType = "success" | "warning" | "danger" | "info";

interface Insight {
  type: InsightType;
  icon: typeof TrendingUp;
  title: string;
  description: string;
  action: string;
  campaign?: string;
  metric?: string;
}

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { 
  style: "currency", 
  currency: "BRL", 
  maximumFractionDigits: 0 
}).format(n);

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function CampaignInsights({ data }: CampaignInsightsProps) {
  const insights: Insight[] = [];
  
  // Filtrar campanhas com spend
  const withSpend = data.filter(d => d.spend > 0);
  const withoutSpend = data.filter(d => d.spend === 0 && d.total > 0);
  
  if (withSpend.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
        <p>Configure o mapeamento de campanhas Meta → internas para ver insights.</p>
        <p className="text-xs mt-1">Settings → Meta Ads → Mapeamento de Campanhas</p>
      </div>
    );
  }

  // 1. Melhor custo por lead bom
  const bestCostPerGood = withSpend
    .filter(d => d.muito_bom > 0)
    .sort((a, b) => a.custo_muito_bom - b.custo_muito_bom)[0];
  
  if (bestCostPerGood) {
    insights.push({
      type: "success",
      icon: TrendingUp,
      title: "Melhor custo por lead BOM",
      description: `"${bestCostPerGood.campaign}" gera leads de qualidade BOA por apenas ${fmt(bestCostPerGood.custo_muito_bom)}`,
      action: "Escalar investimento nesta campanha",
      campaign: bestCostPerGood.campaign,
      metric: fmt(bestCostPerGood.custo_muito_bom),
    });
  }

  // 2. Pior custo por lead bom
  const worstCostPerGood = withSpend
    .filter(d => d.muito_bom > 0)
    .sort((a, b) => b.custo_muito_bom - a.custo_muito_bom)[0];
  
  if (worstCostPerGood && worstCostPerGood !== bestCostPerGood && worstCostPerGood.custo_muito_bom > 1000) {
    insights.push({
      type: "danger",
      icon: AlertTriangle,
      title: "Alto custo por lead BOM",
      description: `"${worstCostPerGood.campaign}" custa ${fmt(worstCostPerGood.custo_muito_bom)} por lead de qualidade BOA`,
      action: "Otimizar criativos ou pausar campanha",
      campaign: worstCostPerGood.campaign,
      metric: fmt(worstCostPerGood.custo_muito_bom),
    });
  }

  // 3. Campanhas sem leads bons
  const noGoodLeads = withSpend.filter(d => d.muito_bom === 0 && d.spend > 100);
  noGoodLeads.forEach(camp => {
    insights.push({
      type: "warning",
      icon: TrendingDown,
      title: "Zero leads de qualidade BOA",
      description: `"${camp.campaign}" gastou ${fmt(camp.spend)} sem gerar nenhum lead de qualidade BOA`,
      action: "Revisar segmentação e criativos urgentemente",
      campaign: camp.campaign,
      metric: fmt(camp.spend) + " sem retorno",
    });
  });

  // 4. Taxa de qualidade ruim alta
  withSpend.forEach(camp => {
    const taxaRuim = camp.total > 0 ? camp.ruim / camp.total : 0;
    if (taxaRuim > 0.6 && camp.spend > 500) {
      insights.push({
        type: "warning",
        icon: Target,
        title: "Alta taxa de leads RUINS",
        description: `"${camp.campaign}" tem ${pct(taxaRuim)} de leads ruins (${camp.ruim}/${camp.total})`,
        action: "Refinar público-alvo e qualificação",
        campaign: camp.campaign,
        metric: pct(taxaRuim) + " ruins",
      });
    }
  });

  // 5. Oportunidade de escala
  withSpend.forEach(camp => {
    const taxaBoa = camp.total > 0 ? camp.muito_bom / camp.total : 0;
    if (taxaBoa > 0.25 && camp.spend < 500) {
      insights.push({
        type: "info",
        icon: Zap,
        title: "Oportunidade de escala",
        description: `"${camp.campaign}" tem ${pct(taxaBoa)} de leads bons com baixo investimento (${fmt(camp.spend)})`,
        action: "Aumentar budget desta campanha",
        campaign: camp.campaign,
        metric: pct(taxaBoa) + " bons",
      });
    }
  });

  // 6. Comparação de eficiência
  if (bestCostPerGood && worstCostPerGood && bestCostPerGood !== worstCostPerGood) {
    const ratio = worstCostPerGood.custo_muito_bom / bestCostPerGood.custo_muito_bom;
    if (ratio > 5) {
      insights.push({
        type: "info",
        icon: DollarSign,
        title: "Diferença de eficiência",
        description: `"${worstCostPerGood.campaign}" custa ${ratio.toFixed(0)}x mais por lead bom que "${bestCostPerGood.campaign}"`,
        action: "Realocar budget para campanhas mais eficientes",
        metric: ratio.toFixed(0) + "x diferença",
      });
    }
  }

  const typeColors: Record<InsightType, string> = {
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    info: "border-blue-500/30 bg-blue-500/5",
  };

  const badgeColors: Record<InsightType, string> = {
    success: "bg-green-500/20 text-green-400 border-green-500/30",
    warning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    danger: "bg-red-500/20 text-red-400 border-red-500/30",
    info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  if (insights.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
        <p>Sem insights significativos no momento.</p>
        <p className="text-xs mt-1">Continue classificando reuniões para gerar análises.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.slice(0, 5).map((insight, i) => {
        const Icon = insight.icon;
        return (
          <div
            key={i}
            className={`p-3 rounded-lg border ${typeColors[insight.type]} transition-colors hover:bg-muted/10`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded ${badgeColors[insight.type]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{insight.title}</span>
                  {insight.metric && (
                    <Badge variant="outline" className={`text-xs ${badgeColors[insight.type]}`}>
                      {insight.metric}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                <p className="text-xs font-medium mt-1.5 text-primary">→ {insight.action}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
