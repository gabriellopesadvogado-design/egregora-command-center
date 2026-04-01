import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Users,
  Kanban,
  PhoneCall,
  Rocket,
  ClipboardCheck,
  TrendingUp,
  RefreshCw,
  Calendar,
  FileText,
  FileOutput,
  Target,
  Sparkles,
  DollarSign,
  Bell,
  Settings,
  LogOut,
  MessageSquare,
  BarChart3,
  Database,
} from "lucide-react";

const menuItems = [
  // Comercial
  { 
    section: "Comercial",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home },
      { name: "Leads", href: "/leads", icon: Users },
      { name: "Pipeline", href: "/pipeline", icon: Kanban },
      { name: "Pré-Venda", href: "/pre-venda", icon: PhoneCall },
      { name: "Vendas", href: "/vendas", icon: Rocket },
      { name: "Follow-ups", href: "/followup", icon: ClipboardCheck },
      { name: "Forecast", href: "/forecast", icon: TrendingUp },
      { name: "Reativação", href: "/reativacao", icon: RefreshCw },
    ]
  },
  // Operações
  {
    section: "Operações",
    items: [
      { name: "Reuniões", href: "/meetings", icon: Calendar },
      { name: "Propostas", href: "/proposals", icon: FileText },
      { name: "Envio Propostas", href: "/propostaenvio", icon: FileOutput },
      { name: "Metas", href: "/targets", icon: Target },
    ]
  },
  // Tráfego
  {
    section: "Tráfego Pago",
    items: [
      { name: "Dashboard Ads", href: "/trafego", icon: BarChart3 },
      { name: "ROI por Canal", href: "/roi", icon: DollarSign },
    ]
  },
  // Conversas
  {
    section: "Conversas",
    items: [
      { name: "WhatsApp", href: "/conversas", icon: MessageSquare },
    ]
  },
  // IA & Reports
  {
    section: "IA & Reports",
    items: [
      { name: "Relatórios IA", href: "/wbr-ai", icon: Sparkles },
    ]
  },
  // Sistema
  {
    section: "Sistema",
    items: [
      { name: "Notificações", href: "/notificacoes", icon: Bell },
      { name: "Configurações", href: "/settings", icon: Settings },
      { name: "Usuários", href: "/users", icon: Users },
    ]
  },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  return (
    <aside className="flex flex-col w-64 border-r bg-card h-screen">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            E
          </div>
          <div>
            <h1 className="font-bold text-lg">Egrégora</h1>
            <p className="text-xs text-muted-foreground">Command Center</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-4 space-y-6">
          {menuItems.map((section) => (
            <div key={section.section}>
              <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.section}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator />

      {/* User & Logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            {profile?.nome?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.nome || "Usuário"}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.cargo || "Cargo"}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
