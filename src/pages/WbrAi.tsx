import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, Clock } from "lucide-react";
import { WbrReportForm } from "@/components/wbr-ai/WbrReportForm";
import { ReportDisplay } from "@/components/wbr-ai/ReportDisplay";
import { ReportHistory } from "@/components/wbr-ai/ReportHistory";
import {
  useGenerateWbrReport,
  useWbrReportHistory,
  useDeleteWbrReport,
  extractDadosFixos,
  type AiReportOutput,
  type DadosFixos,
  type WbrAiReport,
  type ManualInputs,
} from "@/hooks/useWbrAiReports";

export default function WbrAi() {
  const [currentReport, setCurrentReport] = useState<AiReportOutput | null>(null);
  const [currentDadosFixos, setCurrentDadosFixos] = useState<DadosFixos | null>(null);
  const [currentReportType, setCurrentReportType] = useState<"WBR_SEMANAL" | "ANALISE_MENSAL">("WBR_SEMANAL");
  const [activeTab, setActiveTab] = useState("gerar");

  const { mutate: generateReport, isPending: isGenerating } = useGenerateWbrReport();
  const { data: history = [], isLoading: isLoadingHistory } = useWbrReportHistory();
  const { mutate: deleteReport, isPending: isDeleting } = useDeleteWbrReport();

  const handleGenerateReport = (params: {
    report_type: "WBR_SEMANAL" | "ANALISE_MENSAL";
    date_start: string;
    date_end: string;
    premium_mode: boolean;
    manual_inputs: ManualInputs;
  }) => {
    generateReport(params, {
      onSuccess: (data) => {
        setCurrentReport(data.report);
        setCurrentDadosFixos(data.dados_fixos);
        setCurrentReportType(params.report_type);
      },
    });
  };

  const handleViewReport = (report: WbrAiReport) => {
    setCurrentReport(report.ai_output_json);
    setCurrentDadosFixos(extractDadosFixos(report));
    setCurrentReportType(report.report_type as "WBR_SEMANAL" | "ANALISE_MENSAL");
    setActiveTab("gerar");
  };

  const handleDeleteReport = (reportId: string) => {
    deleteReport(reportId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Sparkles className="h-8 w-8 text-primary" />
          Relatórios IA
        </h1>
        <p className="mt-1 text-muted-foreground">
          Gere relatórios comerciais inteligentes com análise de IA
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="gerar" className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Relatório
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerar" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Relatório</CardTitle>
                <CardDescription>
                  Selecione o período e adicione dados opcionais para uma análise
                  mais completa.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WbrReportForm
                  onSubmit={handleGenerateReport}
                  isLoading={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Report Preview */}
            <div className="space-y-6">
              {currentReport ? (
                <ReportDisplay
                  report={currentReport}
                  reportType={currentReportType}
                  dadosFixos={currentDadosFixos}
                />
              ) : (
                <Card className="flex min-h-[400px] items-center justify-center">
                  <CardContent className="text-center">
                    <Sparkles className="mx-auto h-16 w-16 text-muted-foreground/30" />
                    <p className="mt-4 text-lg font-medium text-muted-foreground">
                      Nenhum relatório gerado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Configure os parâmetros e clique em "Gerar Relatório com IA"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          {isLoadingHistory ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Carregando histórico...</p>
              </CardContent>
            </Card>
          ) : (
            <ReportHistory
              reports={history}
              onView={handleViewReport}
              onDelete={handleDeleteReport}
              isDeleting={isDeleting}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
