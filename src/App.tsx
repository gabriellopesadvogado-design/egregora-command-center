import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Layout
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import PreVenda from "./pages/PreVenda";
import Vendas from "./pages/Vendas";
import Followup from "./pages/Followup";
import Forecast from "./pages/Forecast";
import Reativacao from "./pages/Reativacao";
import Meetings from "./pages/Meetings";
import Proposals from "./pages/Proposals";
import PropostaEnvio from "./pages/PropostaEnvio";
import Targets from "./pages/Targets";
import WbrAi from "./pages/WbrAi";
import Roi from "./pages/Roi";
import Trafego from "./pages/Trafego";
import Conversas from "./pages/Conversas";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Notificacoes from "./pages/Notificacoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Comercial */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="pre-venda" element={<PreVenda />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="followup" element={<Followup />} />
            <Route path="forecast" element={<Forecast />} />
            <Route path="reativacao" element={<Reativacao />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="proposals" element={<Proposals />} />
            <Route path="propostaenvio" element={<PropostaEnvio />} />
            <Route path="targets" element={<Targets />} />
            
            {/* Tráfego */}
            <Route path="trafego" element={<Trafego />} />
            <Route path="roi" element={<Roi />} />
            
            {/* Conversas */}
            <Route path="conversas" element={<Conversas />} />
            
            {/* IA & Reports */}
            <Route path="wbr-ai" element={<WbrAi />} />
            
            {/* Configurações */}
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
            <Route path="notificacoes" element={<Notificacoes />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
