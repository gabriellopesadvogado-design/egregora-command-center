import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface SDRRankingsProps {
  data:
    | {
        id: string;
        nome: string;
        agendadas: number;
        acontecidas: number;
      }[]
    | undefined;
  isLoading: boolean;
}

type SortBy = "agendadas" | "acontecidas";

export function SDRRankings({ data, isLoading }: SDRRankingsProps) {
  const [sortBy, setSortBy] = useState<SortBy>("acontecidas");
  const { user } = useAuth();

  const sortedData = data
    ? [...data].sort((a, b) =>
        sortBy === "agendadas" ? b.agendadas - a.agendadas : b.acontecidas - a.acontecidas
      )
    : [];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-info" />
              Ranking SDRs
            </CardTitle>
            <CardDescription>Reuniões no período</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={sortBy === "agendadas" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("agendadas")}
            >
              <Calendar className="mr-1 h-3 w-3" />
              Agendadas
            </Button>
            <Button
              variant={sortBy === "acontecidas" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("acontecidas")}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Realizadas
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhuma reunião no período
          </div>
        ) : (
          <div className="space-y-3">
            {sortedData.slice(0, 5).map((sdr, index) => (
              <div
                key={sdr.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 transition-colors",
                  sdr.id === user?.id && "bg-primary/10 ring-1 ring-primary/20"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center">
                  <span className="text-sm font-bold text-muted-foreground">
                    {index + 1}º
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{sdr.nome}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {sortBy === "agendadas" ? sdr.agendadas : sdr.acontecidas}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sortBy === "agendadas" ? "agendadas" : "realizadas"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
