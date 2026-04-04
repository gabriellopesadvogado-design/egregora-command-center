import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Settings, Trash2, RefreshCw, Wifi, WifiOff, Eye, EyeOff } from "lucide-react";

interface WhatsAppInstance {
  id: string;
  nome: string;
  tipo: string;
  provider: 'zapi' | 'meta' | 'evolution';
  is_active: boolean;
  is_connected: boolean;
  phone_number?: string;
  // Z-API fields
  zapi_instance_id?: string;
  zapi_token?: string;
  zapi_client_token?: string;
  // Meta fields (buscadas da tabela api_credentials)
  meta_phone_number_id?: string;
  meta_access_token?: string;
  meta_waba_id?: string;
}

interface MetaCredential {
  id: string;
  credential_type: string;
  value_encrypted: string;
  metadata?: any;
  is_valid: boolean;
}

const tipoLabels: Record<string, string> = {
  recepcao: '📥 Recepção',
  sdr: '📞 SDR',
  closer: '🎯 Closer',
  processos: '📋 Processos',
};

const providerLabels: Record<string, string> = {
  zapi: 'Z-API',
  meta: 'Meta API Oficial',
  evolution: 'Evolution API',
};

function MaskedField({ value, label }: { value: string; label: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-muted-foreground text-xs italic">Não configurado</span>;
  return (
    <div className="flex items-center gap-1">
      <code className="text-xs bg-muted px-1 py-0.5 rounded">
        {show ? value : value.slice(0, 6) + '••••••••' + value.slice(-4)}
      </code>
      <button onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function WhatsAppSettingsTab() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [metaCreds, setMetaCreds] = useState<MetaCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'sdr',
    provider: 'zapi',
    phone_number: '',
    // Z-API
    zapi_instance_id: '',
    zapi_token: '',
    zapi_client_token: '',
    // Meta
    meta_phone_number_id: '',
    meta_access_token: '',
    meta_waba_id: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: instData, error: instError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: true });
      if (instError) throw instError;
      setInstances(instData || []);

      // Buscar credenciais Meta
      const { data: credData } = await supabase
        .from('api_credentials')
        .select('*')
        .eq('provider', 'meta');
      setMetaCreds(credData || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMetaCred = (type: string) =>
    metaCreds.find((c) => c.credential_type === type);

  const handleSaveInstance = async () => {
    if (!formData.nome) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }

    try {
      const instanceData: any = {
        nome: formData.nome,
        tipo: formData.tipo,
        provider: formData.provider,
        api_type: formData.provider === 'meta' ? 'oficial' : 'nao_oficial',
        phone_number: formData.phone_number || null,
        is_active: true,
      };

      if (formData.provider === 'zapi') {
        instanceData.zapi_instance_id = formData.zapi_instance_id || null;
        instanceData.zapi_token = formData.zapi_token || null;
        instanceData.zapi_client_token = formData.zapi_client_token || null;
      }

      if (editingInstance) {
        const { error } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', editingInstance.id);
        if (error) throw error;

        // Se for Meta, atualiza credenciais também
        if (formData.provider === 'meta') {
          await saveMetaCredentials();
        }

        toast({ title: "✅ Instância atualizada!" });
      } else {
        const { error } = await supabase
          .from('whatsapp_instances')
          .insert(instanceData);
        if (error) throw error;

        if (formData.provider === 'meta') {
          await saveMetaCredentials();
        }

        toast({ title: "✅ Instância criada!" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  const saveMetaCredentials = async () => {
    // Salvar/atualizar access_token
    if (formData.meta_access_token) {
      const existing = getMetaCred('access_token');
      if (existing) {
        await supabase.from('api_credentials').update({
          value_encrypted: formData.meta_access_token,
          metadata: {
            phone_number_id: formData.meta_phone_number_id,
            waba_id: formData.meta_waba_id,
          },
          is_valid: true,
        }).eq('id', existing.id);
      } else {
        await supabase.from('api_credentials').insert({
          provider: 'meta',
          credential_type: 'access_token',
          value_encrypted: formData.meta_access_token,
          metadata: {
            phone_number_id: formData.meta_phone_number_id,
            waba_id: formData.meta_waba_id,
          },
          is_valid: true,
        });
      }
    }
  };

  const handleDeleteInstance = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta instância?')) return;
    const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Instância excluída" });
    loadData();
  };

  const openEditDialog = (instance: WhatsAppInstance) => {
    setEditingInstance(instance);
    const metaToken = getMetaCred('access_token');
    setFormData({
      nome: instance.nome,
      tipo: instance.tipo,
      provider: instance.provider || 'zapi',
      phone_number: instance.phone_number || '',
      zapi_instance_id: instance.zapi_instance_id || '',
      zapi_token: instance.zapi_token || '',
      zapi_client_token: instance.zapi_client_token || '',
      meta_phone_number_id: metaToken?.metadata?.phone_number_id || '',
      meta_access_token: metaToken?.value_encrypted || '',
      meta_waba_id: metaToken?.metadata?.waba_id || '',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '', tipo: 'sdr', provider: 'zapi', phone_number: '',
      zapi_instance_id: '', zapi_token: '', zapi_client_token: '',
      meta_phone_number_id: '', meta_access_token: '', meta_waba_id: '',
    });
    setEditingInstance(null);
  };

  const metaToken = getMetaCred('access_token');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Instâncias WhatsApp</CardTitle>
            <CardDescription>Gerencie as instâncias Z-API e Meta API Oficial</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {instances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma instância configurada.
            </p>
          ) : (
            instances.map((instance) => (
              <div key={instance.id} className="border rounded-lg p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${instance.is_connected ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{instance.nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {providerLabels[instance.provider] || instance.provider}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {tipoLabels[instance.tipo] || instance.tipo}
                        </Badge>
                      </div>
                      {instance.phone_number && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {instance.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={instance.is_connected ? 'default' : 'secondary'} className="text-xs">
                      {instance.is_connected ? (
                        <><Wifi className="h-3 w-3 mr-1" />Conectado</>
                      ) : (
                        <><WifiOff className="h-3 w-3 mr-1" />Desconectado</>
                      )}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(instance)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteInstance(instance.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Credenciais Z-API */}
                {instance.provider === 'zapi' && (
                  <div className="bg-muted/40 rounded-md p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Instance ID</span>
                        <MaskedField value={instance.zapi_instance_id || ''} label="Instance ID" />
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Token</span>
                        <MaskedField value={instance.zapi_token || ''} label="Token" />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Client-Token</span>
                      <MaskedField value={instance.zapi_client_token || ''} label="Client-Token" />
                    </div>
                  </div>
                )}

                {/* Credenciais Meta */}
                {instance.provider === 'meta' && (
                  <div className="bg-muted/40 rounded-md p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block mb-0.5">Phone Number ID</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {metaToken?.metadata?.phone_number_id || <span className="italic text-muted-foreground">Não configurado</span>}
                        </code>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-0.5">WABA ID</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {metaToken?.metadata?.waba_id || <span className="italic text-muted-foreground">Não configurado</span>}
                        </code>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-0.5">Access Token</span>
                      <MaskedField value={metaToken?.value_encrypted || ''} label="Access Token" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dialog criar/editar */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstance ? 'Editar Instância' : 'Nova Instância WhatsApp'}</DialogTitle>
            <DialogDescription>Configure a conexão WhatsApp</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: SDR Hugo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Select value={formData.provider} onValueChange={(v) => setFormData({ ...formData, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zapi">Z-API</SelectItem>
                    <SelectItem value="meta">Meta API Oficial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Número de Telefone</Label>
              <Input
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="5561999990000"
              />
            </div>

            {/* Campos Z-API */}
            {formData.provider === 'zapi' && (
              <div className="space-y-3 border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Credenciais Z-API</p>
                <div>
                  <Label>Instance ID</Label>
                  <Input
                    value={formData.zapi_instance_id}
                    onChange={(e) => setFormData({ ...formData, zapi_instance_id: e.target.value })}
                    placeholder="Ex: 3F11BA1406076279538F2295B0810B48"
                  />
                </div>
                <div>
                  <Label>Token</Label>
                  <Input
                    type="password"
                    value={formData.zapi_token}
                    onChange={(e) => setFormData({ ...formData, zapi_token: e.target.value })}
                    placeholder="Token da instância"
                  />
                </div>
                <div>
                  <Label>Client-Token (Security Token da conta)</Label>
                  <Input
                    type="password"
                    value={formData.zapi_client_token}
                    onChange={(e) => setFormData({ ...formData, zapi_client_token: e.target.value })}
                    placeholder="Token de segurança da conta Z-API"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Z-API Dashboard → Security → Account Security Token
                  </p>
                </div>
              </div>
            )}

            {/* Campos Meta */}
            {formData.provider === 'meta' && (
              <div className="space-y-3 border rounded-lg p-3">
                <p className="text-sm font-medium text-muted-foreground">Credenciais Meta API Oficial</p>
                <div>
                  <Label>Phone Number ID</Label>
                  <Input
                    value={formData.meta_phone_number_id}
                    onChange={(e) => setFormData({ ...formData, meta_phone_number_id: e.target.value })}
                    placeholder="Ex: 1076042505590435"
                  />
                </div>
                <div>
                  <Label>WABA ID</Label>
                  <Input
                    value={formData.meta_waba_id}
                    onChange={(e) => setFormData({ ...formData, meta_waba_id: e.target.value })}
                    placeholder="Ex: 96245017950564"
                  />
                </div>
                <div>
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    value={formData.meta_access_token}
                    onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                    placeholder="Token de acesso permanente"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSaveInstance} className="flex-1">
                {editingInstance ? 'Salvar alterações' : 'Criar instância'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
