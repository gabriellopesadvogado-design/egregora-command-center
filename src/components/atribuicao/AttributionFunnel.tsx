interface AttributionFunnelProps {
  leads: number;
  qualified: number;
  proposals: number;
  closedWon: number;
  closedLost: number;
}

export function AttributionFunnel({ leads, qualified, proposals, closedWon, closedLost }: AttributionFunnelProps) {
  const stages = [
    { label: "Leads", value: leads, color: "bg-blue-500" },
    { label: "Qualificados", value: qualified, color: "bg-cyan-500" },
    { label: "Propostas", value: proposals, color: "bg-amber-500" },
    { label: "Fechados", value: closedWon, color: "bg-green-500" },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);
  
  const getConversionRate = (current: number, previous: number) => {
    if (!previous) return "—";
    return `${((current / previous) * 100).toFixed(0)}%`;
  };

  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const width = (stage.value / maxValue) * 100;
        const prevValue = index > 0 ? stages[index - 1].value : null;
        
        return (
          <div key={stage.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{stage.label}</span>
              <div className="flex items-center gap-4">
                {prevValue !== null && (
                  <span className="text-muted-foreground text-xs">
                    {getConversionRate(stage.value, prevValue)} conversão
                  </span>
                )}
                <span className="font-bold">{stage.value.toLocaleString("pt-BR")}</span>
              </div>
            </div>
            <div className="h-8 bg-muted rounded-lg overflow-hidden">
              <div 
                className={`h-full ${stage.color} rounded-lg transition-all duration-500`}
                style={{ width: `${Math.max(width, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
      
      {closedLost > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Perdidos</span>
            <span>{closedLost.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
