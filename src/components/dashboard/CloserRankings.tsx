import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, DollarSign, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface CloserRankingsProps {
  data:
    | {
        id: string;
        nome: string;
        fechamentos: number;
        valor: number;
      }[]
    | undefined;
  isLoading: boolean;
}

type SortBy = "fechamentos" | "valor";

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

export function CloserRankings({ data, isLoading }: CloserRankingsProps) {
  const [sortBy, setSortBy] = useState<SortBy>("fechamentos");
  const { user } = useAuth();

  const sortedData = data
    ? [...data].sort((a, b) =>
        sortBy === "fechamentos" ? b.fechamentos - a.fechamentos : b.valor - a.valor
      )
    : [];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-warning" />
              Ranking Closers
            </CardTitle>
            <CardDescription>Top performers do período</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              variant={sortBy === "fechamentos" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("fechamentos")}
            >
              <Hash className="mr-1 h-3 w-3" />
              Qtd
            </Button>
            <Button
              variant={sortBy === "valor" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy("valor")}
            >
              <DollarSign className="mr-1 h-3 w-3" />
              Valor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : sortedData.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum fechamento no período
          </div>
        ) : (
          <div className="space-y-3">
            {sortedData.slice(0, 5).map((closer, index) => (
              <div
                key={closer.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3 transition-colors",
                  closer.id === user?.id && "bg-primary/10 ring-1 ring-primary/20",
                  index === 0 && "bg-warning/10"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center">
                  {index < 3 ? (
                    <Trophy className={cn("h-5 w-5", medalColors[index])} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">
                      {index + 1}º
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{closer.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {closer.fechamentos} fechamento{closer.fechamentos !== 1 && "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-success">
                    {closer.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
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
