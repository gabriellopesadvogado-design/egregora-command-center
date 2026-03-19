import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface YearSelectorProps {
  value: number;
  onChange: (year: number) => void;
  minYear?: number;
}

export function YearSelector({ value, onChange, minYear = 2020 }: YearSelectorProps) {
  const currentYear = new Date().getFullYear();
  const canGoBack = value > minYear;
  const canGoForward = value < currentYear;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={!canGoBack}
        onClick={() => onChange(value - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Badge variant="secondary" className="px-3 py-1 text-sm font-medium">
        {value}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={!canGoForward}
        onClick={() => onChange(value + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
