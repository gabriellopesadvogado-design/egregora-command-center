import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReativacaoModal } from "./ReativacaoModal";
import { format, differenceInDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, XCircle } from "lucide-react";

interface MotivoPerda {
  id: string;
  motivo: string;
  reativavel: boolean;
  dias_minimos_reativacao: number;
}

export function ReativacaoElegiveis() {
  const [filtroMotivo, setFiltroMotivo] = useState<string>("all");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("all");
  const [filtroCloser, setFiltroCloser] = useState<string>("all");
  const [apenasElegiveis, setApenasElegiveis] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const { data: motivos } = useQuery({
    queryKey: ["crm_motivos_perda"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_motivos_perda").select("*");
      if (error) throw error;
      return data as MotivoPerda[];
    },
  });

  const { data: perdidos } = useQuery({
    queryKey: ["meetings_perdidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_meetings")
        .select("*, closer:core_users!crm_meetings_closer_id_fkey(nome)")
        .eq("status", "perdido")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reativacoes } = useQuery({
    queryKey: ["crm_reativacoes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("crm_reativacoes").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: closers } = useQuery({
    queryKey: ["closers_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("id, nome")
        .in("cargo", ["closer", "admin", "gestor"]);
      if (error) throw error;
      return data;
    },
  });

  const motivosMap = useMemo(() => {
    const map = new Map<string, MotivoPerda>();
    motivos?.forEach((m) => map.set(m.motivo, m));
    return map;
  }, [motivos]);

  const reativacoesEmAndamento = useMemo(() => {
    const set = new Set<string>();
    reativacoes?.filter((r: any) => r.resultado === "em_andamento").forEach((r: any) => set.add(r.meeting_id));
    return set;
  }, [reativacoes]);

  type Eligibility = "elegivel" | "nao_elegivel" | "aguardar" | "ja_reativado";

  const getEligibility = (meeting: any): { status: Eligibility; diasFaltam?: number } => {
    if (reativacoesEmAndamento.has(meeting.id)) return { status: "ja_reativado" };
    const mp = motivosMap.get(meeting.motivo_perda);
    if (!mp || !mp.reativavel) return { status: "nao_elegivel" };
    const dias = differenceInDays(new Date(), new Date(meeting.updated_at));
    if (dias < mp.dias_minimos_reativacao) return { status: "aguardar", diasFaltam: mp.dias_minimos_reativacao - dias };
    return { status: "elegivel" };
  };

  const filteredDeals = useMemo(() => {
    if (!perdidos) return [];
    let list = [...perdidos];

    if (filtroMotivo !== "all") list = list.filter((m) => m.motivo_perda === filtroMotivo);
    if (filtroCloser !== "all") list = list.filter((m) => m.closer_id === filtroCloser);
    if (filtroPeriodo !== "all") {
      const now = new Date();
      const dias = parseInt(filtroPeriodo);
      if (filtroPeriodo === "180+") {
        list = list.filter((m) => differenceInDays(now, new Date(m.updated_at)) > 180);
      } else {
        list = list.filter((m) => differenceInDays(now, new Date(m.updated_at)) <= dias);
      }
    }
    if (apenasElegiveis) list = list.filter((m) => getEligibility(m).status === "elegivel");

    return list;
  }, [perdidos, filtroMotivo, filtroCloser, filtroPeriodo, apenasElegiveis, motivosMap, reativacoesEmAndamento]);

  const totalPerdidos = perdidos?.length ?? 0;
  const totalElegiveis = perdidos?.filter((m) => getEligibility(m).status === "elegivel").length ?? 0;
  const mesAtual = startOfMonth(new Date()).toISOString();
  const reativadosMes = reativacoes?.filter((r: any) => r.data_reativacao && r.data_reativacao >= mesAtual).length ?? 0;
  const totalReativados = reativacoes?.length ?? 0;
  const totalFechados = reativacoes?.filter((r: any) => r.resultado === "fechado").length ?? 0;
  const taxaConversao = totalReativados > 0 ? ((totalFechados / totalReativados) * 100).toFixed(1) : "0";

  const formatCurrency = (val: number | null) =>
    val != null ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Deals Perdidos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalPerdidos}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Elegíveis</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{totalElegiveis}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reativados este Mês</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">{reativadosMes}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{taxaConversao}%</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Motivo de perda</Label>
          <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {motivos?.map((m) => <SelectItem key={m.id} value={m.motivo}>{m.motivo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Período da perda</Label>
          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
              <SelectItem value="180+">Mais de 180 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Closer original</Label>
          <Select value={filtroCloser} onValueChange={setFiltroCloser}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {closers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <Switch id="apenas-elegiveis" checked={apenasElegiveis} onCheckedChange={setApenasElegiveis} />
          <Label htmlFor="apenas-elegiveis" className="text-sm">Apenas elegíveis</Label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Perdido em</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Closer</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Elegível</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Nenhum deal encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredDeals.map((m) => {
                const elig = getEligibility(m);
                const dias = differenceInDays(new Date(), new Date(m.updated_at));
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome_lead}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{m.motivo_perda || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.updated_at ? format(new Date(m.updated_at), "dd MMM yyyy", { locale: ptBR }) : "—"}
                    </TableCell>
                    <TableCell>{dias}d</TableCell>
                    <TableCell className="text-sm">{(m as any).closer?.nome || "—"}</TableCell>
                    <TableCell>{formatCurrency(m.valor_proposta)}</TableCell>
                    <TableCell>
                      {elig.status === "elegivel" && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" /> Elegível
                        </Badge>
                      )}
                      {elig.status === "nao_elegivel" && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <XCircle className="h-3 w-3 mr-1" /> Não elegível
                        </Badge>
                      )}
                      {elig.status === "aguardar" && (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          <Clock className="h-3 w-3 mr-1" /> Aguardar {elig.diasFaltam}d
                        </Badge>
                      )}
                      {elig.status === "ja_reativado" && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <RefreshCw className="h-3 w-3 mr-1" /> Já reativado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {elig.status === "elegivel" && (
                        <Button size="sm" onClick={() => { setSelectedMeeting(m); setModalOpen(true); }}>
                          Reativar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedMeeting && (
        <ReativacaoModal
          meeting={selectedMeeting}
          open={modalOpen}
          onClose={() => { setModalOpen(false); setSelectedMeeting(null); }}
        />
      )}
    </div>
  );
}
