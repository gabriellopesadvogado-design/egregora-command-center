import { useState } from "react";
import { Search, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClosers } from "@/hooks/useClosers";
import type { ProposalsFilters } from "@/hooks/useProposals";

interface PipelineFiltersProps {
  filters: ProposalsFilters;
  onFiltersChange: (filters: ProposalsFilters) => void;
}

export function PipelineFilters({ filters, onFiltersChange }: PipelineFiltersProps) {
  const { data: closers = [] } = useClosers();
  const [searchInput, setSearchInput] = useState(filters.searchTerm || "");

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    const timeoutId = setTimeout(() => {
      onFiltersChange({ ...filters, searchTerm: value || undefined });
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const clearFilters = () => {
    setSearchInput("");
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.startDate ||
    filters.endDate ||
    filters.closerId ||
    filters.searchTerm;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar lead..."
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            {filters.startDate && filters.endDate
              ? `${format(filters.startDate, "dd/MM")} - ${format(filters.endDate, "dd/MM")}`
              : "Período"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="range"
            selected={{
              from: filters.startDate,
              to: filters.endDate,
            }}
            onSelect={(range) =>
              onFiltersChange({
                ...filters,
                startDate: range?.from,
                endDate: range?.to,
              })
            }
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Closer Filter */}
      <Select
        value={filters.closerId || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            closerId: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Closer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Closers</SelectItem>
          {closers.map((closer) => (
            <SelectItem key={closer.id} value={closer.id}>
              {closer.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
