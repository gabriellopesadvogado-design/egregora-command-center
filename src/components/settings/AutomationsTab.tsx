import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play,
  Pause,
  Plus,
  Settings,
  Zap,
  GitBranch,
  Clock,
  Webhook,
  MessageSquare,
  Users,
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, any>;
  is_active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  run_count: number;
  error_count: number;
  created_at: string;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  trigger_data: Record<string, any>;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

const TRIGGER_ICONS: Record<string, any> = {
  webhook: Webhook,
  schedule: Clock,
  event: Zap,
  manual: Play,
};

const TRIGGER_LABELS: Record<string, string> = {
  webhook: "Webhook",
  schedule: "Agendado",
  event: "Evento",
  manual: "Manual",
};

// Automações pré-definidas para a Egrégora
const DEFAULT_AUTOMATIONS = [
  {
    id: "auto-1",
    name: "Qualificação de Lead",
    description: "Quando um novo lead chega pelo WhatsApp, Nina faz a qualificação inicial",
    trigger_type: "event",
    trigger_config: { event: "lead.created", source: "whatsapp" },
    nodes: [
      { type: "trigger", label: "Novo Lead WhatsApp", icon: MessageSquare },
      { type: "agent", label: "Nina Qualifica", icon: Bot },
      { type: "condition", label: "Lead Quente?", icon: GitBranch },
      { type: "action", label: "Transfere SDR", icon: Users },
    ],
  },
  {
    id: "auto-2",
    name: "Follow-up Automático",
    description: "Envia lembretes de follow-up para leads não respondidos",
    trigger_type: "schedule",
    trigger_config: { cron: "0 9,14 * * 1-5" },
    nodes: [
      { type: "trigger", label: "9h e 14h", icon: Clock },
      { type: "condition", label: "Sem resposta 24h?", icon: GitBranch },
      { type: "action", label: "Envia Lembrete", icon: MessageSquare },
    ],
  },
  {
    id: "auto-3",
    name: "Alerta de Tráfego",
    description: "Atlas analisa campanhas e alerta sobre anomalias",
    trigger_type: "schedule",
    trigger_config: { cron: "0 8,18 * * *" },
    nodes: [
      { type: "trigger", label: "8h e 18h", icon: Clock },
      { type: "agent", label: "Atlas Analisa", icon: Bot },
      { type: "condition", label: "Anomalia?", icon: GitBranch },
      { type: "action", label: "Notifica Gabriel", icon: Zap },
    ],
  },
  {
    id: "auto-4",
    name: "Conversão API",
    description: "Quando deal é fechado, dispara evento de conversão para Meta e Google",
    trigger_type: "event",
    trigger_config: { event: "deal.closed" },
    nodes: [
      { type: "trigger", label: "Deal Fechado", icon: CheckCircle },
      { type: "action", label: "Meta CAPI", icon: Zap },
      { type: "action", label: "Google Conv.", icon: Zap },
    ],
  },
];

export function AutomationsTab() {
  const queryClient = useQueryClient();
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);

  // Fetch automations
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Automation[];
    },
  });

  // Fetch logs for selected automation
  const { data: logs = [] } = useQuery({
    queryKey: ["automation_logs", selectedAutomation],
    queryFn: async () => {
      if (!selectedAutomation) return [];
      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .eq("automation_id", selectedAutomation)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AutomationLog[];
    },
    enabled: !!selectedAutomation,
  });

  // Toggle automation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("automations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast.success("Automação atualizada");
    },
  });

  // Combinar automações do banco com as default (para visualização)
  const displayAutomations = DEFAULT_AUTOMATIONS.map((defaultAuto) => {
    const dbAuto = automations.find((a) => a.name === defaultAuto.name);
    return {
      ...defaultAuto,
      is_active: dbAuto?.is_active ?? false,
      last_run_at: dbAuto?.last_run_at,
      last_run_status: dbAuto?.last_run_status,
      run_count: dbAuto?.run_count ?? 0,
      error_count: dbAuto?.error_count ?? 0,
      db_id: dbAuto?.id,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Automações</h2>
          <p className="text-sm text-muted-foreground">
            Fluxos automatizados que rodam no Claude Code
          </p>
        </div>
        <Button variant="outline" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Nova Automação (Em breve)
        </Button>
      </div>

      {/* Visual Canvas Preview */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-brand-primary/5 to-brand-accent/5 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-primary" />
            <CardTitle className="text-lg">Fluxos Ativos</CardTitle>
          </div>
          <CardDescription>
            Visualização simplificada das automações. Execução real via Claude Code.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {displayAutomations.map((auto) => (
              <div
                key={auto.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  auto.is_active
                    ? "border-brand-primary/30 bg-brand-primary/5"
                    : "border-dashed border-muted-foreground/30 bg-muted/30"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {auto.name}
                      {auto.is_active ? (
                        <Badge className="bg-green-500/20 text-green-600">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{auto.description}</p>
                  </div>
                  <Switch
                    checked={auto.is_active}
                    onCheckedChange={(checked) => {
                      if (auto.db_id) {
                        toggleMutation.mutate({ id: auto.db_id, is_active: checked });
                      } else {
                        toast.info("Configure esta automação primeiro");
                      }
                    }}
                  />
                </div>

                {/* Visual Flow */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {auto.nodes.map((node, idx) => {
                    const Icon = node.icon;
                    const bgColor =
                      node.type === "trigger"
                        ? "bg-blue-500/20 border-blue-500/50"
                        : node.type === "agent"
                        ? "bg-purple-500/20 border-purple-500/50"
                        : node.type === "condition"
                        ? "bg-yellow-500/20 border-yellow-500/50"
                        : "bg-green-500/20 border-green-500/50";

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className={`flex flex-col items-center p-2 rounded-lg border ${bgColor} min-w-[80px]`}
                        >
                          <Icon className="h-5 w-5 mb-1" />
                          <span className="text-xs text-center whitespace-nowrap">
                            {node.label}
                          </span>
                        </div>
                        {idx < auto.nodes.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Stats */}
                <Separator className="my-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {auto.run_count} execuções
                    </span>
                    {auto.error_count > 0 && (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-3 w-3" />
                        {auto.error_count} erros
                      </span>
                    )}
                  </div>
                  {auto.last_run_at && (
                    <span>
                      Última execução:{" "}
                      {formatDistanceToNow(new Date(auto.last_run_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-brand-support/10 border-brand-support/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/10">
              <Bot className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <h4 className="font-medium">Execução via Claude Code</h4>
              <p className="text-sm text-muted-foreground mt-1">
                As automações são executadas por mim (Hera) no ambiente Claude Code. 
                A interface aqui é para visualização e configuração. 
                Quando ativadas, eu monitoro os triggers e executo as ações automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execuções Recentes</CardTitle>
          <CardDescription>Histórico das últimas automações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma execução registrada ainda</p>
              <p className="text-sm">Ative uma automação para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {log.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : log.status === "error" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {automations.find((a) => a.id === log.automation_id)?.name || "Automação"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.started_at), "dd/MM HH:mm", { locale: ptBR })}
                          {log.duration_ms && ` • ${log.duration_ms}ms`}
                        </p>
                      </div>
                    </div>
                    {log.error_message && (
                      <Badge variant="destructive" className="text-xs">
                        {log.error_message.slice(0, 30)}...
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
