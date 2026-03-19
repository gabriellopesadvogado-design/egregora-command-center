import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const FAIXA_LABELS: Record<string, string> = {
  "30_dias_closer": "30 dias (Closer)",
  "60_dias_sdr": "60 dias (SDR)",
  "90_dias_sdr": "90 dias (SDR)",
  "180_dias_sdr": "180 dias (SDR)",
};

export function ReativacaoHistorico() {
  const queryClient = useQueryClient();

  const { data: reativacoes, isLoading } = useQuery({
    queryKey: ["crm_reativacoes_historico"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("crm_reativacoes")
        .select("*, crm_meetings!meeting_id(nome_lead, status), core_users!responsavel_reativacao_id(nome)")
        .order("data_reativacao", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const updateResultado = async (id: string, resultado: string) => {
    const { error } = await (supabase as any)
      .from("crm_reativacoes")
      .update({ resultado })
      .eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`Resultado atualizado para "${resultado === "fechado" ? "Fechado" : "Perdido novamente"}".`);
    queryClient.invalidateQueries({ queryKey: ["crm_reativacoes_historico"] });
    queryClient.invalidateQueries({ queryKey: ["crm_reativacoes"] });
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "dd MMM yyyy", { locale: ptBR }) : "—";

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Motivo Original</TableHead>
            <TableHead>Perdido em</TableHead>
            <TableHead>Reativado em</TableHead>
            <TableHead>Faixa</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
          ) : !reativacoes?.length ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma reativação registrada.</TableCell></TableRow>
          ) : (
            reativacoes.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.crm_meetings?.nome_lead || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{r.motivo_perda_original}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.data_perda)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(r.data_reativacao)}</TableCell>
                <TableCell className="text-sm">{FAIXA_LABELS[r.faixa_reativacao] || r.faixa_reativacao}</TableCell>
                <TableCell className="text-sm">{r.core_users?.nome || "—"}</TableCell>
                <TableCell>
                  {r.resultado === "em_andamento" && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Em andamento</Badge>}
                  {r.resultado === "fechado" && <Badge className="bg-green-100 text-green-700 border-green-200">Fechado ✅</Badge>}
                  {r.resultado === "perdido_novamente" && <Badge className="bg-red-100 text-red-700 border-red-200">Perdido novamente</Badge>}
                </TableCell>
                <TableCell>
                  {r.resultado === "em_andamento" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateResultado(r.id, "fechado")}>
                        Fechado
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => updateResultado(r.id, "perdido_novamente")}>
                        Perdido
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
