import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Eye, Trash2, Sparkles } from "lucide-react";
import type { WbrAiReport } from "@/hooks/useWbrAiReports";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReportHistoryProps {
  reports: WbrAiReport[];
  onView: (report: WbrAiReport) => void;
  onDelete: (reportId: string) => void;
  isDeleting: boolean;
}

export function ReportHistory({
  reports,
  onView,
  onDelete,
  isDeleting,
}: ReportHistoryProps) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">
            Nenhum relatório gerado ainda.
          </p>
          <p className="text-sm text-muted-foreground">
            Gere seu primeiro relatório acima.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Histórico de Relatórios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between rounded-lg border bg-muted/30 p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      report.report_type === "WBR_SEMANAL"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {report.report_type === "WBR_SEMANAL"
                      ? "WBR Semanal"
                      : "Análise Mensal"}
                  </Badge>
                  {report.premium_mode && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-sm">
                  {format(new Date(report.date_start), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}{" "}
                  a{" "}
                  {format(new Date(report.date_end), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  Gerado em{" "}
                  {format(new Date(report.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(report)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O relatório será
                        permanentemente removido do histórico.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(report.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
