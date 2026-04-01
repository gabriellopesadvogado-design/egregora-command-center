import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  status: string | null;
}

interface MentionSuggestionsProps {
  agents: Agent[];
  searchTerm: string;
  selectedIndex: number;
  onSelect: (agent: Agent) => void;
}

export const MentionSuggestions = ({ 
  agents, 
  searchTerm, 
  selectedIndex,
  onSelect 
}: MentionSuggestionsProps) => {
  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filteredAgents.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
      <div className="p-2 text-xs text-muted-foreground border-b border-border">
        Mencionar agente
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredAgents.map((agent, index) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={cn(
              "w-full flex items-center gap-3 p-2 text-left transition-colors",
              "hover:bg-accent",
              index === selectedIndex && "bg-accent"
            )}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarImage src={agent.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {agent.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span 
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-popover",
                  agent.status === 'online' ? 'bg-green-500' : 
                  agent.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{agent.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {agent.status === 'online' ? 'Online' : 
                 agent.status === 'away' ? 'Ausente' : 'Offline'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
