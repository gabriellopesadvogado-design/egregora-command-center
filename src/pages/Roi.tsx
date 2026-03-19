import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus } from "lucide-react";

const CANAIS = [
  { value: "google", label: "Google" },
  { value: "meta", label: "Meta" },
  { value: "outros", label: "Outros" },
  { value: "blog", label: "Blog" },
  { value: "organico", label: "Orgânico" },
  { value: "indicacao", label: "Indicação" },
  { value: "reativacao", label: "Reativação" },
];

const formatBRL = (v: number | null) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
};

const formatPercent = (v: number | null) => {
  if (v == null) return "—";
  return `${(v * 100).toFixed(1)}%`;
};

const canalLabel = (canal: string) =>
  CANAIS.find((c) => c.value === canal)?.label ?? canal;

export default function Roi() {
  const queryClient = useQueryClient();
  const today = new Date();
  const [inicio, setInicio] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [fim, setFim] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [formOpen, setFormOpen] = useState(false);

  // Cost form state
  const [costCanal, setCostCanal] = useState("");
  const [costInicio, setCostInicio] = useState(inicio);
  const [costFim, setCostFim] = useState(fim);
  const [costValor, setCostValor] = useState("");

  const { data: roiData, isLoading } = useQuery({
    queryKey: ["roi_por_canal", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("roi_por_canal" as any, {
        p_inicio: inicio,
        p_fim: fim,
      });
      if (error) throw error;
      return (data ?? []).sort(
        (a: any, b: any) => (b.receita ?? 0) - (a.receita ?? 0)
      );
    },
  });

  const saveCost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crm_channel_costs").insert({
        canal: costCanal,
        mes: costInicio,
        custo_total: parseFloat(costValor),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["roi_por_canal"] });
      setCostValor("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ROI por Canal</h1>

      {/* Period filter */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div>
            <Label>Início</Label>
            <Input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div>
            <Label>Fim</Label>
            <Input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ROI Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !roiData?.length ? (
            <p className="text-muted-foreground">Nenhum dado no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Investimento</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Deals ganhos</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">CAC aprox</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roiData.map((row: any) => (
                  <TableRow key={row.canal}>
                    <TableCell className="font-medium">
                      {canalLabel(row.canal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(row.investimento)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(row.receita)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.deals_ganhos ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.roas != null ? row.roas.toFixed(2) + "x" : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercent(row.roi)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatBRL(row.cac_aprox)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add cost form */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Lançar Investimento
                <ChevronDown
                  className={`h-4 w-4 ml-auto transition-transform ${formOpen ? "rotate-180" : ""}`}
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="min-w-[160px]">
                <Label>Canal</Label>
                <Select value={costCanal} onValueChange={setCostCanal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANAIS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Início</Label>
                <Input
                  type="date"
                  value={costInicio}
                  onChange={(e) => setCostInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="date"
                  value={costFim}
                  onChange={(e) => setCostFim(e.target.value)}
                />
              </div>
              <div>
                <Label>Investimento (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costValor}
                  onChange={(e) => setCostValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <Button
                onClick={() => saveCost.mutate()}
                disabled={
                  !costCanal || !costValor || saveCost.isPending
                }
              >
                Salvar
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
