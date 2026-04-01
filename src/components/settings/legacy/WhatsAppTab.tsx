import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export function WhatsAppTab() {
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
          <CardTitle>Configurações de Instância</CardTitle>
          <CardDescription>
            Configure a conexão com Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione uma instância acima para configurar a conexão com o Evolution API.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
