import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KanbanFiltersState {
  searchTerm?: string;
  responsavelId?: string;
}

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  onFiltersChange: (f: KanbanFiltersState) => void;
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  const { role } = useAuth();
  const [searchInput, setSearchInput] = useState(filters.searchTerm || "");

  const { data: users = [] } = useQuery({
    queryKey: ["core-users-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("core_users")
        .select("id, nome, cargo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ ...filters, searchTerm: searchInput || undefined });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por lead..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {(role === "admin" || role === "gestor") && (
        <Select
          value={filters.responsavelId || "all"}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, responsavelId: v === "all" ? undefined : v })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
