import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForecastOverviewTab } from "@/components/forecast/ForecastOverviewTab";
import { ReliabilityTab } from "@/components/forecast/ReliabilityTab";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Lock } from "lucide-react";

export default function Forecast() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("visao-geral");

  // SDR doesn't have access to this module
  if (role === "sdr") {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground text-center max-w-md">
              O módulo de Forecast está disponível apenas para Closers, Managers e
              Admins.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Forecast</h1>
          <p className="text-sm text-muted-foreground">
            Previsão de fechamento do pipeline
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
          <TabsTrigger value="confiabilidade">Confiabilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <ForecastOverviewTab />
        </TabsContent>

        <TabsContent value="confiabilidade" className="mt-6">
          <ReliabilityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
