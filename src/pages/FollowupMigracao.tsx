import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, addDays, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface MeetingRow {
  id: string;
  nome_lead: string | null;
  closer_id: string;
  data_reuniao: string;
  closer_nome?: string;
}

// Interfaces for PreviewRow, MigrationResult, and CadenceItem
interface PreviewRow {
  meeting_id: string;
  lead_name: string;
  dc: Date;
  d0: Date;
  passoAtual: string;
  stepsGerados: string[];
  stepsIgnorados: string[];
  alertaFaseMensal: boolean;
}

interface MigrationResult {
  meeting_id: string;
  lead_name: string;
  steps_gerados: string[];
  steps_ignorados: string[];
  alerta_fase_mensal: boolean;
}

interface CadenceItem {
  codigo: string;
  label: string;
  computeDate: (dc: Date, d0: Date) => Date;
  condition?: (dc: Date, d0: Date) => boolean;
}

const CADENCE: CadenceItem[] = [
  { codigo: "POS-WA",    label: "POS-WA (D0)",         computeDate: (_dc, d0) => d0 },
  { codigo: "CONF-WA",   label: "CONF-WA (DC-1)",      computeDate: (dc) => addDays(dc, -1), condition: (dc, d0) => differenceInDays(dc, d0) >= 2 },
  { codigo: "DC-LIG",    label: "DC-LIG (DC)",          computeDate: (dc) => dc },
  { codigo: "DC-WA",     label: "DC-WA (DC)",           computeDate: (dc) => dc },
  { codigo: "BAT1-LIG",  label: "BAT1-LIG (DC+1)",     computeDate: (dc) => addDays(dc, 1) },
  { codigo: "BAT1-WA",   label: "BAT1-WA (DC+1)",      computeDate: (dc) => addDays(dc, 1) },
  { codigo: "BAT2-LIG",  label: "BAT2-LIG (DC+2)",     computeDate: (dc) => addDays(dc, 2) },
  { codigo: "BAT2-WA",   label: "BAT2-WA (DC+2)",      computeDate: (dc) => addDays(dc, 2) },
  { codigo: "BAT3-WA",   label: "BAT3-WA (DC+3)",      computeDate: (dc) => addDays(dc, 3) },
  { codigo: "PAD6-WA",   label: "PAD6-WA (DC+6)",      computeDate: (dc) => addDays(dc, 6) },
  { codigo: "PAD10-WA",  label: "PAD10-WA (DC+10)",    computeDate: (dc) => addDays(dc, 10) },
  { codigo: "ENC14-WA",  label: "ENC14-WA (DC+14)",    computeDate: (dc) => addDays(dc, 14) },
  { codigo: "MEN1-WA",   label: "MEN1-WA (M+1)",       computeDate: (_dc, d0) => addMonths(d0, 1) },
  { codigo: "MEN2-LIG",  label: "MEN2-LIG (M+2)",      computeDate: (_dc, d0) => addMonths(d0, 2) },
  { codigo: "MEN3-WA",   label: "MEN3-WA (M+3)",       computeDate: (_dc, d0) => addMonths(d0, 3) },
  { codigo: "MEN6-WA",   label: "MEN6-WA (M+6)",       computeDate: (_dc, d0) => addMonths(d0, 6) },
];

function toSaoPauloDate(isoString: string): Date {
  const spStr = new Date(isoString).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(spStr + "T00:00:00");
}

function todaySP(): Date {
  const spStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(spStr + "T00:00:00");
}

function computePassoAtual(dc: Date, d0: Date, today: Date): string {
  const diasDesdeD0 = differenceInDays(today, d0);
  const diasDesdeDC = differenceInDays(today, dc);

  if (diasDesdeD0 === 0) return "Pós-reunião (D0)";
  if (diasDesdeDC < -1) return "Aguardando DC";
  if (diasDesdeDC === -1) return "Confirmação (DC-1)";
  if (diasDesdeDC === 0) return "DC — hoje";
  if (diasDesdeDC <= 3) return `Bateria (DC+${diasDesdeDC})`;
  if (diasDesdeDC <= 14) return `Acompanhamento (DC+${diasDesdeDC})`;
  if (diasDesdeD0 >= 30) return `Fase mensal (D0+${Math.floor(diasDesdeD0 / 30)}m)`;
  return `Pós-cadência (DC+${diasDesdeDC})`;
}

function simulateSteps(dc: Date, d0: Date, today: Date) {
  const gerados: string[] = [];
  const ignorados: string[] = [];
  for (const step of CADENCE) {
    if (step.condition && !step.condition(dc, d0)) {
      ignorados.push(`${step.label} (condição)`);
      continue;
    }
    const dataPrevista = step.computeDate(dc, d0);
    if (dataPrevista >= today) {
      gerados.push(step.label);
    } else {
      ignorados.push(step.label);
    }
  }
  return { gerados, ignorados };
}

export default function FollowupMigracao() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dcMap, setDcMap] = useState<Record<string, Date>>({});
  const [allowPartial, setAllowPartial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{\
    results: MigrationResult[];
    totals: { total_meetings: number; total_steps_gerados: number; total_steps_ignorados: number };
  } | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["migration-meetings"],
    queryFn: async () => {
      const { data: mtgs, error } = await supabase
        .from("crm_meetings")
        .select("id, nome_lead, closer_id, data_reuniao")
        .eq("status", "proposta_enviada");
      if (error) throw error;

      const closerIds = [...new Set((mtgs || []).map((m: any) => m.closer_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (closerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("core_users")
          .select("id, nome")
          .in("id", closerIds);
        profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.nome]));
      }

      return (mtgs || []).map((m: any) => ({
        id: m.id,
        nome_lead: m.nome_lead,
        closer_id: m.closer_id,
        data_reuniao: m.data_reuniao,
        closer_nome: m.closer_id ? profileMap[m.closer_id] || m.closer_id : "—",
      })) as MeetingRow[];
    },
  });

  const today = useMemo(() => todaySP(), []);

  const filledCount = Object.keys(dcMap).length;
  const totalCount = meetings.length;

  const canProceed = allowPartial ? filledCount > 0 : filledCount === totalCount && totalCount > 0;

  const previewRows = useMemo<PreviewRow[]>(() => {
    return meetings
      .filter((m) => dcMap[m.id])
      .map((m) => {
        const dc = dcMap[m.id];
        const d0 = toSaoPauloDate(m.data_reuniao);
        const { gerados, ignorados } = simulateSteps(dc, d0, today);
        return {
          meeting_id: m.id,
          lead_name: m.nome_lead || "Sem nome",
          dc,
          d0,
          passoAtual: computePassoAtual(dc, d0, today),
          stepsGerados: gerados,
          stepsIgnorados: ignorados,
          alertaFaseMensal: differenceInDays(today, dc) > 14,
        };
      });
  }, [meetings, dcMap, today]);

  // Admin guard — after all hooks
  if (role !== "admin") {
    navigate("/followup", { replace: true });
    return null;
  }

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const items = previewRows.map((r) => ({
        meeting_id: r.meeting_id,
        primeiro_followup_em: format(r.dc, "yyyy-MM-dd"),
      }));

      const { data, error } = await supabase.functions.invoke("migrate-existing-leads", {
        body: { items },
      });

      if (error) throw error;
      setResults(data);
      setStep(3);
    } catch (err: any) {
      toast({
        title: "Erro na migração",
        description: err.message || "Falha ao executar migração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setDc = (meetingId: string, date: Date | undefined) => {
    setDcMap((prev) => {
      if (!date) {
        const copy = { ...prev };
        delete copy[meetingId];
        return copy;
      }
      return { ...prev, [meetingId]: date };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Migração de Follow-ups</h1>
        <p className="text-muted-foreground">
          Preencha o dia combinado (DC) para leads em proposta enviada sem cadência de follow-up.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors",
              step === s
                ? "bg-primary text-primary-foreground"
                : step > s
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {s}. {s === 1 ? "Preenchimento" : s === 2 ? "Preview" : "Resultado"}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          {totalCount === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Tudo certo!</AlertTitle>
              <AlertDescription>
                Não há leads em "proposta enviada" sem cadência de follow-up.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Closer</TableHead>
                      <TableHead>D0 (Reunião)</TableHead>
                      <TableHead>DC (Dia combinado)</TableHead>
                      <TableHead className="text-right">Dias desde reunião</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meetings.map((m) => {
                      const d0 = toSaoPauloDate(m.data_reuniao);
                      const dias = differenceInDays(today, d0);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">
                            {m.nome_lead || "Sem nome"}
                          </TableCell>
                          <TableCell>{m.closer_nome}</TableCell>
                          <TableCell>
                            {format(d0, "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "w-[160px] justify-start text-left font-normal",
                                    !dcMap[m.id] && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {dcMap[m.id]
                                    ? format(dcMap[m.id], "dd/MM/yyyy")
                                    : "Selecionar"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dcMap[m.id]}
                                  onSelect={(d) => setDc(m.id, d)}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={dias > 30 ? "destructive" : dias > 14 ? "secondary" : "outline"}>
                              {dias} dias
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {filledCount} de {totalCount} leads preenchidos
                  </span>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={allowPartial}
                      onCheckedChange={(v) => setAllowPartial(!!v)}
                    />
                    Permitir salvar parcialmente
                  </label>
                </div>
                <Button onClick={() => setStep(2)} disabled={!canProceed}>
                  Gerar cadências
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2 — Preview */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>DC informado</TableHead>
                  <TableHead>Passo atual estimado</TableHead>
                  <TableHead>Steps a gerar</TableHead>
                  <TableHead>Steps ignorados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => (
                  <TableRow key={r.meeting_id}>
                    <TableCell className="font-medium">{r.lead_name}</TableCell>
                    <TableCell>{format(r.dc, "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={r.alertaFaseMensal ? "destructive" : "secondary"}
                      >
                        {r.passoAtual}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.stepsGerados.length > 0
                        ? r.stepsGerados.join(", ")
                        : <span className="text-muted-foreground">Nenhum</span>}
                    </TableCell>
                    <TableCell>
                      {r.stepsIgnorados.length > 0
                        ? r.stepsIgnorados.join(", ")
                        : <span className="text-muted-foreground">Nenhum</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {previewRows.some((r) => r.alertaFaseMensal) && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Alguns leads têm DC há mais de 14 dias — entrarão direto na fase mensal.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar e corrigir
            </Button>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar e gerar
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — Results */}
      {step === 3 && results && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{results.totals.total_meetings}</p>
              <p className="text-sm text-muted-foreground">Leads migrados</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold text-primary">{results.totals.total_steps_gerados}</p>
              <p className="text-sm text-muted-foreground">Steps gerados</p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-3xl font-bold text-muted-foreground">{results.totals.total_steps_ignorados}</p>
              <p className="text-sm text-muted-foreground">Steps ignorados (passados)</p>
            </div>
          </div>

          {results.results.some((r) => r.alerta_fase_mensal) && (
            <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Fase mensal</AlertTitle>
              <AlertDescription>
                Os seguintes leads entraram direto na fase mensal:{" "}
                {results.results
                  .filter((r) => r.alerta_fase_mensal)
                  .map((r) => r.lead_name)
                  .join(", ")}
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={() => navigate("/followup")}>
            Ir para Follow-ups
          </Button>
        </div>
      )}
    </div>
  );
}
