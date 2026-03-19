import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Meeting } from "@/hooks/useMeetings";

interface AgingChartProps {
  aging: {
    verde: Meeting[];
    amarelo: Meeting[];
    vermelho: Meeting[];
  };
}

type AgingLevel = "verde" | "amarelo" | "vermelho";

const agingConfig: Record<
  AgingLevel,
  { label: string; color: string; bgColor: string; range: string }
> = {
  verde: {
    label: "Saudável",
    color: "hsl(142, 76%, 36%)",
    bgColor: "bg-green-500/20",
    range: "0-5 dias",
  },
  amarelo: {
    label: "Atenção",
    color: "hsl(38, 92%, 50%)",
    bgColor: "bg-yellow-500/20",
    range: "6-14 dias",
  },
  vermelho: {
    label: "Crítico",
    color: "hsl(0, 84%, 60%)",
    bgColor: "bg-red-500/20",
    range: "15+ dias",
  },
};

export function AgingChart({ aging }: AgingChartProps) {
  const [selectedLevel, setSelectedLevel] = useState<AgingLevel | null>(null);

  const total = aging.verde.length + aging.amarelo.length + aging.vermelho.length;

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return (count / total) * 100;
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getDaysOpen = (criadoEm: string) => {
    return differenceInCalendarDays(new Date(), new Date(criadoEm));
  };

  const selectedMeetings = selectedLevel ? aging[selectedLevel] : [];
  const selectedConfig = selectedLevel ? agingConfig[selectedLevel] : null;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            Tempo em Aberto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["verde", "amarelo", "vermelho"] as AgingLevel[]).map((level) => {
            const config = agingConfig[level];
            const count = aging[level].length;
            const percentage = getPercentage(count);

            return (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({config.range})
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {count} proposta{count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-md overflow-hidden group-hover:ring-2 ring-primary/20 transition-all">
                  <div
                    className="h-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(percentage, count > 0 ? 10 : 0)}%`,
                      backgroundColor: config.color,
                    }}
                  >
                    {percentage > 15 && (
                      <span className="text-xs text-white font-medium">
                        {percentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Clique para ver os leads
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={selectedLevel !== null}
        onOpenChange={() => setSelectedLevel(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedConfig?.color }}
              />
              Propostas - {selectedConfig?.label} ({selectedConfig?.range})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedMeetings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma proposta nesta faixa
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Dias em Aberto</TableHead>
                    <TableHead>Valor Proposto</TableHead>
                    <TableHead>Closer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMeetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell className="font-medium">
                        {meeting.nome_lead || meeting.leads?.nome || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: selectedConfig?.color }}
                        >
                          {getDaysOpen(meeting.criado_em)} dias
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(meeting.valor_fechado)}
                      </TableCell>
                      <TableCell>{meeting.closer?.nome || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
