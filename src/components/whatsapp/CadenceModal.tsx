import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, Square, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

interface CadenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  instanceId: string;
}

export function CadenceModal({ open, onOpenChange, conversationId, instanceId }: CadenceModalProps) {
  const queryClient = useQueryClient();

  // Buscar tipo da instância (sdr ou closer)
  const { data: instance } = useQuery({
    queryKey: ["instance", instanceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("id, nome, tipo")
        .eq("id", instanceId)
        .single();
      return data;
    },
    enabled: !!instanceId,
  });

  const instanceType = instance?.tipo || "sdr"; // sdr ou closer

  // Buscar cadências disponíveis para esse tipo de instância
  const { data: cadences = [], isLoading: loadingCadences } = useQuery({
    queryKey: ["automations", instanceType],
    queryFn: async () => {
      const { data } = await supabase
        .from("automations")
        .select("*")
        .eq("trigger_type", instanceType)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!instanceType,
  });

  // Buscar cadências ativas nessa conversa
  const { data: activeLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["automation_logs_conversation", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_logs")
        .select("*")
        .eq("status", "running")
        .contains("trigger_data", { conversation_id: conversationId });
      return data || [];
    },
    enabled: !!conversationId,
  });

  const activeAutomationIds = new Set(activeLogs.map((l: any) => l.automation_id));

  // Ativar cadência
  const activateMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const { data, error } = await supabase
        .from("automation_logs")
        .insert({
          automation_id: automationId,
          trigger_data: {
            conversation_id: conversationId,
            instance_id: instanceId,
            activated_at: new Date().toISOString(),
          },
          status: "running",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, automationId) => {
      const cadence = cadences.find((c: any) => c.id === automationId);
      toast.success(`${cadence?.name} ativada nessa conversa`);
      queryClient.invalidateQueries({ queryKey: ["automation_logs_conversation", conversationId] });
    },
    onError: () => {
      toast.error("Erro ao ativar cadência");
    },
  });

  // Desativar cadência
  const deactivateMutation = useMutation({
    mutationFn: async (automationId: string) => {
      const log = activeLogs.find((l: any) => l.automation_id === automationId);
      if (!log) return;
      const { error } = await supabase
        .from("automation_logs")
        .update({
          status: "cancelled",
          finished_at: new Date().toISOString(),
        })
        .eq("id", log.id);
      if (error) throw error;
    },
    onSuccess: (_, automationId) => {
      const cadence = cadences.find((c: any) => c.id === automationId);
      toast.success(`${cadence?.name} desativada`);
      queryClient.invalidateQueries({ queryKey: ["automation_logs_conversation", conversationId] });
    },
    onError: () => {
      toast.error("Erro ao desativar cadência");
    },
  });

  const isLoading = loadingCadences || loadingLogs;
  const isPending = activateMutation.isPending || deactivateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Cadências Automáticas
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cadences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma cadência configurada para este tipo de instância.</p>
            <p className="text-xs mt-1 opacity-70">Cadências serão adicionadas aqui quando criadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Instância: <span className="font-medium">{instance?.nome}</span> ·{" "}
              {instanceType === "sdr" ? "SDR" : "Closer"}
            </p>

            {cadences.map((cadence: any) => {
              const isActive = activeAutomationIds.has(cadence.id);
              return (
                <div
                  key={cadence.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-green-500" : "text-muted-foreground"}`} />
                      <span className="font-medium text-sm truncate">{cadence.name}</span>
                      {isActive && (
                        <Badge variant="default" className="bg-green-500 text-white text-xs px-1.5 py-0">
                          Ativa
                        </Badge>
                      )}
                    </div>
                    {cadence.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-6">{cadence.description}</p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={isActive ? "destructive" : "default"}
                    disabled={isPending}
                    className="ml-3 flex-shrink-0"
                    onClick={() =>
                      isActive
                        ? deactivateMutation.mutate(cadence.id)
                        : activateMutation.mutate(cadence.id)
                    }
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : isActive ? (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        Parar
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
