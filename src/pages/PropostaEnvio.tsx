import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileOutput, Search, Plus } from "lucide-react";
import { useProposals, type Proposal } from "@/hooks/useProposals";
import { ProposalModal } from "@/components/proposals/ProposalModal";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho: { label: "Rascunho", variant: "outline" },
  enviada: { label: "Enviada", variant: "secondary" },
  aceita: { label: "Aceita", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
};

export default function PropostaEnvio() {
  const [search, setSearch] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: proposals = [], isLoading } = useProposals({ searchTerm: search });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Envio de Propostas</h1>
          <p className="text-muted-foreground text-sm">Gere, visualize e salve propostas em PDF</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do lead..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setSelectedProposal(null); setIsModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Carregando propostas...
                </TableCell>
              </TableRow>
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma proposta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              proposals.map((proposal) => {
                const lead = proposal.leads;
                const status = statusLabels[proposal.status ?? "rascunho"] || statusLabels.rascunho;
                return (
                  <TableRow key={proposal.id}>
                    <TableCell className="font-medium">{lead?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead?.email || lead?.telefone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(proposal.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedProposal(proposal)}
                      >
                        <FileOutput className="h-4 w-4 mr-1" />
                        Gerar PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal */}
      {(selectedProposal || isModalOpen) && (
        <ProposalModal
          open={!!selectedProposal || isModalOpen}
          onOpenChange={(open) => { if (!open) { setSelectedProposal(null); setIsModalOpen(false); } }}
          proposal={selectedProposal ?? undefined}
        />
      )}
    </div>
  );
}
