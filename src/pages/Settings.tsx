import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Key, 
  MessageSquare, 
  BarChart3, 
  Bell,
  Users,
  Database,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useMetaConnection } from "@/hooks/useMetaConnection";
import { useGoogleAdsConnection } from "@/hooks/useGoogleAdsConnection";
import { toast } from "sonner";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("integrações");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie integrações, APIs e preferências do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integrações" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="trafego" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tráfego
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            IA & Automação
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        {/* Integrações */}
        <TabsContent value="integrações" className="space-y-4 mt-4">
          <IntegrationsTab />
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <WhatsAppTab />
        </TabsContent>

        {/* Tráfego */}
        <TabsContent value="trafego" className="space-y-4 mt-4">
          <TrafegoTab />
        </TabsContent>

        {/* IA & Automação */}
        <TabsContent value="ia" className="space-y-4 mt-4">
          <IATab />
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="space-y-4 mt-4">
          <NotificacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Supabase */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Supabase
            </CardTitle>
            <Badge className="bg-green-500/20 text-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          </div>
          <CardDescription>
            Banco de dados central do Command Center
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Projeto: <code className="bg-muted px-1 rounded">egregora-command-center</code>
          </p>
        </CardContent>
      </Card>

      {/* HubSpot */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              HubSpot
            </CardTitle>
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          </div>
          <CardDescription>
            Sincronização de leads e audiências
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="hubspot-token">Private App Token</Label>
            <Input id="hubspot-token" type="password" placeholder="pat-xxx-xxx" />
          </div>
          <Button size="sm">Conectar HubSpot</Button>
        </CardContent>
      </Card>

      {/* Evolution API */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Evolution API
            </CardTitle>
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          </div>
          <CardDescription>
            WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="evolution-url">URL da API</Label>
            <Input id="evolution-url" placeholder="https://evolution.seudominio.com" />
          </div>
          <div>
            <Label htmlFor="evolution-key">API Key</Label>
            <Input id="evolution-key" type="password" placeholder="Sua API Key" />
          </div>
          <Button size="sm">Conectar Evolution</Button>
        </CardContent>
      </Card>

      {/* OpenAI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              OpenAI
            </CardTitle>
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          </div>
          <CardDescription>
            GPT para qualificação e relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="openai-key">API Key</Label>
            <Input id="openai-key" type="password" placeholder="sk-xxx" />
          </div>
          <Button size="sm">Salvar</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Instâncias WhatsApp</CardTitle>
          <CardDescription>
            Configure múltiplas instâncias para recepção, SDR e closers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instância Recepção */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">📥 Recepção (API Oficial)</h4>
              <p className="text-sm text-muted-foreground">Entrada de leads e qualificação via IA</p>
            </div>
            <Badge variant="secondary">Não configurado</Badge>
          </div>

          {/* Instância SDR */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">📞 SDR (API Não Oficial)</h4>
              <p className="text-sm text-muted-foreground">Agendamento de reuniões</p>
            </div>
            <Badge variant="secondary">Não configurado</Badge>
          </div>

          {/* Instância Closer */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h4 className="font-medium">🎯 Closer (API Não Oficial)</h4>
              <p className="text-sm text-muted-foreground">Negociação e fechamento</p>
            </div>
            <Badge variant="secondary">Não configurado</Badge>
          </div>

          <Button className="w-full">
            + Adicionar Instância
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agente IA (Nina)</CardTitle>
          <CardDescription>
            Configure o comportamento do agente de qualificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nina-prompt">Prompt do Sistema</Label>
            <textarea
              id="nina-prompt"
              className="w-full h-32 p-3 border rounded-lg text-sm"
              placeholder="Você é Nina, assistente de qualificação da Egrégora Migration..."
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Qualificação Automática</Label>
              <p className="text-sm text-muted-foreground">IA triageia leads automaticamente</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Transferência Automática</Label>
              <p className="text-sm text-muted-foreground">Transfere para humano após qualificar</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrafegoTab() {
  const { isConnecting, connectedAccount, startOAuth, disconnect } = useMetaConnection();

  return (
    <div className="space-y-4">
      {/* Meta Ads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📘 Meta Ads
              </CardTitle>
              <CardDescription>
                Conecte para métricas em tempo real de Facebook e Instagram Ads
              </CardDescription>
            </div>
            {connectedAccount ? (
              <Badge className="bg-green-500/20 text-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                {connectedAccount.account_name}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Não conectado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectedAccount ? (
            <div className="space-y-3">
              <p className="text-sm">
                Conta: <strong>{connectedAccount.account_name}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                ID: {connectedAccount.account_id}
              </p>
              <Button variant="destructive" size="sm" onClick={disconnect}>
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button onClick={startOAuth} disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                Conectar via OAuth
              </Button>
              <Separator />
              <p className="text-sm text-muted-foreground">Ou conecte manualmente:</p>
              <div>
                <Label htmlFor="meta-token">Access Token</Label>
                <Input id="meta-token" type="password" placeholder="Token de acesso" />
              </div>
              <div>
                <Label htmlFor="meta-account">Account ID</Label>
                <Input id="meta-account" placeholder="act_123456789" />
              </div>
              <Button variant="outline" size="sm">Conectar com Token</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Ads */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🔍 Google Ads
              </CardTitle>
              <CardDescription>
                Conecte para métricas de campanhas Google
              </CardDescription>
            </div>
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Não conectado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="google-developer">Developer Token</Label>
            <Input id="google-developer" type="password" placeholder="Developer token" />
          </div>
          <div>
            <Label htmlFor="google-client-id">Client ID</Label>
            <Input id="google-client-id" placeholder="Client ID OAuth" />
          </div>
          <div>
            <Label htmlFor="google-client-secret">Client Secret</Label>
            <Input id="google-client-secret" type="password" placeholder="Client Secret" />
          </div>
          <div>
            <Label htmlFor="google-refresh">Refresh Token</Label>
            <Input id="google-refresh" type="password" placeholder="Refresh token" />
          </div>
          <div>
            <Label htmlFor="google-customer">Customer ID</Label>
            <Input id="google-customer" placeholder="123-456-7890" />
          </div>
          <Button size="sm">Conectar Google Ads</Button>
        </CardContent>
      </Card>

      {/* Conversions API */}
      <Card>
        <CardHeader>
          <CardTitle>Conversions API</CardTitle>
          <CardDescription>
            Disparar eventos de conversão quando deals são fechados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enviar para Meta</Label>
              <p className="text-sm text-muted-foreground">Dispara evento Purchase no Meta</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Enviar para Google</Label>
              <p className="text-sm text-muted-foreground">Dispara evento Conversion no Google</p>
            </div>
            <Switch />
          </div>
          <div>
            <Label htmlFor="pixel-id">Meta Pixel ID</Label>
            <Input id="pixel-id" placeholder="123456789" />
          </div>
          <div>
            <Label htmlFor="conversion-token">Conversions API Token</Label>
            <Input id="conversion-token" type="password" placeholder="Token de acesso" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IATab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Qualificação Automática</CardTitle>
          <CardDescription>
            Regras para triagem automática de leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar qualificação por IA</Label>
              <p className="text-sm text-muted-foreground">Leads são avaliados automaticamente</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div>
            <Label>Critérios de qualificação</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="crit-nacionalidade" defaultChecked />
                <label htmlFor="crit-nacionalidade" className="text-sm">Nacionalidade válida</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="crit-residencia" defaultChecked />
                <label htmlFor="crit-residencia" className="text-sm">Residência fora do Brasil</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="crit-documentos" />
                <label htmlFor="crit-documentos" className="text-sm">Documentação básica OK</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up Automático</CardTitle>
          <CardDescription>
            Cadência de mensagens e ligações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar cadência automática</Label>
              <p className="text-sm text-muted-foreground">Sistema agenda follow-ups automaticamente</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Envio automático de mensagens</Label>
              <p className="text-sm text-muted-foreground">Mensagens de WhatsApp são enviadas automaticamente</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WBR AI Reports</CardTitle>
          <CardDescription>
            Relatórios semanais gerados por IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Gerar automaticamente</Label>
              <p className="text-sm text-muted-foreground">Toda segunda-feira às 8h</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Modo Premium (GPT-4)</Label>
              <p className="text-sm text-muted-foreground">Análise mais profunda</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificacoesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notificações do Sistema</CardTitle>
          <CardDescription>
            Configure como você quer ser notificado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Novo lead qualificado</Label>
              <p className="text-sm text-muted-foreground">Quando IA qualifica um lead</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Reunião em 5 minutos</Label>
              <p className="text-sm text-muted-foreground">Lembrete antes de reunião</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Follow-up atrasado</Label>
              <p className="text-sm text-muted-foreground">Quando um follow-up não é feito</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Deal fechado</Label>
              <p className="text-sm text-muted-foreground">Notificação de venda</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Alerta de tráfego</Label>
              <p className="text-sm text-muted-foreground">CPL alto ou campanha pausada</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
