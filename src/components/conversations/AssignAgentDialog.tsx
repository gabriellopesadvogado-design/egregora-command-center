import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus } from "lucide-react";

interface AssignAgentDialogProps {
  conversationId: string;
  onAssign: (userId: string) => void;
}

export function AssignAgentDialog({ conversationId, onAssign }: AssignAgentDialogProps) {
  // TODO: Buscar usuários disponíveis
  const agents = [
    { id: "1", name: "Victor Lira", cargo: "Closer" },
    { id: "2", name: "Hugo", cargo: "SDR" },
    { id: "3", name: "Júnior", cargo: "SDR" },
    { id: "4", name: "Larissa", cargo: "Closer" },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Atribuir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => onAssign(agent.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{agent.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-sm text-muted-foreground">{agent.cargo}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssignAgentDialog;
