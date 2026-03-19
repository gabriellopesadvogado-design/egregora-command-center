import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  FileText,
  FolderOpen,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  Copy,
  Check,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { DadosFixos } from "@/hooks/useWbrAiReports";

interface FixedMetricsSectionProps {
  dados: DadosFixos;
}

// Format currency in Brazilian format
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format date in Brazilian format
const formatDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

// Section with copy button
function MetricSection({
  title,
  icon,
  children,
  copyContent,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  copyContent: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(copyContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 gap-1"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FixedMetricsSection({ dados }: FixedMetricsSectionProps) {
  // Generate copy content for all sections
  const generateFullCopyContent = () => {
    let text = `📊 DADOS DO PERÍODO: ${formatDate(dados.periodo.inicio)} a ${formatDate(dados.periodo.fim)}\n\n`;

    // Reuniões
    text += `👥 REUNIÕES REALIZADAS: ${dados.reunioes.total_realizadas}`;
    if (dados.reunioes.meta_reunioes) {
      text += ` (${dados.reunioes.percentual_meta}% da meta)`;
    }
    text += `\n`;
    text += `Por Origem:\n`;
    dados.reunioes.por_origem.forEach((o) => {
      text += `  • ${o.origem}: ${o.qtd} (${o.percentual}%)\n`;
    });
    text += `Por Closer:\n`;
    dados.reunioes.por_closer.forEach((c) => {
      text += `  • ${c.nome}: ${c.qtd}\n`;
    });

    // Propostas enviadas
    text += `\n📄 PROPOSTAS ENVIADAS: ${dados.propostas_enviadas.total}\n`;
    text += `Por Closer:\n`;
    dados.propostas_enviadas.por_closer.forEach((c) => {
      text += `  • ${c.nome}: ${c.qtd}\n`;
    });
    text += `Por Origem:\n`;
    dados.propostas_enviadas.por_origem.forEach((o) => {
      text += `  • ${o.origem}: ${o.qtd}\n`;
    });

    // Propostas em aberto
    text += `\n📂 PROPOSTAS EM ABERTO: ${dados.propostas_em_aberto.total} | Valor: ${formatCurrency(dados.propostas_em_aberto.valor_bruto)}\n`;
    text += `Por Closer:\n`;
    dados.propostas_em_aberto.por_closer.forEach((c) => {
      text += `  • ${c.nome}: ${c.qtd} | ${formatCurrency(c.valor)}\n`;
    });

    // Fechamentos
    text += `\n🏆 FECHAMENTOS: ${dados.fechamentos.total_contratos} contratos\n`;
    text += `Valor Fechado: ${formatCurrency(dados.fechamentos.valor_fechado)}\n`;
    text += `Caixa Gerado: ${formatCurrency(dados.fechamentos.caixa_gerado)}\n`;
    text += `Por Closer:\n`;
    dados.fechamentos.por_closer.forEach((c) => {
      text += `  • ${c.nome}: ${c.qtd} | ${formatCurrency(c.valor_fechado)} | Caixa: ${formatCurrency(c.caixa_gerado)}\n`;
    });

    // Meta - condicional por tipo de relatório
    if (dados.metas_semanais) {
      text += `\n🎯 METAS DA SEMANA\n`;
      if (dados.metas_semanais.meta_reunioes) {
        text += `Meta Reuniões: ${dados.metas_semanais.meta_reunioes}\n`;
        text += `Realizadas: ${dados.metas_semanais.reunioes_realizadas} (${dados.metas_semanais.percentual_reunioes}%)\n`;
      }
      if (dados.metas_semanais.meta_contratos) {
        text += `Meta Contratos: ${dados.metas_semanais.meta_contratos}\n`;
        text += `Fechados: ${dados.metas_semanais.contratos_fechados} (${dados.metas_semanais.percentual_contratos}%)\n`;
      }
    } else {
      text += `\n🎯 META DO MÊS\n`;
      if (dados.meta_mensal.meta_faturamento) {
        text += `Meta Faturamento: ${formatCurrency(dados.meta_mensal.meta_faturamento)}\n`;
        text += `Realizado: ${formatCurrency(dados.meta_mensal.realizado)} (${dados.meta_mensal.percentual_atingimento}%)\n`;
      }
    }

    // Tempo médio
    if (dados.tempo_medio_fechamento !== null) {
      text += `\n⏱️ TEMPO MÉDIO DE FECHAMENTO: ${dados.tempo_medio_fechamento} dias\n`;
    }

    // Forecast
    text += `\n📈 FORECAST\n`;
    text += `Pipeline Bruto: ${formatCurrency(dados.forecast.valor_bruto_pipeline)}\n`;
    text += `Forecast Ponderado: ${formatCurrency(dados.forecast.forecast_ponderado)}\n`;
    text += `Previsão 14 dias: ${formatCurrency(dados.forecast.forecast_14_dias)}\n`;
    text += `Previsão 30 dias: ${formatCurrency(dados.forecast.forecast_30_dias)}\n`;
    text += `Aging: 🟢 ${dados.forecast.aging.verde} | 🟡 ${dados.forecast.aging.amarelo} | 🔴 ${dados.forecast.aging.vermelho}\n`;

    // SDRs
    if (dados.sdrs?.por_sdr?.length > 0) {
      text += `\n👤 SDRs\n`;
      dados.sdrs.por_sdr.forEach((s) => {
        text += `• ${s.nome}: ${s.total_agendadas} agendadas | ${s.ganhas} ganhas (${s.taxa_conversao}%) | No Show: ${s.no_shows} (${s.taxa_no_show}%) | Qualidade: Boa ${s.qualidade.boa}, Neutra ${s.qualidade.neutra}, Ruim ${s.qualidade.ruim}\n`;
      });
    }

    return text;
  };

  return (
    <div className="space-y-4">
      {/* Header with period and copy all */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dados do Período</h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(dados.periodo.inicio)} a {formatDate(dados.periodo.fim)}
          </p>
        </div>
        <CopyAllButton content={generateFullCopyContent()} />
      </div>

      {/* 1. Reuniões */}
      <MetricSection
        title="Reuniões Realizadas"
        icon={<Users className="h-4 w-4 text-primary" />}
        copyContent={`Reuniões: ${dados.reunioes.total_realizadas}${dados.reunioes.meta_reunioes ? ` (${dados.reunioes.percentual_meta}% da meta)` : ""}`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{dados.reunioes.total_realizadas}</span>
            {dados.reunioes.meta_reunioes && (
              <Badge variant={dados.reunioes.percentual_meta >= 100 ? "default" : "secondary"}>
                {dados.reunioes.percentual_meta}% da meta ({dados.reunioes.meta_reunioes})
              </Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Por Origem */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Por Origem</h4>
              <div className="space-y-2">
                {dados.reunioes.por_origem.map((o) => (
                  <div key={o.origem} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{o.origem}</span>
                    <span>
                      {o.qtd} <span className="text-muted-foreground">({o.percentual}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Por Closer */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Por Closer</h4>
              <div className="space-y-2">
                {dados.reunioes.por_closer.map((c) => (
                  <div key={c.nome} className="flex items-center justify-between text-sm">
                    <span>{c.nome}</span>
                    <span className="font-medium">{c.qtd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MetricSection>

      {/* 2. Propostas Enviadas */}
      <MetricSection
        title="Propostas Enviadas"
        icon={<FileText className="h-4 w-4 text-info" />}
        copyContent={`Propostas Enviadas: ${dados.propostas_enviadas.total}`}
      >
        <div className="space-y-4">
          <span className="text-2xl font-bold">{dados.propostas_enviadas.total}</span>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Por Closer</h4>
              <div className="space-y-2">
                {dados.propostas_enviadas.por_closer.map((c) => (
                  <div key={c.nome} className="flex items-center justify-between text-sm">
                    <span>{c.nome}</span>
                    <span className="font-medium">{c.qtd}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Por Origem</h4>
              <div className="space-y-2">
                {dados.propostas_enviadas.por_origem.map((o) => (
                  <div key={o.origem} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{o.origem}</span>
                    <span className="font-medium">{o.qtd}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </MetricSection>

      {/* 3. Propostas em Aberto */}
      <MetricSection
        title="Propostas em Aberto (Pipeline)"
        icon={<FolderOpen className="h-4 w-4 text-warning" />}
        copyContent={`Propostas em Aberto: ${dados.propostas_em_aberto.total} | ${formatCurrency(dados.propostas_em_aberto.valor_bruto)}`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold">{dados.propostas_em_aberto.total}</span>
            <Badge variant="outline" className="text-lg">
              {formatCurrency(dados.propostas_em_aberto.valor_bruto)}
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Closer</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.propostas_em_aberto.por_closer.map((c) => (
                <TableRow key={c.nome}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell className="text-center">{c.qtd}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(c.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </MetricSection>

      {/* 4. Fechamentos */}
      <MetricSection
        title="Fechamentos"
        icon={<Trophy className="h-4 w-4 text-success" />}
        copyContent={`Fechamentos: ${dados.fechamentos.total_contratos} | ${formatCurrency(dados.fechamentos.valor_fechado)}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Contratos</p>
              <p className="text-2xl font-bold">{dados.fechamentos.total_contratos}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Fechado</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(dados.fechamentos.valor_fechado)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Caixa Gerado</p>
              <p className="text-2xl font-bold">{formatCurrency(dados.fechamentos.caixa_gerado)}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Closer</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right">Valor Fechado</TableHead>
                <TableHead className="text-right">Caixa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.fechamentos.por_closer.map((c) => (
                <TableRow key={c.nome}>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell className="text-center">{c.qtd}</TableCell>
                  <TableCell className="text-right font-medium text-success">
                    {formatCurrency(c.valor_fechado)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(c.caixa_gerado)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {dados.fechamentos.por_origem.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">Por Origem</h4>
              <div className="space-y-2">
                {dados.fechamentos.por_origem.map((o) => (
                  <div key={o.origem} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{o.origem}</span>
                    <span>
                      {o.qtd} contratos | {formatCurrency(o.valor_fechado)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </MetricSection>

      {/* 5. Metas - condicional por tipo de relatório */}
      {dados.metas_semanais ? (
        <MetricSection
          title="Metas da Semana"
          icon={<Target className="h-4 w-4 text-primary" />}
          copyContent={`Metas Semanais: Reuniões ${dados.metas_semanais.reunioes_realizadas}/${dados.metas_semanais.meta_reunioes ?? "N/A"} | Contratos ${dados.metas_semanais.contratos_fechados}/${dados.metas_semanais.meta_contratos ?? "N/A"}`}
        >
          <div className="space-y-4">
            {/* Meta de Reuniões */}
            {dados.metas_semanais.meta_reunioes ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reuniões Realizadas</span>
                  <span className="text-sm text-muted-foreground">
                    {dados.metas_semanais.reunioes_realizadas} / {dados.metas_semanais.meta_reunioes}
                  </span>
                </div>
                <Progress
                  value={Math.min(dados.metas_semanais.percentual_reunioes, 100)}
                  className="h-3"
                />
                <div className="flex justify-end">
                  <Badge variant={dados.metas_semanais.percentual_reunioes >= 100 ? "default" : "secondary"}>
                    {dados.metas_semanais.percentual_reunioes}% atingido
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Meta de reuniões não definida</p>
            )}

            {/* Meta de Contratos */}
            {dados.metas_semanais.meta_contratos ? (
              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contratos Fechados</span>
                  <span className="text-sm text-muted-foreground">
                    {dados.metas_semanais.contratos_fechados} / {dados.metas_semanais.meta_contratos}
                  </span>
                </div>
                <Progress
                  value={Math.min(dados.metas_semanais.percentual_contratos, 100)}
                  className="h-3"
                />
                <div className="flex justify-end">
                  <Badge variant={dados.metas_semanais.percentual_contratos >= 100 ? "default" : "secondary"}>
                    {dados.metas_semanais.percentual_contratos}% atingido
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground border-t pt-4">Meta de contratos não definida</p>
            )}
          </div>
        </MetricSection>
      ) : (
        <MetricSection
          title="Meta do Mês"
          icon={<Target className="h-4 w-4 text-primary" />}
          copyContent={`Meta: ${dados.meta_mensal.meta_faturamento ? formatCurrency(dados.meta_mensal.meta_faturamento) : "N/A"} | Realizado: ${formatCurrency(dados.meta_mensal.realizado)} (${dados.meta_mensal.percentual_atingimento}%)`}
        >
          <div className="space-y-4">
            {dados.meta_mensal.meta_faturamento ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Faturamento</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(dados.meta_mensal.realizado)} /{" "}
                    {formatCurrency(dados.meta_mensal.meta_faturamento)}
                  </span>
                </div>
                <Progress
                  value={Math.min(dados.meta_mensal.percentual_atingimento, 100)}
                  className="h-3"
                />
                <div className="flex justify-end">
                  <Badge variant={dados.meta_mensal.percentual_atingimento >= 100 ? "default" : "secondary"}>
                    {dados.meta_mensal.percentual_atingimento}% atingido
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Meta mensal não definida</p>
            )}
          </div>
        </MetricSection>
      )}

      {/* 6. Tempo Médio */}
      <MetricSection
        title="Tempo Médio de Fechamento"
        icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        copyContent={`Tempo Médio: ${dados.tempo_medio_fechamento ?? "N/A"} dias`}
      >
        {dados.tempo_medio_fechamento !== null ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{dados.tempo_medio_fechamento}</span>
            <span className="text-lg text-muted-foreground">dias</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes para calcular
          </p>
        )}
      </MetricSection>

      {/* 7. Forecast */}
      <MetricSection
        title="Forecast"
        icon={<TrendingUp className="h-4 w-4 text-success" />}
        copyContent={`Forecast: ${formatCurrency(dados.forecast.forecast_ponderado)}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Bruto</p>
              <p className="text-xl font-bold">
                {formatCurrency(dados.forecast.valor_bruto_pipeline)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ponderado</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(dados.forecast.forecast_ponderado)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">14 dias</p>
              <p className="text-xl font-bold">{formatCurrency(dados.forecast.forecast_14_dias)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">30 dias</p>
              <p className="text-xl font-bold">{formatCurrency(dados.forecast.forecast_30_dias)}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">
              Aging do Pipeline
            </h4>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">≤5 dias:</span>
                <span className="font-bold">{dados.forecast.aging.verde}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-sm">6-14 dias:</span>
                <span className="font-bold">{dados.forecast.aging.amarelo}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm">&gt;14 dias:</span>
                <span className="font-bold">{dados.forecast.aging.vermelho}</span>
              </div>
            </div>
          </div>
        </div>
      </MetricSection>

      {/* 8. SDRs */}
      {dados.sdrs?.por_sdr?.length > 0 && (
        <MetricSection
          title="SDRs"
          icon={<UserCheck className="h-4 w-4 text-primary" />}
          copyContent={dados.sdrs.por_sdr.map((s) => 
            `${s.nome}: ${s.total_agendadas} agendadas | ${s.ganhas} ganhas (${s.taxa_conversao}%) | No Show: ${s.no_shows} (${s.taxa_no_show}%)`
          ).join('\n')}
        >
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SDR</TableHead>
                  <TableHead className="text-center">Agendadas</TableHead>
                  <TableHead className="text-center">Ganhas</TableHead>
                  <TableHead className="text-center">Conv%</TableHead>
                  <TableHead className="text-center">No Show</TableHead>
                  <TableHead className="text-center">NS%</TableHead>
                  <TableHead className="text-center">Boa</TableHead>
                  <TableHead className="text-center">Neutra</TableHead>
                  <TableHead className="text-center">Ruim</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.sdrs.por_sdr.map((s) => (
                  <TableRow key={s.nome}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell className="text-center">{s.total_agendadas}</TableCell>
                    <TableCell className="text-center font-medium text-success">
                      {s.ganhas}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.taxa_conversao >= 20 ? "default" : "secondary"}>
                        {s.taxa_conversao}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{s.no_shows}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline"
                        className={
                          s.taxa_no_show <= 5 
                            ? "border-success text-success" 
                            : s.taxa_no_show <= 15 
                              ? "border-warning text-warning" 
                              : "border-destructive text-destructive"
                        }
                      >
                        {s.taxa_no_show}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-success">{s.qualidade.boa}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({s.percentual_qualidade.boa}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-warning">{s.qualidade.neutra}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({s.percentual_qualidade.neutra}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-destructive">{s.qualidade.ruim}</span>
                      <span className="text-muted-foreground text-xs ml-1">
                        ({s.percentual_qualidade.ruim}%)
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Quality distribution visual */}
            <div className="border-t pt-4">
              <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                Distribuição de Qualidade por SDR
              </h4>
              <div className="space-y-3">
                {dados.sdrs.por_sdr.map((s) => (
                  <div key={s.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.nome}</span>
                      <span className="text-muted-foreground">
                        {s.total_agendadas} reuniões
                      </span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                      {s.percentual_qualidade.boa > 0 && (
                        <div 
                          className="bg-success transition-all"
                          style={{ width: `${s.percentual_qualidade.boa}%` }}
                          title={`Boa: ${s.percentual_qualidade.boa}%`}
                        />
                      )}
                      {s.percentual_qualidade.neutra > 0 && (
                        <div 
                          className="bg-warning transition-all"
                          style={{ width: `${s.percentual_qualidade.neutra}%` }}
                          title={`Neutra: ${s.percentual_qualidade.neutra}%`}
                        />
                      )}
                      {s.percentual_qualidade.ruim > 0 && (
                        <div 
                          className="bg-destructive transition-all"
                          style={{ width: `${s.percentual_qualidade.ruim}%` }}
                          title={`Ruim: ${s.percentual_qualidade.ruim}%`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span>Boa</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-warning" />
                  <span>Neutra</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <span>Ruim</span>
                </div>
              </div>
            </div>
          </div>
        </MetricSection>
      )}
    </div>
  );
}

// Copy All button component
function CopyAllButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copiado!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copiar Tudo
        </>
      )}
    </Button>
  );
}
