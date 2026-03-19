import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import PreVenda from "./pages/PreVenda";
import Vendas from "./pages/Vendas";
import Leads from "./pages/Leads";
import Notificacoes from "./pages/Notificacoes";
import Meetings from "./pages/Meetings";
import Proposals from "./pages/Proposals";
import Targets from "./pages/Targets";
import Users from "./pages/Users";
import Forecast from "./pages/Forecast";
import WbrAi from "./pages/WbrAi";
import Followup from "./pages/Followup";
import FollowupMigracao from "./pages/FollowupMigracao";
import Roi from "./pages/Roi";
import PropostaEnvio from "./pages/PropostaEnvio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pre-venda" element={<PreVenda />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/meetings" element={<Meetings />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/targets" element={<Targets />} />
              <Route path="/users" element={<Users />} />
              <Route path="/forecast" element={<Forecast />} />
              <Route path="/wbr-ai" element={<WbrAi />} />
              <Route path="/followup" element={<Followup />} />
              <Route path="/followup/migracao" element={<FollowupMigracao />} />
              <Route path="/roi" element={<Roi />} />
              <Route path="/propostaenvio" element={<PropostaEnvio />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
