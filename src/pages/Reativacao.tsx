import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Phone, 
  Calendar,
  TrendingUp,
  Filter,
  Download,
  MessageSquare
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadReativacao {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  pais_nascimento: string;
  rnm_classificacao: string;
  rnm_data_vencimento: string;
  servico_interesse: string;
  score_qualificacao: number;
  pipeline_status: string;
  dias_para_vencimento: number;
  status_rnm: string;
  elegivel_reativacao: boolean;
}

const STATUS_RNM_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  vencido: { label: "RNM Vencido", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: AlertTriangle },
  vence_30_dias: { label: "Vence em 30 dias", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: Clock },
  vence_90_dias: { label: "Vence em 90 dias", color: "bg-amber-500/20 text-amber-500 border-amber-500/30", icon: Clock },
  vence_180_dias: { label: "Vence em 180 dias", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Calendar },
  ok: { label: "RNM OK", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: TrendingUp },
  sem_rnm: { label: "Sem RNM", color: "bg-muted text-muted-foreground", icon: Users },
};

export default function Reativacao() {
  const [activeTab, setActiveTab] = useState("rnm_vencendo");

  const { data: leadsReativacao, isLoading } = useQuery({
    queryKey: ["leads-reativacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads_reativacao")
        .select("*")
        .order("dias_para_vencimento", { ascending: true });
      if (error) throw error;
      return data as LeadReativacao[];
    },
  });

  // Agrupar por status
  const rnmVencido = leadsReativacao?.filter(l => l.status_rnm === "vencido") || [];
  const rnmVence30 = leadsReativacao?.filter(l => l.status_rnm === "vence_30_dias") || [];
  const rnmVence90 = leadsReativacao?.filter(l => l.status_rnm === "vence_90_dias") || [];
  const rnmVence180 = leadsReativacao?.filter(l => l.status_rnm === "vence_180_dias") || [];
  const perdidos = leadsReativacao?.filter(l => l.elegivel_reativacao) || [];

  const getScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500/20 text-green-500">🔥 {score}</Badge>;
    if (score >= 40) return <Badge className="bg-amber-500/20 text-amber-500">👍 {score}</Badge>;
    return <Badge className="bg-muted text-muted-foreground">❄️ {score}</Badge>;
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "-";
    return phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 ($2) $3-$4");
  };

  const LeadTable = ({ leads, showRnm = true }: { leads: LeadReativacao[]; showRnm?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>País</TableHead>
          <TableHead>Telefone</TableHead>
          {showRnm && <TableHead>RNM Vence</TableHead>}
          <TableHead>Score</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell className="font-medium">{lead.nome}</TableCell>
            <TableCell>{lead.pais_nascimento || "-"}</TableCell>
            <TableCell className="text-sm">{formatPhone(lead.whatsapp || lead.telefone)}</TableCell>
            {showRnm && (
              <TableCell>
                {lead.rnm_data_vencimento ? (
                  <div className="text-sm">
                    <p>{format(parseISO(lead.rnm_data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p className={`text-xs ${lead.dias_para_vencimento < 0 ? "text-red-500" : lead.dias_para_vencimento < 30 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {lead.dias_para_vencimento < 0 
                        ? `Vencido há ${Math.abs(lead.dias_para_vencimento)} dias`
                        : `Em ${lead.dias_para_vencimento} dias`}
                    </p>
                  </div>
                ) : "-"}
              </TableCell>
            )}
            <TableCell>{getScoreBadge(lead.score_qualificacao || 0)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="Enviar WhatsApp">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Ligar">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {leads.length === 0 && (
          <TableRow>
            <TableCell colSpan={showRnm ? 6 : 5} className="text-center text-muted-foreground py-8">
              Nenhum lead encontrado nesta categoria
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reativação</h1>
          <p className="text-muted-foreground">
            Leads para campanhas de reativação baseado em RNM e histórico
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              RNM Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rnmVencido.length}</p>
            <p className="text-xs text-muted-foreground">Urgente</p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Vence 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rnmVence30.length}</p>
            <p className="text-xs text-muted-foreground">Prioridade alta</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Vence 90 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rnmVence90.length}</p>
            <p className="text-xs text-muted-foreground">Campanha</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Vence 180 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rnmVence180.length}</p>
            <p className="text-xs text-muted-foreground">Nurturing</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Perdidos (90d+)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{perdidos.length}</p>
            <p className="text-xs text-muted-foreground">Reativação</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com listas */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="rnm_vencido" className="text-xs">
                🔴 Vencido ({rnmVencido.length})
              </TabsTrigger>
              <TabsTrigger value="rnm_30" className="text-xs">
                🟠 30 dias ({rnmVence30.length})
              </TabsTrigger>
              <TabsTrigger value="rnm_90" className="text-xs">
                🟡 90 dias ({rnmVence90.length})
              </TabsTrigger>
              <TabsTrigger value="rnm_180" className="text-xs">
                🟢 180 dias ({rnmVence180.length})
              </TabsTrigger>
              <TabsTrigger value="perdidos" className="text-xs">
                🟣 Perdidos ({perdidos.length})
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <>
                <TabsContent value="rnm_vencido" className="mt-0">
                  <LeadTable leads={rnmVencido} />
                </TabsContent>
                <TabsContent value="rnm_30" className="mt-0">
                  <LeadTable leads={rnmVence30} />
                </TabsContent>
                <TabsContent value="rnm_90" className="mt-0">
                  <LeadTable leads={rnmVence90} />
                </TabsContent>
                <TabsContent value="rnm_180" className="mt-0">
                  <LeadTable leads={rnmVence180} />
                </TabsContent>
                <TabsContent value="perdidos" className="mt-0">
                  <LeadTable leads={perdidos} showRnm={false} />
                </TabsContent>
              </>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
