import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles,
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: any;
  isLoading?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "Qual campanha gerou mais leads qualificados como muito bom?",
  "Qual o ticket médio de vendas este mês?",
  "Quem é o vendedor com melhor taxa de conversão?",
  "Quantos leads entraram esta semana?",
  "Qual o ROI de cada campanha nos últimos 30 dias?",
  "Quais leads estão prontos para reativação?",
  "Compare o desempenho das campanhas Meta vs Google",
];

export default function GestorComercialIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o Gestor Comercial IA da Egrégora. Posso analisar seus dados comerciais e responder perguntas sobre leads, campanhas, vendas e performance do time. Como posso ajudar?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch database context for the AI (otimizado para não sobrecarregar)
  const fetchDatabaseContext = async () => {
    const context: Record<string, any> = {};

    // Leads summary (apenas contagens agregadas)
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("campanha, canal, score_qualificacao");
    context.total_leads = leads?.length || 0;
    context.leads_por_campanha = leads?.reduce((acc: Record<string, number>, l) => {
      const camp = l.campanha || "Sem campanha";
      acc[camp] = (acc[camp] || 0) + 1;
      return acc;
    }, {});

    // Meetings com métricas agregadas
    const { data: meetings } = await supabase
      .from("crm_meetings")
      .select("status, avaliacao_reuniao, valor_proposta, valor_fechamento, nome_lead, closer_id, data_fechamento");
    
    context.total_reunioes = meetings?.length || 0;
    context.reunioes_por_status = meetings?.reduce((acc: Record<string, number>, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});
    context.reunioes_por_avaliacao = meetings?.reduce((acc: Record<string, number>, m) => {
      const av = m.avaliacao_reuniao || "sem_avaliacao";
      acc[av] = (acc[av] || 0) + 1;
      return acc;
    }, {});
    
    // Vendas (fechados)
    const vendas = meetings?.filter(m => m.status === "fechado") || [];
    context.total_vendas = vendas.length;
    context.valor_total_vendas = vendas.reduce((sum, v) => sum + (v.valor_fechamento || v.valor_proposta || 0), 0);
    context.ticket_medio = vendas.length ? context.valor_total_vendas / vendas.length : 0;

    // Top 10 maiores vendas
    context.maiores_vendas = vendas
      .sort((a, b) => (b.valor_fechamento || 0) - (a.valor_fechamento || 0))
      .slice(0, 10)
      .map(v => ({ nome: v.nome_lead, valor: v.valor_fechamento || v.valor_proposta }));

    // Attribution agregado (não enviar todos os registros)
    const { data: attribution } = await supabase
      .from("lead_attribution_view")
      .select("campaign, quality, is_won, revenue, deal_value");
    
    // Agregar por campanha
    const campanhasMap = new Map<string, any>();
    attribution?.forEach(a => {
      const camp = a.campaign || "Sem campanha";
      if (!campanhasMap.has(camp)) {
        campanhasMap.set(camp, { leads: 0, boas: 0, neutras: 0, ruins: 0, vendas: 0, receita: 0 });
      }
      const c = campanhasMap.get(camp);
      c.leads++;
      if (a.quality === "boa") c.boas++;
      if (a.quality === "neutra") c.neutras++;
      if (a.quality === "ruim") c.ruins++;
      if (a.is_won) {
        c.vendas++;
        c.receita += a.revenue || a.deal_value || 0;
      }
    });
    context.campanhas = Array.from(campanhasMap.entries())
      .map(([campanha, m]) => ({ campanha, ...m }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 15); // Top 15 campanhas

    // Reativação (apenas contagens)
    const { data: reativacao } = await supabase
      .from("leads_perdidos_qualificados")
      .select("categoria_lead, score_qualificacao, elegivel_naturalizacao");
    context.reativacao = {
      total: reativacao?.length || 0,
      hot: reativacao?.filter(r => r.categoria_lead === "hot").length || 0,
      qualificados: reativacao?.filter(r => r.categoria_lead === "qualificado").length || 0,
      frios: reativacao?.filter(r => r.categoria_lead === "frio").length || 0,
      elegiveis_naturalizacao: reativacao?.filter(r => r.elegivel_naturalizacao).length || 0,
    };

    // Equipe comercial
    const { data: closers } = await supabase
      .from("core_users")
      .select("id, nome, cargo")
      .in("cargo", ["closer", "sdr", "admin", "gestor"]);
    
    // Vendas por closer
    const vendasPorCloser = vendas.reduce((acc: Record<string, { vendas: number; valor: number }>, v) => {
      const closer = closers?.find(c => c.id === v.closer_id);
      const nome = closer?.nome || "Sem closer";
      if (!acc[nome]) acc[nome] = { vendas: 0, valor: 0 };
      acc[nome].vendas++;
      acc[nome].valor += v.valor_fechamento || v.valor_proposta || 0;
      return acc;
    }, {});
    context.vendas_por_vendedor = Object.entries(vendasPorCloser)
      .map(([nome, m]) => ({ nome, ...m }))
      .sort((a, b) => b.valor - a.valor);

    context.equipe = closers?.map(c => ({ nome: c.nome, cargo: c.cargo }));

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Analisando dados...",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get OpenAI API key
      const { data: credentials } = await supabase
        .from("api_credentials")
        .select("value_encrypted")
        .eq("provider", "openai")
        .eq("is_valid", true)
        .single();

      if (!credentials?.value_encrypted) {
        throw new Error("Chave da OpenAI não configurada. Vá em Configurações > Integrações para adicionar.");
      }
      
      const openaiKey = credentials.value_encrypted;

      // Fetch database context
      const dbContext = await fetchDatabaseContext();

      // Build prompt with context
      const systemPrompt = `Você é o Gestor Comercial IA da Egrégora Migration, uma consultoria de naturalização brasileira.

Seu papel é analisar dados comerciais e responder perguntas do gestor de forma clara e direta.

DADOS ATUAIS DO BANCO:
${JSON.stringify(dbContext, null, 2)}

REGRAS:
1. Responda SEMPRE em português brasileiro
2. Use os dados fornecidos para responder - não invente números
3. Seja direto e objetivo, como um analista de dados
4. Quando mencionar valores monetários, use formato brasileiro (R$ X.XXX,XX)
5. Se não tiver dados suficientes para responder, diga claramente
6. Formate listas e comparações de forma visual (use emojis e estrutura)
7. Para campanhas do Meta Ads, o nome real pode ser longo como "[Y][Leads] - Leadads — Cópia [25.04]"
8. "boa" = reunião muito boa/lead qualificado, "neutra" = ok, "ruim" = lead ruim
9. Score >= 70 = Hot, 40-69 = Qualificado, < 40 = Frio

Responda a pergunta do usuário com base nos dados fornecidos.`;

      // Call OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.filter(m => !m.isLoading).slice(-10).map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: input },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Erro ao consultar OpenAI");
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "Não consegui processar sua pergunta.";

      // Update messages
      setMessages(prev => prev.map(m => 
        m.isLoading 
          ? { ...m, content: aiResponse, isLoading: false, data: dbContext }
          : m
      ));

    } catch (error: any) {
      console.error("Error:", error);
      setMessages(prev => prev.map(m => 
        m.isLoading 
          ? { ...m, content: `❌ Erro: ${error.message}`, isLoading: false }
          : m
      ));
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gestor Comercial IA</h1>
            <p className="text-sm text-muted-foreground">
              Pergunte sobre leads, campanhas, vendas e performance
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <Database className="h-3 w-3" />
          Conectado ao Supabase
        </Badge>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat */}
        <Card className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      {message.isLoading ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-white" />
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Consultando banco de dados...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    )}
                    <div className="text-[10px] opacity-50 mt-1">
                      {format(message.timestamp, "HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <Input
                ref={inputRef}
                placeholder="Pergunte sobre seus dados comerciais..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </Card>

        {/* Sidebar with Examples */}
        <Card className="w-80 flex-shrink-0 hidden lg:flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Exemplos de perguntas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2">
              {EXAMPLE_QUESTIONS.map((question, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="w-full justify-start text-left h-auto py-2 px-3 text-sm font-normal hover:bg-violet-500/10"
                  onClick={() => handleExampleClick(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </CardContent>
          
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">💡 Dicas:</p>
              <p>• Pergunte sobre campanhas, vendas, leads</p>
              <p>• Compare períodos ou vendedores</p>
              <p>• Peça análises e insights</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
