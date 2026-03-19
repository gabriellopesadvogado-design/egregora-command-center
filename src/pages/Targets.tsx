import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { WeeklyTargetForm } from "@/components/targets/WeeklyTargetForm";
import { MonthlyTargetForm } from "@/components/targets/MonthlyTargetForm";
import { YearlyTargetForm } from "@/components/targets/YearlyTargetForm";
import { WeeklyTargetsTable } from "@/components/targets/WeeklyTargetsTable";
import { MonthlyTargetsTable } from "@/components/targets/MonthlyTargetsTable";

export default function Targets() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Verificar se usuario e admin ou manager
  if (role !== "admin" && role !== "gestor") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Metas</h1>
        <p className="text-muted-foreground">
          Defina as metas semanais, mensais e anuais da equipe
        </p>
      </div>

      {/* Forms em grid de 3 colunas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <WeeklyTargetForm />
        <MonthlyTargetForm />
        <YearlyTargetForm />
      </div>

      {/* Historicos */}
      <WeeklyTargetsTable />
      <MonthlyTargetsTable />
    </div>
  );
}
