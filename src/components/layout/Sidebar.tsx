import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Users,
  Calendar,
  FileText,
  Target,
  Bell,
  LogOut,
  Home,
  Settings,
  Rocket,
  PhoneCall,
  TrendingUp,
  Sparkles,
  ClipboardCheck,
  DollarSign,
  FileOutput,
  Kanban,
  RefreshCw,
} from "lucide-react";
import astraLogo from "@/assets/astra-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, roles: ["admin", "gestor", "sdr", "closer"] },
  { name: "Pré-Venda", href: "/pre-venda", icon: PhoneCall, roles: ["admin", "gestor", "sdr", "closer"] },
  { name: "Vendas", href: "/vendas", icon: Rocket, roles: ["admin", "gestor", "closer"] },
  { name: "Follow-ups", href: "/followup", icon: ClipboardCheck, roles: ["admin", "gestor", "closer"] },
  { name: "Forecast", href: "/forecast", icon: TrendingUp, roles: ["admin", "gestor", "closer"] },
  { name: "Leads", href: "/leads", icon: Users, roles: ["admin", "gestor", "sdr"] },
  { name: "Pipeline", href: "/pipeline", icon: Kanban, roles: ["admin", "gestor", "sdr", "closer"] },
  { name: "Reuniões", href: "/meetings", icon: Calendar, roles: ["admin", "gestor", "sdr", "closer"] },
  { name: "Propostas", href: "/proposals", icon: FileText, roles: ["admin", "gestor", "closer"] },
  { name: "Envio de Propostas", href: "/propostaenvio", icon: FileOutput, roles: ["admin", "gestor", "closer"] },
  { name: "Metas", href: "/targets", icon: Target, roles: ["admin", "gestor"] },
  { name: "Relatórios IA", href: "/wbr-ai", icon: Sparkles, roles: ["admin", "gestor"] },
  { name: "ROI por Canal", href: "/roi", icon: DollarSign, roles: ["admin", "gestor"] },
  { name: "Notificações", href: "/notificacoes", icon: Bell, roles: ["admin", "gestor", "sdr", "closer"] },
];

import { Database } from "lucide-react";

const adminNavigation = [
  { name: "Usuários", href: "/users", icon: Settings, roles: ["admin", "gestor"] },
  { name: "Migração Follow-up", href: "/followup/migracao", icon: Database, roles: ["admin"] },
];

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();

  const filteredNav = navigation.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  const filteredAdminNav = adminNavigation.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-destructive text-destructive-foreground",
      manager: "bg-warning text-warning-foreground",
      sdr: "bg-info text-info-foreground",
      closer: "bg-success text-success-foreground",
    };
    return colors[role as keyof typeof colors] || "bg-muted";
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <img 
          src={astraLogo} 
          alt="Astra" 
          className="h-9 w-9 rounded-lg object-contain"
        />
        <span className="text-lg font-bold">Astra</span>
      </div>

      {/* Profile */}
      <div className="mx-4 mb-4 rounded-lg bg-sidebar-accent p-3">
        <p className="font-medium truncate">{profile?.nome || "Carregando..."}</p>
        <Badge className={cn("mt-1 text-xs", getRoleBadge(role || ""))}>
          {role?.toUpperCase()}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {filteredAdminNav.length > 0 && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="px-3 text-xs font-semibold uppercase text-sidebar-foreground/50">
              Administração
            </p>
            {filteredAdminNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          Sair
        </Button>
      </div>
    </div>
  );
}
