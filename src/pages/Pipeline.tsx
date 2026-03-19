import { useState } from "react";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PipelineFilters } from "@/components/pipeline/PipelineFilters";
import { useProposals, type ProposalsFilters } from "@/hooks/useProposals";
import { Skeleton } from "@/components/ui/skeleton";

export default function Pipeline() {
  const [filters, setFilters] = useState<ProposalsFilters>({});

  const { data: proposals = [], isLoading } = useProposals(filters);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">Gestão visual de propostas</p>
      </div>

      <PipelineFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[400px]" />
          ))}
        </div>
      ) : (
        <PipelineBoard proposals={proposals} />
      )}
    </div>
  );
}
