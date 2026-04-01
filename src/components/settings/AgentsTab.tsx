import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Bot,
  Settings,
  MessageSquare,
  BarChart3,
  Activity,
  Zap,
  Clock,
  Save,
  Loader2,
  ChevronRight,
  Play,
  Pause,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AiAgent {
  id: string;
  slug: string;
  name: string;
  avatar_url: string | null;
  description: string;
  role: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  few_shot_examples: any[];
  is_active: boolean;
  auto_respond: boolean;
  working_hours: {
    start: string;
    end: string;
    timezone: string;
  };
  total_conversations: number;
  total_messages: number;
  avg_response_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

const AGENT_ICONS: Record<string, any> = {
  nina: "👩‍💼",
  aria: "👩‍🏫",
  max: "👨‍💼",
  atlas: "📊",
  hera: "🌟",
};

const ROLE_LABELS: Record<string, string> = {
  qualification: "Qualificação",
  sdr_support: "Suporte SDR",
  closer_support: "Suporte Closer",
  traffic: "Tráfego Pago",
  supervisor: "Supervisão",
};

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Recomendado)" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Econômico)" },
  { value: "claude-3-opus", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
];

export function AgentsTab() {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch agents
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["ai_agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agents")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as AiAgent[];
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ai_agents")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_agents"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const openEditModal = (agent: AiAgent) => {
    setSelectedAgent(agent);
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Agentes de IA</h2>
        <p className="text-sm text-muted-foreground">
          Configure os agentes que automatizam qualificação, suporte e análise
        </p>
      </div>

      {/* Grid de Agentes */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !agent.is_active ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 text-2xl">
                      {AGENT_ICONS[agent.slug] || "🤖"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[agent.role] || agent.role}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: agent.id, is_active: checked })
                    }
                  />
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {agent.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-3" />
                
                {/* Métricas */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-brand-primary">
                      {agent.total_conversations}
                    </p>
                    <p className="text-xs text-muted-foreground">Conversas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-brand-primary">
                      {agent.total_messages}
                    </p>
                    <p className="text-xs text-muted-foreground">Mensagens</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-brand-primary">
                      {agent.avg_response_time_ms
                        ? `${(agent.avg_response_time_ms / 1000).toFixed(1)}s`
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Tempo Resp.</p>
                  </div>
                </div>

                {/* Config Summary */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {agent.model}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Temp: {agent.temperature}
                  </span>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => openEditModal(agent)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {selectedAgent && (
        <AgentEditModal
          agent={selectedAgent}
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
}

function AgentEditModal({
  agent,
  open,
  onClose,
}: {
  agent: AiAgent;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description,
    model: agent.model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
    system_prompt: agent.system_prompt,
    auto_respond: agent.auto_respond,
    working_hours: agent.working_hours,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ai_agents")
        .update(formData)
        .eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai_agents"] });
      toast.success("Agente atualizado");
      onClose();
    },
    onError: () => {
      toast.error("Erro ao atualizar agente");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{AGENT_ICONS[agent.slug] || "🤖"}</span>
            Configurar {agent.name}
          </DialogTitle>
          <DialogDescription>
            Ajuste o comportamento, prompts e modelo do agente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
            <TabsTrigger value="advanced">Avançado</TabsTrigger>
          </TabsList>

          {/* Tab Geral */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select
                  value={formData.model}
                  onValueChange={(v) => setFormData({ ...formData, model: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Resposta Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Agente responde automaticamente ou só sugere
                  </p>
                </div>
                <Switch
                  checked={formData.auto_respond}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, auto_respond: checked })
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Horário Início</Label>
                  <Input
                    type="time"
                    value={formData.working_hours.start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        working_hours: { ...formData.working_hours, start: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário Fim</Label>
                  <Input
                    type="time"
                    value={formData.working_hours.end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        working_hours: { ...formData.working_hours, end: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Prompt */}
          <TabsContent value="prompt" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Prompt do Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Define a personalidade e comportamento do agente
              </p>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
          </TabsContent>

          {/* Tab Avançado */}
          <TabsContent value="advanced" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Temperatura: {formData.temperature}</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.temperature < 0.3
                      ? "Mais focado"
                      : formData.temperature > 0.7
                      ? "Mais criativo"
                      : "Balanceado"}
                  </span>
                </div>
                <Slider
                  value={[formData.temperature]}
                  onValueChange={([v]) => setFormData({ ...formData, temperature: v })}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Tokens: {formData.max_tokens}</Label>
                <Slider
                  value={[formData.max_tokens]}
                  onValueChange={([v]) => setFormData({ ...formData, max_tokens: v })}
                  min={500}
                  max={4000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Limita o tamanho máximo da resposta
                </p>
              </div>
            </div>

            {/* Métricas do Agente */}
            <Separator />
            <div>
              <h4 className="font-medium mb-3">Estatísticas</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-brand-primary">
                    {agent.total_conversations}
                  </p>
                  <p className="text-sm text-muted-foreground">Total de conversas</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-brand-primary">
                    {agent.total_messages}
                  </p>
                  <p className="text-sm text-muted-foreground">Mensagens enviadas</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
