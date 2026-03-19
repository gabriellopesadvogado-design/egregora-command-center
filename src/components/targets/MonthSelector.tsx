import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MonthSelectorProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
}

export function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const canGoForward =
    year < currentYear || (year === currentYear && month < currentMonth);

  const goBack = () => {
    if (month === 1) {
      onChange(year - 1, 12);
    } else {
      onChange(year, month - 1);
    }
  };

  const goForward = () => {
    if (month === 12) {
      onChange(year + 1, 1);
    } else {
      onChange(year, month + 1);
    }
  };

  const monthName = format(new Date(year, month - 1), "MMMM yyyy", {
    locale: ptBR,
  });

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goBack}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Badge variant="secondary" className="capitalize px-3 py-1 text-sm font-medium">
        {monthName}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={!canGoForward}
        onClick={goForward}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
