import { FileText, Brain, Rocket, AlertCircle, BarChart3 } from "lucide-react";
import { ReportBlock } from "./ReportBlock";
import { FixedMetricsSection } from "./FixedMetricsSection";
import type { AiReportOutput, DadosFixos } from "@/hooks/useWbrAiReports";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ReportDisplayProps {
  report: AiReportOutput;
  reportType: "WBR_SEMANAL" | "ANALISE_MENSAL";
  dadosFixos?: DadosFixos | null;
}

export function ReportDisplay({ report, reportType, dadosFixos }: ReportDisplayProps) {
  const ataTitle = reportType === "WBR_SEMANAL" ? "ATA WBR" : "ATA Mensal";

  // Format ATA content for copy
  const formatAtaForCopy = () => {
    const { ata } = report;
    let text = `📋 ${ataTitle}\n`;
    text += `Período: ${ata.periodo}\n\n`;
    text += `📝 RESUMO EXECUTIVO\n${ata.resumo_executivo}\n\n`;
    text += `📊 MÉTRICAS PRINCIPAIS\n`;
    ata.metricas_principais.forEach((m) => {
      text += `• ${m.metrica}: ${m.valor}${m.vs_meta ? ` (${m.vs_meta})` : ""}\n`;
    });
    text += `\n✅ DESTAQUES POSITIVOS\n`;
    ata.destaques_positivos.forEach((d) => {
      text += `• ${d}\n`;
    });
    text += `\n⚠️ PONTOS DE ATENÇÃO\n`;
    ata.pontos_de_atencao.forEach((p) => {
      text += `• ${p}\n`;
    });
    return text;
  };

  // Format Analysis content for copy
  const formatAnaliseForCopy = () => {
    const { analise_gestor } = report;
    let text = `🧠 ANÁLISE DO GESTOR\n\n`;
    text += `📈 PERFORMANCE GERAL\n${analise_gestor.performance_geral}\n\n`;
    
    if (analise_gestor.analise_por_fonte.length > 0) {
      text += `📍 ANÁLISE POR FONTE\n`;
      analise_gestor.analise_por_fonte.forEach((a) => {
        text += `• ${a.fonte}: ${a.insight}\n`;
      });
      text += "\n";
    }
    
    if (analise_gestor.analise_por_sdr.length > 0) {
      text += `👤 ANÁLISE POR SDR\n`;
      analise_gestor.analise_por_sdr.forEach((a) => {
        text += `• ${a.nome}: ${a.insight}\n`;
      });
      text += "\n";
    }
    
    if (analise_gestor.analise_por_closer.length > 0) {
      text += `🎯 ANÁLISE POR CLOSER\n`;
      analise_gestor.analise_por_closer.forEach((a) => {
        text += `• ${a.nome}: ${a.insight}\n`;
      });
      text += "\n";
    }
    
    text += `📦 ANÁLISE DO PIPELINE\n${analise_gestor.analise_pipeline}\n\n`;
    
    if (analise_gestor.hipoteses.length > 0) {
      text += `💡 HIPÓTESES\n`;
      analise_gestor.hipoteses.forEach((h) => {
        text += `• ${h}\n`;
      });
      text += "\n";
    }
    
    if (analise_gestor.evidencias.length > 0) {
      text += `📊 EVIDÊNCIAS\n`;
      analise_gestor.evidencias.forEach((e) => {
        text += `• ${e}\n`;
      });
    }
    
    return text;
  };

  // Format Action Plan for copy
  const formatAcoesForCopy = () => {
    const { plano_de_acao } = report;
    let text = `🚀 PLANO DE AÇÃO\n\n`;
    plano_de_acao.acoes.forEach((a) => {
      text += `${a.id}. ${a.acao}\n`;
      text += `   👤 Responsável: ${a.responsavel_sugerido}\n`;
      text += `   ⏰ Prazo: ${a.prazo}\n`;
      text += `   📏 Métrica: ${a.metrica_sucesso}\n\n`;
    });
    return text;
  };

  return (
    <div className="space-y-6">
      {/* If we have fixed metrics, show tabs */}
      {dadosFixos ? (
        <Tabs defaultValue="dados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dados do Período
            </TabsTrigger>
            <TabsTrigger value="analise" className="gap-2">
              <Brain className="h-4 w-4" />
              Análise IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <FixedMetricsSection dados={dadosFixos} />
          </TabsContent>

          <TabsContent value="analise" className="mt-4">
            <AiAnalysisContent
              report={report}
              ataTitle={ataTitle}
              formatAtaForCopy={formatAtaForCopy}
              formatAnaliseForCopy={formatAnaliseForCopy}
              formatAcoesForCopy={formatAcoesForCopy}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // Fallback: just show AI analysis if no fixed data
        <AiAnalysisContent
          report={report}
          ataTitle={ataTitle}
          formatAtaForCopy={formatAtaForCopy}
          formatAnaliseForCopy={formatAnaliseForCopy}
          formatAcoesForCopy={formatAcoesForCopy}
        />
      )}
    </div>
  );
}

// Extracted AI Analysis content component
function AiAnalysisContent({
  report,
  ataTitle,
  formatAtaForCopy,
  formatAnaliseForCopy,
  formatAcoesForCopy,
}: {
  report: AiReportOutput;
  ataTitle: string;
  formatAtaForCopy: () => string;
  formatAnaliseForCopy: () => string;
  formatAcoesForCopy: () => string;
}) {
  return (
    <div className="space-y-6">
      {/* ATA Block */}
      <ReportBlock
        title={ataTitle}
        icon={<FileText className="h-5 w-5 text-primary" />}
        copyContent={formatAtaForCopy()}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Período: {report.ata.periodo}
          </p>
          
          <div>
            <h4 className="font-semibold">Resumo Executivo</h4>
            <p>{report.ata.resumo_executivo}</p>
          </div>

          <div>
            <h4 className="font-semibold">Métricas Principais</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {report.ata.metricas_principais.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <span className="text-sm">{m.metrica}</span>
                  <div className="text-right">
                    <span className="font-semibold">{m.valor}</span>
                    {m.vs_meta && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {m.vs_meta}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-success">
                ✅ Destaques Positivos
              </h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {report.ata.destaques_positivos.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-warning">
                ⚠️ Pontos de Atenção
              </h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {report.ata.pontos_de_atencao.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </ReportBlock>

      {/* Analysis Block */}
      <ReportBlock
        title="Análise do Gestor"
        icon={<Brain className="h-5 w-5 text-info" />}
        copyContent={formatAnaliseForCopy()}
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Performance Geral</h4>
            <p className="text-sm">{report.analise_gestor.performance_geral}</p>
          </div>

          {report.analise_gestor.analise_por_fonte.length > 0 && (
            <div>
              <h4 className="font-semibold">Por Fonte</h4>
              <div className="mt-2 space-y-2">
                {report.analise_gestor.analise_por_fonte.map((a, i) => (
                  <div key={i} className="rounded-lg bg-muted p-3">
                    <span className="font-medium">{a.fonte}:</span>{" "}
                    <span className="text-sm">{a.insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.analise_gestor.analise_por_sdr.length > 0 && (
            <div>
              <h4 className="font-semibold">Por SDR</h4>
              <div className="mt-2 space-y-2">
                {report.analise_gestor.analise_por_sdr.map((a, i) => (
                  <div key={i} className="rounded-lg bg-muted p-3">
                    <span className="font-medium">{a.nome}:</span>{" "}
                    <span className="text-sm">{a.insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.analise_gestor.analise_por_closer.length > 0 && (
            <div>
              <h4 className="font-semibold">Por Closer</h4>
              <div className="mt-2 space-y-2">
                {report.analise_gestor.analise_por_closer.map((a, i) => (
                  <div key={i} className="rounded-lg bg-muted p-3">
                    <span className="font-medium">{a.nome}:</span>{" "}
                    <span className="text-sm">{a.insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold">Pipeline</h4>
            <p className="text-sm">{report.analise_gestor.analise_pipeline}</p>
          </div>

          {report.analise_gestor.hipoteses.length > 0 && (
            <div>
              <h4 className="font-semibold">Hipóteses</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                {report.analise_gestor.hipoteses.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </ReportBlock>

      {/* Action Plan Block */}
      <ReportBlock
        title="Plano de Ação"
        icon={<Rocket className="h-5 w-5 text-success" />}
        copyContent={formatAcoesForCopy()}
      >
        <div className="space-y-4">
          {report.plano_de_acao.acoes.map((acao) => (
            <div
              key={acao.id}
              className="rounded-lg border bg-muted/50 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {acao.id}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{acao.acao}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      👤 {acao.responsavel_sugerido}
                    </Badge>
                    <Badge variant="outline">⏰ {acao.prazo}</Badge>
                    <Badge variant="outline">📏 {acao.metrica_sucesso}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ReportBlock>

      {/* Limitations */}
      {(report.limitacoes_dos_dados.length > 0 ||
        report.checks_qualidade.campos_ausentes.length > 0 ||
        report.checks_qualidade.inconsistencias.length > 0) && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="h-5 w-5" />
            <h4 className="font-semibold">Limitações e Verificações</h4>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {report.limitacoes_dos_dados.map((l, i) => (
              <p key={i}>• {l}</p>
            ))}
            {report.checks_qualidade.campos_ausentes.map((c, i) => (
              <p key={`c-${i}`}>• Campo ausente: {c}</p>
            ))}
            {report.checks_qualidade.inconsistencias.map((inc, i) => (
              <p key={`i-${i}`}>• Inconsistência: {inc}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
