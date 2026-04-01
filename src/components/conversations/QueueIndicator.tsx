import { Badge } from "@/components/ui/badge";
import { Bot, User, Clock } from "lucide-react";

interface QueueIndicatorProps {
  status: "nina" | "human" | "paused";
  assignedTo?: string;
}

export function QueueIndicator({ status, assignedTo }: QueueIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "nina":
        return {
          icon: Bot,
          label: "IA",
          className: "bg-blue-500/20 text-blue-600 border-blue-300",
        };
      case "human":
        return {
          icon: User,
          label: assignedTo || "Humano",
          className: "bg-green-500/20 text-green-600 border-green-300",
        };
      case "paused":
        return {
          icon: Clock,
          label: "Pausado",
          className: "bg-yellow-500/20 text-yellow-600 border-yellow-300",
        };
      default:
        return {
          icon: Bot,
          label: "IA",
          className: "bg-blue-500/20 text-blue-600 border-blue-300",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export default QueueIndicator;
