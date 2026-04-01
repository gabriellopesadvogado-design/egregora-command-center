import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function NotificacoesTab() {
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

      <Card>
        <CardHeader>
          <CardTitle>Canais de Notificação</CardTitle>
          <CardDescription>
            Onde você quer receber as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Telegram</Label>
              <p className="text-sm text-muted-foreground">Notificações via Telegram</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">Resumo diário por email</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Browser Push</Label>
              <p className="text-sm text-muted-foreground">Notificações no navegador</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
