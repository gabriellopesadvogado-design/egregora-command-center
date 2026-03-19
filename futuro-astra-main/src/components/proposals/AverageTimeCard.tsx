import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AverageTimeCardProps {
  tempoMedio: number | null;
}

export function AverageTimeCard({ tempoMedio }: AverageTimeCardProps) {
  const formatTempo = (dias: number | null) => {
    if (dias === null) return "-";
    if (dias < 1) return "< 1 dia";
    return dias.toFixed(1).replace(".", ",");
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Tempo Médio para Fechar
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="text-4xl font-bold text-primary">
          {formatTempo(tempoMedio)}
        </div>
        {tempoMedio !== null && (
          <span className="text-lg text-muted-foreground">dias</span>
        )}
        <p className="text-sm text-muted-foreground mt-2 text-center">
          Da proposta ao fechamento
        </p>
        {tempoMedio === null && (
          <p className="text-xs text-muted-foreground mt-1">
            Sem dados suficientes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
