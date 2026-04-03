import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Settings, Trash2, RefreshCw, Check, X } from "lucide-react";

interface WhatsAppInstance {
  id: string;
  nome: string;
  tipo: 'recepcao' | 'sdr' | 'closer' | 'processos';
  provider: 'evolution' | 'zapi';
  status: 'connected' | 'disconnected' | 'connecting';
  phone_number?: string;
  // Evolution fields
  evolution_instance_name?: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
  // Z-API fields
  zapi_instance_id?: string;
  zapi_token?: string;
}

const instanceTypeLabels = {
  recepcao: { label: '📥 Recepção', description: 'Entrada de leads e qualificação via IA' },
  sdr: { label: '📞 SDR', description: 'Agendamento de reuniões' },
  closer: { label: '🎯 Closer', description: 'Negociação e fechamento' },
  processos: { label: '📋 Processos', description: 'Atendimento pós-venda' },
};

const statusColors = {
  connected: 'bg-green-500',
  disconnected: 'bg-red-500',
  connecting: 'bg-yellow-500',
};

export function WhatsAppSettingsTab() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'sdr' as const,
    provider: 'zapi' as const,
    // Z-API
    zapi_instance_id: '',
    zapi_token: '',
    // Evolution
    evolution_instance_name: '',
    evolution_api_url: '',
    evolution_api_key: '',
  });

  const loadInstances = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Error loading instances:', error);
      toast({
        title: "Erro ao carregar instâncias",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveInstance = async () => {
    try {
      const instanceData: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        provider: formData.provider,
        api_type: formData.provider === 'zapi' ? 'nao_oficial' : 'nao_oficial',
      };

      if (formData.provider === 'zapi') {
        instanceData.zapi_instance_id = formData.zapi_instance_id;
        instanceData.zapi_token = formData.zapi_token;
      } else {
        instanceData.evolution_instance_name = formData.evolution_instance_name;
        instanceData.evolution_api_url = formData.evolution_api_url;
        instanceData.evolution_api_key = formData.evolution_api_key;
      }

      if (editingInstance) {
        const { error } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', editingInstance.id);
        if (error) throw error;
        toast({ title: "Instância atualizada!" });
      } else {
        const { error } = await supabase
          .from('whatsapp_instances')
          .insert(instanceData);
        if (error) throw error;
        toast({ title: "Instância criada!" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadInstances();
    } catch (error: any) {
      console.error('Error saving instance:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;
    
    try {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: "Instância excluída!" });
      loadInstances();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'sdr',
      provider: 'zapi',
      zapi_instance_id: '',
      zapi_token: '',
      evolution_instance_name: '',
      evolution_api_url: '',
      evolution_api_key: '',
    });
    setEditingInstance(null);
  };

  const openEditDialog = (instance: WhatsAppInstance) => {
    setEditingInstance(instance);
    setFormData({
      nome: instance.nome,
      tipo: instance.tipo,
      provider: instance.provider || 'zapi',
      zapi_instance_id: instance.zapi_instance_id || '',
      zapi_token: instance.zapi_token || '',
      evolution_instance_name: instance.evolution_instance_name || '',
      evolution_api_url: instance.evolution_api_url || '',
      evolution_api_key: instance.evolution_api_key || '',
    });
    setIsDialogOpen(true);
  };

  // Load instances on mount
  useState(() => {
    loadInstances();
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Instâncias WhatsApp</CardTitle>
            <CardDescription>
              Configure múltiplas instâncias usando Z-API ou Evolution API
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {instances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma instância configurada. Clique em "Nova Instância" para começar.
            </p>
          ) : (
            instances.map((instance) => (
              <div 
                key={instance.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${statusColors[instance.status || 'disconnected']}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {instanceTypeLabels[instance.tipo]?.label} - {instance.nome}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {instance.provider === 'zapi' ? 'Z-API' : 'Evolution'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {instance.phone_number || 'Número não configurado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'}>
                    {instance.status === 'connected' ? 'Conectado' : 
                     instance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(instance)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteInstance(instance.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar instância */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? 'Editar Instância' : 'Nova Instância WhatsApp'}
            </DialogTitle>
            <DialogDescription>
              Configure a conexão com Z-API ou Evolution API
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome da Instância</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: WhatsApp Comercial"
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select 
                value={formData.tipo} 
                onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recepcao">📥 Recepção</SelectItem>
                  <SelectItem value="sdr">📞 SDR</SelectItem>
                  <SelectItem value="closer">🎯 Closer</SelectItem>
                  <SelectItem value="processos">📋 Processos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Provider</Label>
              <Select 
                value={formData.provider} 
                onValueChange={(v: any) => setFormData({ ...formData, provider: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapi">Z-API (Recomendado)</SelectItem>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.provider === 'zapi' ? (
              <>
                <div>
                  <Label>Instance ID (Z-API)</Label>
                  <Input
                    value={formData.zapi_instance_id}
                    onChange={(e) => setFormData({ ...formData, zapi_instance_id: e.target.value })}
                    placeholder="Seu Instance ID da Z-API"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre em: Z-API Dashboard → Instância → ID
                  </p>
                </div>
                <div>
                  <Label>Token (Z-API)</Label>
                  <Input
                    type="password"
                    value={formData.zapi_token}
                    onChange={(e) => setFormData({ ...formData, zapi_token: e.target.value })}
                    placeholder="Seu Token da Z-API"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre em: Z-API Dashboard → Instância → Token
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Nome da Instância (Evolution)</Label>
                  <Input
                    value={formData.evolution_instance_name}
                    onChange={(e) => setFormData({ ...formData, evolution_instance_name: e.target.value })}
                    placeholder="nome-da-instancia"
                  />
                </div>
                <div>
                  <Label>URL da API</Label>
                  <Input
                    value={formData.evolution_api_url}
                    onChange={(e) => setFormData({ ...formData, evolution_api_url: e.target.value })}
                    placeholder="https://sua-evolution.com"
                  />
                </div>
                <div>
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={formData.evolution_api_key}
                    onChange={(e) => setFormData({ ...formData, evolution_api_key: e.target.value })}
                    placeholder="Sua API Key"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveInstance} className="flex-1">
                {editingInstance ? 'Salvar' : 'Criar Instância'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instruções Z-API */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Como configurar Z-API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Acesse <a href="https://z-api.io" target="_blank" rel="noopener" className="text-primary underline">z-api.io</a> e crie uma conta</li>
            <li>Crie uma nova instância no dashboard</li>
            <li>Copie o <strong>Instance ID</strong> e o <strong>Token</strong></li>
            <li>Cole aqui e conecte o WhatsApp escaneando o QR Code no dashboard da Z-API</li>
            <li>Configure o webhook no dashboard da Z-API:
              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                {`${window.location.origin}/functions/v1/zapi-webhook?instance_id=SEU_INSTANCE_ID`}
              </code>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
