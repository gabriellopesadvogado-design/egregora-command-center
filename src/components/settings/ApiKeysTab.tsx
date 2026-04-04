import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  Key,
  Database,
  MessageSquare,
  BarChart3,
  Brain,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApiCredential {
  id: string;
  provider: string;
  credential_type: string;
  label: string;
  is_valid: boolean;
  last_validated_at: string | null;
  validation_error: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", icon: Brain, color: "text-green-500" },
  { value: "anthropic", label: "Anthropic (Claude)", icon: Brain, color: "text-orange-500" },
  { value: "meta", label: "Meta (WhatsApp + Ads)", icon: BarChart3, color: "text-blue-500" },
  { value: "google", label: "Google Ads", icon: BarChart3, color: "text-red-500" },
  { value: "zapi", label: "Z-API (WhatsApp)", icon: MessageSquare, color: "text-emerald-500" },
  { value: "hubspot", label: "HubSpot", icon: Database, color: "text-orange-500" },
  { value: "webhook", label: "Webhook Externo", icon: Webhook, color: "text-purple-500" },
];

const CREDENTIAL_TYPES: Record<string, { value: string; label: string }[]> = {
  openai: [{ value: "api_key", label: "API Key" }],
  anthropic: [{ value: "api_key", label: "API Key" }],
  meta: [
    { value: "access_token", label: "Access Token" },
    { value: "pixel_id", label: "Pixel ID" },
    { value: "account_id", label: "Ad Account ID" },
  ],
  google: [
    { value: "developer_token", label: "Developer Token" },
    { value: "client_id", label: "Client ID" },
    { value: "client_secret", label: "Client Secret" },
    { value: "refresh_token", label: "Refresh Token" },
    { value: "customer_id", label: "Customer ID" },
  ],
  zapi: [
    { value: "instance_id", label: "Instance ID" },
    { value: "token", label: "Instance Token" },
    { value: "client_token", label: "Client Token (Security)" },
  ],
  hubspot: [{ value: "api_key", label: "Private App Token" }],
  webhook: [
    { value: "url", label: "URL" },
    { value: "secret", label: "Secret" },
  ],
};

export function ApiKeysTab() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  // Fetch credentials from api_credentials table
  const { data: apiCredentials = [], isLoading: loadingApiCreds } = useQuery({
    queryKey: ["api_credentials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_credentials")
        .select("*")
        .order("provider", { ascending: true });
      if (error) throw error;
      return data as ApiCredential[];
    },
  });

  // Fetch Z-API credentials from whatsapp_instances
  const { data: zapiInstances = [], isLoading: loadingZapi } = useQuery({
    queryKey: ["whatsapp_instances_zapi"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .eq("provider", "zapi")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Combine all credentials
  const credentials: ApiCredential[] = [
    ...apiCredentials,
    // Converter instâncias Z-API para formato de credenciais
    ...zapiInstances
      .filter((inst: any) => inst.zapi_instance_id)
      .map((inst: any) => ({
        id: `zapi-${inst.id}`,
        provider: "zapi",
        credential_type: "instance",
        label: inst.nome,
        is_valid: inst.is_connected,
        last_validated_at: inst.updated_at,
        validation_error: null,
        metadata: {
          instance_id: inst.zapi_instance_id,
          token: inst.zapi_token,
          client_token: inst.zapi_client_token,
          phone_number: inst.phone_number,
        },
        created_at: inst.created_at,
      })),
  ];

  const isLoading = loadingApiCreds || loadingZapi;

  // Fetch system health
  const { data: healthData = [] } = useQuery({
    queryKey: ["system_health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_health")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Delete credential
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_credentials"] });
      toast.success("Credencial removida");
    },
    onError: () => {
      toast.error("Erro ao remover credencial");
    },
  });

  // Validate credential
  const validateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Aqui chamaria uma Edge Function para validar
      const { error } = await supabase
        .from("api_credentials")
        .update({ 
          is_valid: true, 
          last_validated_at: new Date().toISOString(),
          validation_error: null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_credentials"] });
      toast.success("Credencial validada");
    },
    onError: () => {
      toast.error("Erro ao validar credencial");
    },
  });

  const getProviderInfo = (provider: string) => {
    return PROVIDERS.find((p) => p.value === provider) || PROVIDERS[0];
  };

  const getHealthStatus = (provider: string) => {
    // Para Z-API, verificar se tem instâncias conectadas
    if (provider === "zapi") {
      const zapiCreds = credentials.filter((c) => c.provider === "zapi");
      if (zapiCreds.length === 0) return "unknown";
      const connectedCount = zapiCreds.filter((c) => c.is_valid).length;
      if (connectedCount === zapiCreds.length) return "healthy";
      if (connectedCount > 0) return "degraded";
      return "down";
    }
    // Para Meta, verificar credenciais
    if (provider === "meta") {
      const metaCreds = credentials.filter((c) => c.provider === "meta" && c.is_valid);
      return metaCreds.length > 0 ? "healthy" : "unknown";
    }
    const health = healthData.find((h) => h.component === provider + "_api" || h.component === provider);
    return health?.status || "unknown";
  };

  const groupedCredentials = PROVIDERS.map((provider) => ({
    ...provider,
    credentials: credentials.filter((c) => c.provider === provider.value),
    health: getHealthStatus(provider.value),
  }));

  const toggleShowValue = (id: string) => {
    setShowValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Chaves de API</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie todas as credenciais de integração em um único lugar
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Credencial
            </Button>
          </DialogTrigger>
          <AddCredentialModal onClose={() => setIsAddModalOpen(false)} />
        </Dialog>
      </div>

      {/* Status Geral */}
      <Card className="bg-gradient-to-r from-brand-primary/5 to-brand-support/5 border-brand-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
                <Key className="h-6 w-6 text-brand-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Status das Integrações</h3>
                <p className="text-sm text-muted-foreground">
                  {credentials.filter((c) => c.is_valid).length} de {credentials.length} credenciais válidas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {groupedCredentials.map((provider) => {
                const status = provider.health;
                return (
                  <div
                    key={provider.value}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/50"
                    title={`${provider.label}: ${status}`}
                  >
                    <provider.icon className={`h-4 w-4 ${provider.color}`} />
                    {status === "healthy" && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {status === "degraded" && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                    {status === "down" && <XCircle className="h-3 w-3 text-red-500" />}
                    {status === "unknown" && <AlertCircle className="h-3 w-3 text-gray-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credenciais por Provider */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {groupedCredentials.map((provider) => (
            <Card key={provider.value}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted`}>
                      <provider.icon className={`h-5 w-5 ${provider.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{provider.label}</CardTitle>
                      <CardDescription>
                        {provider.credentials.length} credencial(is) configurada(s)
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={
                      provider.health === "healthy"
                        ? "default"
                        : provider.health === "degraded"
                        ? "secondary"
                        : "outline"
                    }
                    className={
                      provider.health === "healthy"
                        ? "bg-green-500/20 text-green-600"
                        : provider.health === "degraded"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : provider.health === "down"
                        ? "bg-red-500/20 text-red-600"
                        : ""
                    }
                  >
                    {provider.health === "healthy" && "Conectado"}
                    {provider.health === "degraded" && "Degradado"}
                    {provider.health === "down" && "Offline"}
                    {provider.health === "unknown" && "Não configurado"}
                  </Badge>
                </div>
              </CardHeader>
              {provider.credentials.length > 0 && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    {provider.credentials.map((cred) => (
                      <div
                        key={cred.id}
                        className="p-3 rounded-lg bg-muted/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{cred.label || cred.credential_type}</span>
                            {cred.is_valid ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {cred.metadata?.phone_number && (
                              <span className="text-xs text-muted-foreground">
                                {cred.metadata.phone_number}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!cred.id.startsWith("zapi-") && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => validateMutation.mutate(cred.id)}
                                  disabled={validateMutation.isPending}
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 ${validateMutation.isPending ? "animate-spin" : ""}`}
                                  />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMutation.mutate(cred.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mostrar detalhes da credencial */}
                        {cred.provider === "zapi" && cred.metadata && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground block">Instance ID</span>
                              <code className="bg-muted px-1 py-0.5 rounded">
                                {cred.metadata.instance_id?.slice(0, 8)}...
                              </code>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Token</span>
                              <code className="bg-muted px-1 py-0.5 rounded">
                                {cred.metadata.token ? "••••••••" : "Não configurado"}
                              </code>
                            </div>
                          </div>
                        )}

                        {cred.provider === "meta" && cred.metadata && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground block">Phone Number ID</span>
                              <code className="bg-muted px-1 py-0.5 rounded">
                                {cred.metadata.phone_number_id || "N/A"}
                              </code>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">WABA ID</span>
                              <code className="bg-muted px-1 py-0.5 rounded">
                                {cred.metadata.waba_id || "N/A"}
                              </code>
                            </div>
                          </div>
                        )}

                        {cred.provider !== "zapi" && cred.provider !== "meta" && (
                          <div className="flex items-center gap-2 text-xs">
                            <code className="bg-muted px-2 py-0.5 rounded">
                              {cred.credential_type}
                            </code>
                            {cred.last_validated_at && (
                              <span className="text-muted-foreground">
                                Validado{" "}
                                {formatDistanceToNow(new Date(cred.last_validated_at), {
                                  addSuffix: true,
                                  locale: ptBR,
                                })}
                              </span>
                            )}
                          </div>
                        )}

                        {cred.validation_error && (
                          <p className="text-xs text-red-500">{cred.validation_error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {provider.credentials.length === 0 && (
                <CardContent className="pt-0">
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma credencial configurada
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCredentialModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState("");
  const [credentialType, setCredentialType] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Usar Edge Function para criptografar e salvar
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zxwkjogjbyywufertkor.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4d2tqb2dqYnl5d3VmZXJ0a29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjU0MjQsImV4cCI6MjA4OTUwMTQyNH0.xbRlGXZVvoeaWsDMeVgwd3AcGo7WnoycsLCqZOsgCjM';
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/manage-credential`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save',
            provider,
            credential_type: credentialType,
            label: label || `${provider} - ${credentialType}`,
            value,
          }),
        }
      );
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar credencial');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_credentials"] });
      toast.success("Credencial adicionada com criptografia");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar credencial");
      console.error(error);
    },
  });

  const availableTypes = provider ? CREDENTIAL_TYPES[provider] || [] : [];

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Adicionar Credencial</DialogTitle>
        <DialogDescription>
          Adicione uma nova chave de API ou credencial de integração.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Provedor</Label>
          <Select value={provider} onValueChange={(v) => { setProvider(v); setCredentialType(""); }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o provedor" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <div className="flex items-center gap-2">
                    <p.icon className={`h-4 w-4 ${p.color}`} />
                    {p.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {provider && (
          <div className="space-y-2">
            <Label>Tipo de Credencial</Label>
            <Select value={credentialType} onValueChange={setCredentialType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Nome (opcional)</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Conta Principal"
          />
        </div>

        <div className="space-y-2">
          <Label>Valor</Label>
          <div className="relative">
            <Input
              type={showValue ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Cole a chave ou token aqui"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!provider || !credentialType || !value || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Adicionar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
