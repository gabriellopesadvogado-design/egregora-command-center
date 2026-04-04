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
} from "lucide-react";

const menuItems = [
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
  {
    section: "Operações",
    items: [
      { name: "Reuniões", href: "/meetings", icon: Calendar },
      { name: "Propostas", href: "/proposals", icon: FileText },
      { name: "Envio Propostas", href: "/propostaenvio", icon: FileOutput },
      { name: "Metas", href: "/targets", icon: Target },
    ]
  },
  {
    section: "Tráfego Pago",
    items: [
      { name: "Dashboard Ads", href: "/trafego", icon: BarChart3 },
      { name: "Atribuição", href: "/atribuicao", icon: Target },
      { name: "ROI por Canal", href: "/roi", icon: DollarSign },
    ]
  },
  {
    section: "Conversas",
    items: [
      { name: "WhatsApp", href: "/conversas", icon: MessageSquare },
    ]
  },
  {
    section: "IA & Reports",
    items: [
      { name: "Relatórios IA", href: "/wbr-ai", icon: Sparkles },
    ]
  },
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
    <aside className="flex flex-col w-64 bg-brand-primary text-white h-screen">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white font-bold text-xl">
            E
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Egrégora</h1>
            <p className="text-xs text-brand-support">Command Center</p>
          </div>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="py-4 space-y-6">
          {menuItems.map((section) => (
            <div key={section.section}>
              <h3 className="mb-2 px-3 text-xs font-semibold text-brand-support/70 uppercase tracking-wider">
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
                          ? "bg-brand-accent text-white shadow-lg"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
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

      <Separator className="bg-white/10" />

      {/* User & Logout */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent text-white font-medium">
            {profile?.nome?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.nome || "Usuário"}</p>
            <p className="text-xs text-brand-support/70 truncate">{profile?.cargo || "Cargo"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
