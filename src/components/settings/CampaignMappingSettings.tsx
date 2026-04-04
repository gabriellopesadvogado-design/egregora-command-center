import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, Link2 } from "lucide-react";

interface CampaignMap {
  id: string;
  meta_campaign_id: string;
  meta_campaign_name: string;
  internal_campaign: string;
  created_at: string;
}

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
}

export function CampaignMappingSettings() {
  const queryClient = useQueryClient();
  const [newMapping, setNewMapping] = useState({ meta_id: "", meta_name: "", internal: "" });

  // Buscar mapeamentos existentes
  const { data: mappings, isLoading } = useQuery({
    queryKey: ["campaign-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meta_campaign_map")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignMap[];
    },
  });

  // Buscar campanhas do Meta
  const { data: metaCampaigns, isLoading: loadingMeta, refetch: refetchMeta } = useQuery({
    queryKey: ["meta-campaigns"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://zxwkjogjbyywufertkor.supabase.co"}/functions/v1/meta-api`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.session?.access_token || ""}`,
          },
          body: JSON.stringify({ 
            endpoint: "{ad_account_id}/campaigns",
            params: { fields: "id,name,status", limit: 50 }
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data.data as MetaCampaign[];
    },
    enabled: false, // Manual trigger
  });

  // Adicionar mapeamento
  const addMutation = useMutation({
    mutationFn: async (mapping: typeof newMapping) => {
      const { error } = await supabase.from("meta_campaign_map").insert({
        meta_campaign_id: mapping.meta_id,
        meta_campaign_name: mapping.meta_name,
        internal_campaign: mapping.internal,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-mappings"] });
      setNewMapping({ meta_id: "", meta_name: "", internal: "" });
      toast.success("Mapeamento adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Remover mapeamento
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meta_campaign_map").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-mappings"] });
      toast.success("Mapeamento removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAddFromMeta = (camp: MetaCampaign) => {
    setNewMapping({
      meta_id: camp.id,
      meta_name: camp.name,
      internal: camp.name.replace(/[\[\]]/g, "").replace(/\s+/g, "_").slice(0, 30),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Mapeamento de Campanhas Meta → Internas
        </CardTitle>
        <CardDescription>
          Vincule as campanhas do Meta Ads aos nomes internos usados no CRM para calcular custos por qualidade de lead.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Adicionar novo */}
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="ID da campanha Meta"
            value={newMapping.meta_id}
            onChange={(e) => setNewMapping({ ...newMapping, meta_id: e.target.value })}
            className="w-48"
          />
          <Input
            placeholder="Nome no Meta"
            value={newMapping.meta_name}
            onChange={(e) => setNewMapping({ ...newMapping, meta_name: e.target.value })}
            className="w-64"
          />
          <Input
            placeholder="Nome interno (usado no CRM)"
            value={newMapping.internal}
            onChange={(e) => setNewMapping({ ...newMapping, internal: e.target.value })}
            className="w-48"
          />
          <Button
            onClick={() => addMutation.mutate(newMapping)}
            disabled={!newMapping.meta_id || !newMapping.internal || addMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Buscar do Meta */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchMeta()} disabled={loadingMeta}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loadingMeta ? "animate-spin" : ""}`} />
            Buscar campanhas do Meta
          </Button>
          {metaCampaigns && (
            <span className="text-xs text-muted-foreground">{metaCampaigns.length} campanhas encontradas</span>
          )}
        </div>

        {metaCampaigns && metaCampaigns.length > 0 && (
          <div className="border rounded-lg p-3 bg-muted/30 max-h-48 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Clique em uma campanha para preencher o formulário:</p>
            <div className="flex flex-wrap gap-2">
              {metaCampaigns.map((c) => (
                <Badge
                  key={c.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleAddFromMeta(c)}
                >
                  {c.name.slice(0, 40)} {c.status === "ACTIVE" && "✅"}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Lista de mapeamentos */}
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : mappings && mappings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha Meta</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Nome Interno</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium max-w-[200px] truncate" title={m.meta_campaign_name}>
                    {m.meta_campaign_name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.meta_campaign_id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.internal_campaign}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMutation.mutate(m.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum mapeamento configurado.</p>
            <p className="text-xs mt-1">Adicione mapeamentos para calcular custos por qualidade de lead.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
