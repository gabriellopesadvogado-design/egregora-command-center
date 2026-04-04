import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Lightbulb, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Award,
  AlertTriangle,
  DollarSign,
  Users,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAttributionInsightsProps {
  campaignData?: any[];
  qualityData?: any[];
  metrics?: any;
}

interface InsightItem {
  type: 'success' | 'warning' | 'danger' | 'opportunity';
  icon: string;
  title: string;
  description: string;
  action: string;
  metric?: string;
}

const iconMap: Record<string, any> = {
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  target: Target,
  award: Award,
  alert: AlertTriangle,
  dollar: DollarSign,
  users: Users,
  sparkles: Sparkles,
};

const typeColors: Record<string, string> = {
  success: 'border-green-500/30 bg-green-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  danger: 'border-red-500/30 bg-red-500/5',
  opportunity: 'border-blue-500/30 bg-blue-500/5',
};

const badgeColors: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  opportunity: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const fmtCur = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function AIAttributionInsights({ campaignData, qualityData, metrics }: AIAttributionInsightsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  const generateInsights = async () => {
    if (!campaignData?.length && !metrics) {
      toast.error('Sem dados suficientes para análise');
      return;
    }

    setIsGenerating(true);
    try {
      // Buscar API key
      const { data: cred } = await supabase
        .from('api_credentials')
        .select('value_encrypted')
        .eq('provider', 'openai')
        .single();

      if (!cred?.value_encrypted) {
        throw new Error('API key da OpenAI não configurada');
      }

      // Preparar dados para análise
      const topCampaigns = campaignData?.slice(0, 10).map(c => ({
        nome: c.campaign || 'Sem campanha',
        leads: c.leads,
        fechamentos: c.closed,
        receita: c.revenue,
        taxa_conversao: c.leads ? ((c.closed / c.leads) * 100).toFixed(1) + '%' : '0%',
      })) || [];

      const qualidadeResumo = qualityData?.reduce((acc, q) => {
        acc.total_bom += q.bom || 0;
        acc.total_ruim += q.ruim || 0;
        acc.total_muito_bom += q.muito_bom || 0;
        return acc;
      }, { total_bom: 0, total_ruim: 0, total_muito_bom: 0 }) || {};

      const prompt = `Você é um especialista em análise de funil de vendas e atribuição de marketing para uma consultoria de imigração brasileira (Egrégora Migration).

DADOS DE ATRIBUIÇÃO:

MÉTRICAS GERAIS:
- Total de leads: ${metrics?.totalLeads || 0}
- Leads qualificados: ${metrics?.qualifiedLeads || 0}
- Propostas (SQLs): ${metrics?.proposals || 0}
- Fechamentos: ${metrics?.closedWon || 0}
- Receita total: R$ ${(metrics?.totalRevenue || 0).toFixed(2)}
- Taxa de conversão: ${metrics?.conversionRate?.toFixed(1) || 0}%
- CAC: R$ ${(metrics?.cac || 0).toFixed(2)}
- ROAS: ${(metrics?.roas || 0).toFixed(2)}x

TOP CAMPANHAS:
${JSON.stringify(topCampaigns, null, 2)}

QUALIDADE DOS LEADS:
- Muito Bons: ${qualidadeResumo.total_muito_bom || 0}
- Bons: ${qualidadeResumo.total_bom || 0}
- Ruins: ${qualidadeResumo.total_ruim || 0}

REGRAS:
1. Foque em insights ACIONÁVEIS sobre atribuição e qualidade
2. NÃO repita análises de tráfego/criativos (isso está em outra página)
3. Analise: qual campanha traz melhor ROI, qual tem pior qualidade, onde investir mais
4. Máximo 5 insights
5. Use português brasileiro
6. Cada insight deve ter uma ação clara

Responda em JSON:
{
  "summary": "Uma frase resumindo a situação da atribuição",
  "insights": [
    {
      "type": "success|warning|danger|opportunity",
      "icon": "trending_up|trending_down|target|award|alert|dollar|users|sparkles",
      "title": "Título curto",
      "description": "Descrição detalhada",
      "action": "Ação recomendada",
      "metric": "Métrica relevante (ex: R$ 500, 25%, 3x)"
    }
  ]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cred.value_encrypted}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na API da OpenAI');
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      setInsights(parsed.insights || []);
      setSummary(parsed.summary || '');
      setLastGenerated(new Date());
      toast.success('Análise gerada!');

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao gerar análise');
    } finally {
      setIsGenerating(false);
    }
  };

  // Verificar se tem dados suficientes
  const hasData = (campaignData?.length || 0) > 0 || (metrics?.totalLeads || 0) > 0;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            Insights de Atribuição
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateInsights} 
            disabled={isGenerating || !hasData}
            className="gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analisando...' : 'Analisar'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {!hasData ? (
          <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
            <p>Configure o mapeamento de campanhas Meta → internas para ver insights.</p>
            <p className="text-xs mt-1">Settings → Meta Ads → Mapeamento de Campanhas</p>
          </div>
        ) : !insights.length && !isGenerating ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Clique em "Analisar" para gerar insights com IA</p>
            <p className="text-xs mt-1">Análise de ROI, qualidade e performance por campanha</p>
          </div>
        ) : isGenerating ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo */}
            {summary && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-sm font-medium">{summary}</p>
                {lastGenerated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gerado em {lastGenerated.toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>
            )}

            {/* Insights */}
            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-3">
                {insights.map((insight, i) => {
                  const Icon = iconMap[insight.icon] || Lightbulb;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
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
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
