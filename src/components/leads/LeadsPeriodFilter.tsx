import { useState } from "react";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LeadsPeriodType = "today" | "7_days" | "month" | "custom" | "all";

interface LeadsPeriodFilterProps {
  value: LeadsPeriodType;
  onChange: (period: LeadsPeriodType) => void;
  customRange?: { start: Date; end: Date };
  onCustomRangeChange?: (range: { start: Date; end: Date }) => void;
}

const periodLabels: Record<LeadsPeriodType, string> = {
  today: "Hoje",
  "7_days": "Últimos 7 dias",
  month: "Este mês",
  custom: "Personalizado",
  all: "Tudo",
};

export function getLeadsPeriodDateRange(period: LeadsPeriodType): { startDate?: Date; endDate?: Date } {
  const now = new Date();

  switch (period) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case "7_days":
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
      };
    case "month":
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case "custom":
    case "all":
    default:
      return {};
  }
}

export function LeadsPeriodFilter({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
}: LeadsPeriodFilterProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(customRange?.start);
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(customRange?.end);

  const handlePeriodChange = (newPeriod: LeadsPeriodType) => {
    onChange(newPeriod);
    if (newPeriod === "custom") {
      setPopoverOpen(true);
    }
  };

  const handleApplyCustomRange = () => {
    if (tempStartDate && tempEndDate && onCustomRangeChange) {
      onCustomRangeChange({
        start: startOfDay(tempStartDate),
        end: endOfDay(tempEndDate),
      });
    }
    setPopoverOpen(false);
  };

  const getDisplayLabel = () => {
    if (value === "custom" && customRange) {
      return `${format(customRange.start, "dd/MM", { locale: ptBR })} - ${format(customRange.end, "dd/MM", { locale: ptBR })}`;
    }
    return periodLabels[value];
  };

  return (
    <div className="flex items-center gap-2">
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div>
            <Select value={value} onValueChange={(v) => handlePeriodChange(v as LeadsPeriodType)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue>{getDisplayLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(periodLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverTrigger>
        
        {value === "custom" && (
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Data inicial</p>
                  <Calendar
                    mode="single"
                    selected={tempStartDate}
                    onSelect={setTempStartDate}
                    locale={ptBR}
                    className={cn("rounded-md border pointer-events-auto")}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Data final</p>
                  <Calendar
                    mode="single"
                    selected={tempEndDate}
                    onSelect={setTempEndDate}
                    locale={ptBR}
                    disabled={(date) => tempStartDate ? date < tempStartDate : false}
                    className={cn("rounded-md border pointer-events-auto")}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleApplyCustomRange}
                  disabled={!tempStartDate || !tempEndDate}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
