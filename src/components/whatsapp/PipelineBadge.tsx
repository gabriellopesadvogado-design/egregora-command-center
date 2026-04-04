import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  UserPlus, 
  UserCheck, 
  Calendar, 
  Video, 
  Send, 
  Clock, 
  FileText, 
  Trophy, 
  XCircle,
  HelpCircle
} from "lucide-react";

interface PipelineBadgeProps {
  status: string | null;
  quality?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const PIPELINE_CONFIG: Record<string, { 
  label: string; 
  icon: typeof UserPlus; 
  color: string;
  bgColor: string;
  order: number;
}> = {
  novo_lead: {
    label: "Novo Lead",
    icon: UserPlus,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    order: 1,
  },
  qualificado: {
    label: "Qualificado",
    icon: UserCheck,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
    order: 2,
  },
  reuniao_agendada: {
    label: "Reunião Agendada",
    icon: Calendar,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    order: 3,
  },
  reuniao_realizada: {
    label: "Reunião Realizada",
    icon: Video,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 border-indigo-500/30",
    order: 4,
  },
  proposta_enviada: {
    label: "Proposta Enviada",
    icon: Send,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    order: 5,
  },
  followup_ativo: {
    label: "Follow-up Ativo",
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    order: 6,
  },
  contrato_enviado: {
    label: "Contrato Enviado",
    icon: FileText,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/30",
    order: 7,
  },
  fechado: {
    label: "Fechado",
    icon: Trophy,
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/30",
    order: 8,
  },
  perdido: {
    label: "Perdido",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
    order: 9,
  },
};

const QUALITY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  boa: { label: "Boa", emoji: "🟢", color: "text-green-500" },
  neutra: { label: "Neutra", emoji: "🟡", color: "text-amber-500" },
  ruim: { label: "Ruim", emoji: "🔴", color: "text-red-500" },
};

export function PipelineBadge({ status, quality, showLabel = true, size = "sm" }: PipelineBadgeProps) {
  if (!status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="bg-muted/30 border-muted-foreground/20 text-muted-foreground">
              <HelpCircle className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
              {showLabel && <span className="ml-1 text-xs">Sem fase</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lead não vinculado ao pipeline</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const config = PIPELINE_CONFIG[status];
  if (!config) {
    return (
      <Badge variant="outline" className="bg-muted/30">
        {status}
      </Badge>
    );
  }

  const Icon = config.icon;
  const qualityInfo = quality ? QUALITY_CONFIG[quality] : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={`${config.bgColor} ${config.color} ${size === "sm" ? "text-xs py-0" : "text-sm py-0.5"}`}
          >
            <Icon className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
            {showLabel && <span className="ml-1">{config.label}</span>}
            {qualityInfo && <span className="ml-1">{qualityInfo.emoji}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium">{config.label}</p>
            {qualityInfo && (
              <p className={qualityInfo.color}>Qualidade: {qualityInfo.label}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Mini versão para lista de conversas
export function PipelineDot({ status }: { status: string | null }) {
  if (!status) return null;
  
  const config = PIPELINE_CONFIG[status];
  if (!config) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`w-2 h-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
