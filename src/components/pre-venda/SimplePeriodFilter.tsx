import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodType = "today" | "this_week" | "this_month" | "last_month" | "all";

interface SimplePeriodFilterProps {
  value: PeriodType;
  onChange: (period: PeriodType) => void;
}

export function getDateRangeForPeriod(period: PeriodType): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  
  switch (period) {
    case "today":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
      };
    case "this_week":
      return {
        startDate: startOfWeek(now, { locale: ptBR }),
        endDate: endOfWeek(now, { locale: ptBR }),
      };
    case "this_month":
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      };
    case "last_month":
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    case "all":
    default:
      return {};
  }
}

export function SimplePeriodFilter({ value, onChange }: SimplePeriodFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodType)}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="today">Hoje</SelectItem>
        <SelectItem value="this_week">Esta semana</SelectItem>
        <SelectItem value="this_month">Este mês</SelectItem>
        <SelectItem value="last_month">Mês passado</SelectItem>
        <SelectItem value="all">Tudo</SelectItem>
      </SelectContent>
    </Select>
  );
}
