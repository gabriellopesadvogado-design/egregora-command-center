import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Lightbulb, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ChevronRight,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface InsightData {
  id: string;
  created_at: string;
  periodo_inicio: string;
  periodo_fim: string;
  tipo_periodo: string;
  metricas: {
    spend: number;
    clicks: number;
    impressions: number;
    leads: number;
    ctr: string;
    cpc: string;
    cpl: string;
    variacao_spend: string;
    variacao_leads: string;
    variacao_cpl: string;
  };
  insights: string[];
  recomendacoes: string[];
  score_geral: number;
  variacao_score: number;
  raw_response: {
    resumo?: string;
  };
}

export function AIInsightsCard() {
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('7d');
  const [isGenerating, setIsGenerating] = useState(false);

  // Buscar insights do banco
  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['mkt-ai-insights', periodo],
    queryFn: async () => {
      const diasAtras = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90;
      const dataInicio = subDays(new Date(), diasAtras).toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('mkt_ai_insights')
        .select('*')
        .gte('periodo_fim', dataInicio)
        .order('periodo_fim', { ascending: false });
      
      if (error) throw error;
      return data as InsightData[];
    },
  });

  // Gerar insight manualmente
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-traffic-insights');
      if (error) throw error;
      toast.success('Insight gerado com sucesso!');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar insight');
    } finally {
      setIsGenerating(false);
    }
  };

  // Dados para o gráfico de evolução
  const chartData = insights?.slice().reverse().map(i => ({
    data: format(new Date(i.periodo_fim), 'dd/MM'),
    score: i.score_geral,
    leads: i.metricas?.leads || 0,
    cpl: parseFloat(i.metricas?.cpl || '0'),
  })) || [];

  // Insight mais recente
  const latestInsight = insights?.[0];
  
  // Média do score no período
  const avgScore = insights?.length 
    ? Math.round(insights.reduce((acc, i) => acc + (i.score_geral || 0), 0) / insights.length)
    : 0;

  // Tendência (comparando primeira e última metade)
  const getTendencia = () => {
    if (!insights || insights.length < 4) return null;
    const meio = Math.floor(insights.length / 2);
    const primeiraMeta = insights.slice(0, meio).reduce((acc, i) => acc + (i.score_geral || 0), 0) / meio;
    const segundaMetade = insights.slice(meio).reduce((acc, i) => acc + (i.score_geral || 0), 0) / (insights.length - meio);
    return primeiraMeta > segundaMetade ? 'up' : primeiraMeta < segundaMetade ? 'down' : 'stable';
  };
  const tendencia = getTendencia();

  const fmtCur = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" /> AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            AI Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerate} 
              disabled={isGenerating}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Gerando...' : 'Gerar'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!insights?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhum insight gerado ainda</p>
            <p className="text-sm">Clique em "Gerar" para criar o primeiro insight</p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Insights são gerados automaticamente às 7h da manhã
            </p>
          </div>
        ) : (
          <Tabs defaultValue="atual" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="atual">Atual</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Aba Atual */}
            <TabsContent value="atual" className="mt-4 space-y-4">
              {latestInsight && (
                <>
                  {/* Score e Resumo */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${
                        latestInsight.score_geral >= 70 ? 'text-green-500' :
                        latestInsight.score_geral >= 40 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {latestInsight.score_geral}
                      </div>
                      <div className="text-xs text-muted-foreground">Score</div>
                      {latestInsight.variacao_score !== 0 && (
                        <div className={`flex items-center justify-center gap-0.5 text-xs ${
                          latestInsight.variacao_score > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {latestInsight.variacao_score > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {Math.abs(latestInsight.variacao_score)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {latestInsight.raw_response?.resumo || 'Análise do dia'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {format(new Date(latestInsight.periodo_fim), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  {/* Métricas do dia */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/20">
                      <div className="text-lg font-semibold">{fmtCur(latestInsight.metricas.spend)}</div>
                      <div className="text-xs text-muted-foreground">Investido</div>
                    </div>
                    <div className="p-2 rounded bg-muted/20">
                      <div className="text-lg font-semibold">{latestInsight.metricas.leads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    <div className="p-2 rounded bg-muted/20">
                      <div className="text-lg font-semibold">{fmtCur(parseFloat(latestInsight.metricas.cpl))}</div>
                      <div className="text-xs text-muted-foreground">CPL</div>
                    </div>
                    <div className="p-2 rounded bg-muted/20">
                      <div className="text-lg font-semibold">{latestInsight.metricas.ctr}%</div>
                      <div className="text-xs text-muted-foreground">CTR</div>
                    </div>
                  </div>

                  {/* Insights */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <Zap className="h-4 w-4 text-yellow-500" /> Insights
                    </h4>
                    {latestInsight.insights.map((insight, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2 text-sm p-2 rounded bg-muted/20"
                      >
                        <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{insight}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Recomendações */}
                  {latestInsight.recomendacoes?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-1">
                        <Target className="h-4 w-4 text-green-500" /> Recomendações
                      </h4>
                      {latestInsight.recomendacoes.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-green-500/10 border border-green-500/20">
                          <span className="text-green-500 font-bold">{i + 1}.</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Aba Evolução */}
            <TabsContent value="evolucao" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Score médio</p>
                  <p className="text-2xl font-bold">{avgScore}</p>
                </div>
                {tendencia && (
                  <Badge className={tendencia === 'up' ? 'bg-green-500/20 text-green-500' : tendencia === 'down' ? 'bg-red-500/20 text-red-500' : 'bg-gray-500/20 text-gray-500'}>
                    {tendencia === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : tendencia === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                    {tendencia === 'up' ? 'Evoluindo' : tendencia === 'down' ? 'Regredindo' : 'Estável'}
                  </Badge>
                )}
              </div>

              {chartData.length > 1 && (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="data" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number, name: string) => [
                          name === 'score' ? value : name === 'cpl' ? fmtCur(value) : value,
                          name === 'score' ? 'Score' : name === 'leads' ? 'Leads' : 'CPL'
                        ]}
                      />
                      <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" />
                      <ReferenceLine y={40} stroke="#eab308" strokeDasharray="3 3" />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded bg-muted/20">
                  <p className="text-muted-foreground">Melhor dia</p>
                  {insights?.length && (
                    <>
                      <p className="font-semibold">
                        Score {Math.max(...insights.map(i => i.score_geral))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(insights.find(i => i.score_geral === Math.max(...insights.map(x => x.score_geral)))?.periodo_fim || ''), 'dd/MM')}
                      </p>
                    </>
                  )}
                </div>
                <div className="p-3 rounded bg-muted/20">
                  <p className="text-muted-foreground">Pior dia</p>
                  {insights?.length && (
                    <>
                      <p className="font-semibold">
                        Score {Math.min(...insights.map(i => i.score_geral))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(insights.find(i => i.score_geral === Math.min(...insights.map(x => x.score_geral)))?.periodo_fim || ''), 'dd/MM')}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="historico" className="mt-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {insights?.map((insight, i) => (
                    <div 
                      key={insight.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className={`text-xl font-bold w-10 text-center ${
                        insight.score_geral >= 70 ? 'text-green-500' :
                        insight.score_geral >= 40 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {insight.score_geral}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {insight.raw_response?.resumo || `Análise de ${format(new Date(insight.periodo_fim), 'dd/MM')}`}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(new Date(insight.periodo_fim), "dd/MM/yyyy")}</span>
                          <span>{insight.metricas.leads} leads</span>
                          <span>CPL {fmtCur(parseFloat(insight.metricas.cpl))}</span>
                        </div>
                      </div>
                      {insight.variacao_score !== 0 && (
                        <Badge variant="outline" className={
                          insight.variacao_score > 0 ? 'text-green-500 border-green-500/30' : 'text-red-500 border-red-500/30'
                        }>
                          {insight.variacao_score > 0 ? '+' : ''}{insight.variacao_score}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
