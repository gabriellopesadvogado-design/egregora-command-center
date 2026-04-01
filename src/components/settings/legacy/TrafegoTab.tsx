import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useMetaConnection } from "@/hooks/useMetaConnection";

export function TrafegoTab() {
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
