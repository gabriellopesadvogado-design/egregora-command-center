import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Users, Target, TrendingUp, BarChart3 } from "lucide-react";
import astraLogo from "@/assets/astra-logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary flex-col justify-between p-12 text-primary-foreground">
        <div>
          <div className="flex items-center gap-3">
            <img 
              src={astraLogo} 
              alt="Astra" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold">Astra</span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight">
              Gerencie suas vendas
              <br />
              de forma inteligente
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Plataforma completa para SDRs e Closers. Agende reuniões, 
              acompanhe propostas e alcance suas metas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
              <Users className="h-8 w-8 text-primary-foreground/80" />
              <h3 className="mt-2 font-semibold">Leads</h3>
              <p className="text-sm text-primary-foreground/70">Gestão completa</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
              <Target className="h-8 w-8 text-primary-foreground/80" />
              <h3 className="mt-2 font-semibold">Metas</h3>
              <p className="text-sm text-primary-foreground/70">Acompanhamento</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
              <BarChart3 className="h-8 w-8 text-primary-foreground/80" />
              <h3 className="mt-2 font-semibold">Reuniões</h3>
              <p className="text-sm text-primary-foreground/70">Agenda integrada</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-primary-foreground/80" />
              <h3 className="mt-2 font-semibold">Propostas</h3>
              <p className="text-sm text-primary-foreground/70">Pipeline visual</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/60">
          © 2026 Astra. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Panel - Forms */}
      <div className="flex w-full items-center justify-center px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img 
              src={astraLogo} 
              alt="Astra" 
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold">Astra</span>
          </div>

          {isLogin ? (
            <LoginForm onSwitchToSignUp={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
