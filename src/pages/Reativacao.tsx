import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReativacaoElegiveis } from "@/components/reativacao/ReativacaoElegiveis";
import { ReativacaoHistorico } from "@/components/reativacao/ReativacaoHistorico";
import { RefreshCw } from "lucide-react";

export default function Reativacao() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Reativação</h1>
      </div>

      <Tabs defaultValue="elegiveis">
        <TabsList>
          <TabsTrigger value="elegiveis">Elegíveis</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="elegiveis" className="mt-4">
          <ReativacaoElegiveis />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <ReativacaoHistorico />
        </TabsContent>
      </Tabs>
    </div>
  );
}
