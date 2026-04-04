import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Key, 
  Bot, 
  Zap, 
  Activity,
  MessageSquare, 
  BarChart3, 
  Bell,
} from "lucide-react";

// New modular tabs
import { ApiKeysTab } from "@/components/settings/ApiKeysTab";
import { AgentsTab } from "@/components/settings/AgentsTab";
import { AutomationsTab } from "@/components/settings/AutomationsTab";
import { MonitoringTab } from "@/components/settings/MonitoringTab";

// Updated WhatsApp tab
import { WhatsAppSettingsTab } from "@/components/settings/WhatsAppSettingsTab";

// Legacy tabs (keeping for now)
import { TrafegoTab } from "@/components/settings/legacy/TrafegoTab";
import { NotificacoesTab } from "@/components/settings/legacy/NotificacoesTab";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("api-keys");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie integrações, agentes de IA e automações
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 h-auto">
          <TabsTrigger value="api-keys" className="flex flex-col items-center gap-1 py-2">
            <Key className="h-4 w-4" />
            <span className="text-xs">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex flex-col items-center gap-1 py-2">
            <Bot className="h-4 w-4" />
            <span className="text-xs">Agentes</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="flex flex-col items-center gap-1 py-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs">Automações</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex flex-col items-center gap-1 py-2">
            <Activity className="h-4 w-4" />
            <span className="text-xs">Hera</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex flex-col items-center gap-1 py-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="trafego" className="flex flex-col items-center gap-1 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Tráfego</span>
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex flex-col items-center gap-1 py-2">
            <Bell className="h-4 w-4" />
            <span className="text-xs">Alertas</span>
          </TabsTrigger>
        </TabsList>

        {/* New Tabs */}
        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentsTab />
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <AutomationsTab />
        </TabsContent>

        <TabsContent value="monitoring" className="mt-6">
          <MonitoringTab />
        </TabsContent>

        {/* WhatsApp Tab - Updated */}
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppSettingsTab />
        </TabsContent>

        <TabsContent value="trafego" className="mt-6">
          <TrafegoTab />
        </TabsContent>

        <TabsContent value="notificacoes" className="mt-6">
          <NotificacoesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
