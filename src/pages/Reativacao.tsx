import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ImportLeadsModal } from "@/components/reativacao/ImportLeadsModal";
import { 
  Flame,
  ThumbsUp,
  Snowflake,
  HelpCircle,
  Phone, 
  MessageSquare,
  Download,
  Upload,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  Globe
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadPerdido {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  pais_nascimento: string;
  nacionalidade: string;
  tempo_residencia_brasil_anos: number;
  rnm_classificacao: string;
  rnm_data_vencimento: string;
  servico_interesse: string;
  casado_conjuge_brasileiro: boolean;
  possui_filhos_brasileiros: boolean;
  possui_pais_brasileiros: boolean;
  pais_lingua_portuguesa: boolean;
  possui_certificado_portugues: boolean;
  score_qualificacao: number;
  pipeline_status: string;
  avaliacao_reuniao: string;
  data_fechamento: string;
  motivo_perda: string;
  categoria_lead: string;
  elegivel_naturalizacao: boolean;
}

export default function Reativacao() {
  const [activeTab, setActiveTab] = useState("hot");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { data: leadsPerdidos, isLoading } = useQuery({
    queryKey: ["leads-perdidos-qualificados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_perdidos_qualificados")
        .select("*")
        .order("score_qualificacao", { ascending: false });
      if (error) throw error;
      return data as LeadPerdido[];
    },
  });

  // Agrupar por categoria
  const hot = leadsPerdidos?.filter(l => l.categoria_lead === "hot") || [];
  const qualificado = leadsPerdidos?.filter(l => l.categoria_lead === "qualificado") || [];
  const frio = leadsPerdidos?.filter(l => l.categoria_lead === "frio") || [];
  const naoQualificado = leadsPerdidos?.filter(l => l.categoria_lead === "nao_qualificado") || [];
  const elegivelNaturalizacao = leadsPerdidos?.filter(l => l.elegivel_naturalizacao) || [];

  const total = leadsPerdidos?.length || 0;

  const getConditionsIcons = (lead: LeadPerdido) => {
    const conditions = [];
    if (lead.casado_conjuge_brasileiro) conditions.push({ icon: "💍", label: "Cônjuge BR" });
    if (lead.possui_filhos_brasileiros) conditions.push({ icon: "👶", label: "Filhos BR" });
    if (lead.possui_pais_brasileiros) conditions.push({ icon: "👨‍👩‍👧", label: "Pais BR" });
    if (lead.pais_lingua_portuguesa) conditions.push({ icon: "🇧🇷", label: "Lusófono" });
    if (lead.possui_certificado_portugues) conditions.push({ icon: "📜", label: "Celpe-Bras" });
    return conditions;
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 13) {
      return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
    }
    return phone;
  };

  const getRnmBadge = (rnm: string) => {
    switch(rnm) {
      case "indeterminado":
        return <Badge className="bg-green-500/20 text-green-500 text-xs">Indeterminado</Badge>;
      case "temporario":
        return <Badge className="bg-amber-500/20 text-amber-500 text-xs">Temporário</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Sem RNM</Badge>;
    }
  };

  const getTempoLabel = (anos: number | null) => {
    if (!anos && anos !== 0) return "-";
    if (anos >= 4) return `${anos} anos ✓`;
    return `${anos} ano${anos !== 1 ? "s" : ""}`;
  };

  const LeadTable = ({ leads }: { leads: LeadPerdido[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">Score</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>País</TableHead>
          <TableHead>Tempo BR</TableHead>
          <TableHead>RNM</TableHead>
          <TableHead>Condições</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead className="w-[100px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => {
          const conditions = getConditionsIcons(lead);
          return (
            <TableRow key={lead.id} className={lead.elegivel_naturalizacao ? "bg-green-500/5" : ""}>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className={`text-lg font-bold ${
                    lead.score_qualificacao >= 70 ? "text-green-500" :
                    lead.score_qualificacao >= 40 ? "text-amber-500" :
                    lead.score_qualificacao > 0 ? "text-blue-500" : "text-muted-foreground"
                  }`}>
                    {lead.score_qualificacao}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{lead.nome}</p>
                  {lead.elegivel_naturalizacao && (
                    <Badge className="bg-green-500/20 text-green-500 text-[10px] mt-1">
                      ✓ Elegível Naturalização
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm">{lead.pais_nascimento || lead.nacionalidade || "-"}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className={`text-sm ${lead.tempo_residencia_brasil_anos >= 4 ? "text-green-500 font-medium" : ""}`}>
                  {getTempoLabel(lead.tempo_residencia_brasil_anos)}
                </span>
              </TableCell>
              <TableCell>{getRnmBadge(lead.rnm_classificacao)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {conditions.length > 0 ? (
                    conditions.map((c, i) => (
                      <span key={i} title={c.label} className="text-sm cursor-help">
                        {c.icon}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{formatPhone(lead.whatsapp || lead.telefone)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar WhatsApp">
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Ligar">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
        {leads.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Nenhum lead encontrado nesta categoria
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
    <ImportLeadsModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reativação de Leads</h1>
          <p className="text-muted-foreground">
            {total.toLocaleString()} leads perdidos • Ordenados por qualificação
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => setImportModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar Qualificação
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-500 flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Hot Leads (70+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{hot.length}</p>
            <p className="text-xs text-muted-foreground">Prioridade máxima</p>
            <Progress value={(hot.length / Math.max(total, 1)) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
              <ThumbsUp className="w-4 h-4" />
              Qualificados (40-69)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{qualificado.length}</p>
            <p className="text-xs text-muted-foreground">Bom potencial</p>
            <Progress value={(qualificado.length / Math.max(total, 1)) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-500 flex items-center gap-2">
              <Snowflake className="w-4 h-4" />
              Frios (1-39)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">{frio.length}</p>
            <p className="text-xs text-muted-foreground">Baixa prioridade</p>
            <Progress value={(frio.length / Math.max(total, 1)) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-muted bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Não Qualificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">{naoQualificado.length}</p>
            <p className="text-xs text-muted-foreground">Sem dados coletados</p>
            <Progress value={(naoQualificado.length / Math.max(total, 1)) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Elegíveis Naturalização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{elegivelNaturalizacao.length}</p>
            <p className="text-xs text-muted-foreground">4+ anos + RNM indet.</p>
          </CardContent>
        </Card>
      </div>

      {/* Card de alerta para leads não qualificados */}
      {naoQualificado.length > 10 && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                <HelpCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  ⚠️ <span className="text-amber-500 font-bold">{naoQualificado.length} leads</span> estão sem dados de qualificação
                </p>
                <p className="text-sm text-muted-foreground">
                  Importe uma planilha com os dados desses leads para identificar os melhores para reativação.
                </p>
              </div>
              <Button 
                variant="outline" 
                className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                onClick={() => setImportModalOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insight Card */}
      {hot.length > 0 && (
        <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <Target className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  🎯 Você tem <span className="text-green-500 font-bold">{hot.length} leads hot</span> perdidos prontos para reativação!
                </p>
                <p className="text-sm text-muted-foreground">
                  Esses leads já têm os requisitos para naturalização. Campanha de reativação pode ter alta conversão.
                </p>
              </div>
              <Button className="bg-green-500 hover:bg-green-600">
                <MessageSquare className="w-4 h-4 mr-2" />
                Iniciar Campanha
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs com listas */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="hot" className="text-xs gap-1">
                <Flame className="w-3 h-3" />
                Hot ({hot.length})
              </TabsTrigger>
              <TabsTrigger value="qualificado" className="text-xs gap-1">
                <ThumbsUp className="w-3 h-3" />
                Qualificados ({qualificado.length})
              </TabsTrigger>
              <TabsTrigger value="frio" className="text-xs gap-1">
                <Snowflake className="w-3 h-3" />
                Frios ({frio.length})
              </TabsTrigger>
              <TabsTrigger value="nao_qualificado" className="text-xs gap-1">
                <HelpCircle className="w-3 h-3" />
                Sem dados ({naoQualificado.length})
              </TabsTrigger>
              <TabsTrigger value="naturalizacao" className="text-xs gap-1">
                <CheckCircle className="w-3 h-3" />
                Elegíveis ({elegivelNaturalizacao.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <TabsContent value="hot" className="mt-0">
                  <LeadTable leads={hot} />
                </TabsContent>
                <TabsContent value="qualificado" className="mt-0">
                  <LeadTable leads={qualificado} />
                </TabsContent>
                <TabsContent value="frio" className="mt-0">
                  <LeadTable leads={frio} />
                </TabsContent>
                <TabsContent value="nao_qualificado" className="mt-0">
                  <LeadTable leads={naoQualificado} />
                </TabsContent>
                <TabsContent value="naturalizacao" className="mt-0">
                  <LeadTable leads={elegivelNaturalizacao} />
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
    </>
  );
}
