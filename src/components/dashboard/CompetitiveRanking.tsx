import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Trophy, Users, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CloserRankingItem {
  id: string;
  nome: string;
  fechamentos: number;
  valor: number;
}

interface SDRRankingItem {
  id: string;
  nome: string;
  agendadas: number;
  acontecidas: number;
}

interface CompetitiveRankingProps {
  type: "closers" | "sdrs";
  data?: CloserRankingItem[] | SDRRankingItem[];
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}

function MedalIcon({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="relative">
        <Crown className="h-6 w-6 text-yellow-500 absolute -top-3 left-1/2 -translate-x-1/2" />
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold shadow-lg">
          1
        </div>
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold shadow-md">
        2
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold shadow-md">
        3
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
      {position}
    </div>
  );
}

export function CompetitiveRanking({ type, data, isLoading }: CompetitiveRankingProps) {
  const { profile } = useAuth();
  const isCloser = type === "closers";
  
  const items = data || [];
  const maxValue = isCloser 
    ? Math.max(...(items as CloserRankingItem[]).map(i => i.fechamentos), 1)
    : Math.max(...(items as SDRRankingItem[]).map(i => i.acontecidas), 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isCloser ? (
            <>
              <Trophy className="h-5 w-5 text-warning" />
              Ranking Closers
            </>
          ) : (
            <>
              <Users className="h-5 w-5 text-primary" />
              Ranking SDRs
            </>
          )}
          <Badge variant="secondary" className="ml-auto">
            {items.length} {isCloser ? "closers" : "SDRs"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="divide-y">
            {items.map((item, index) => {
              const position = index + 1;
              const isCurrentUser = item.id === profile?.id;
              const isTop3 = position <= 3;
              
              if (isCloser) {
                const closerItem = item as CloserRankingItem;
                const progressPercent = (closerItem.fechamentos / maxValue) * 100;
                
                return (
                  <div
                    key={item.id}
                    className={`relative px-4 py-3 transition-colors ${
                      isCurrentUser 
                        ? 'bg-primary/10 border-l-4 border-l-primary' 
                        : isTop3 
                          ? 'bg-muted/30' 
                          : ''
                    } ${position === 1 ? 'leader-shine' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <MedalIcon position={position} />
                      
                      <Avatar className={`h-10 w-10 ${isTop3 ? 'ring-2 ring-warning/50' : ''}`}>
                        <AvatarFallback className={isTop3 ? 'bg-warning/20 text-warning' : ''}>
                          {getInitials(closerItem.nome)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                            {closerItem.nome}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="default" className="text-xs">Você</Badge>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              position === 1 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                                : position === 2 
                                  ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                                  : position === 3 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-700' 
                                    : 'bg-primary/60'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold">{closerItem.fechamentos}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(closerItem.valor)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const sdrItem = item as SDRRankingItem;
                const progressPercent = (sdrItem.acontecidas / maxValue) * 100;
                const taxaComparecimento = sdrItem.agendadas > 0 
                  ? Math.round((sdrItem.acontecidas / sdrItem.agendadas) * 100) 
                  : 0;
                
                return (
                  <div
                    key={item.id}
                    className={`relative px-4 py-3 transition-colors ${
                      isCurrentUser 
                        ? 'bg-primary/10 border-l-4 border-l-primary' 
                        : isTop3 
                          ? 'bg-muted/30' 
                          : ''
                    } ${position === 1 ? 'leader-shine' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <MedalIcon position={position} />
                      
                      <Avatar className={`h-10 w-10 ${isTop3 ? 'ring-2 ring-primary/50' : ''}`}>
                        <AvatarFallback className={isTop3 ? 'bg-primary/20 text-primary' : ''}>
                          {getInitials(sdrItem.nome)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                            {sdrItem.nome}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="default" className="text-xs">Você</Badge>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              position === 1 
                                ? 'bg-gradient-to-r from-blue-400 to-blue-600' 
                                : position === 2 
                                  ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                                  : position === 3 
                                    ? 'bg-gradient-to-r from-amber-500 to-amber-700' 
                                    : 'bg-primary/60'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold">{sdrItem.acontecidas}</p>
                        <p className="text-xs text-muted-foreground">
                          {sdrItem.agendadas} agend. ({taxaComparecimento}%)
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
