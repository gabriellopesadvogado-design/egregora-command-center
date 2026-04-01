import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AtSign, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InternalMention } from "@/hooks/whatsapp/useMentions";

interface InternalMentionBubbleProps {
  mention: InternalMention;
}

export const InternalMentionBubble = ({ mention }: InternalMentionBubbleProps) => {
  const time = format(new Date(mention.created_at), "HH:mm", { locale: ptBR });

  const mentionedByName = mention.mentioned_by_profile?.full_name || "Agente";
  const mentionedUserName = mention.mentioned_user_profile?.full_name || "Agente";

  return (
    <div className="flex justify-center my-2">
      <div className="max-w-[85%] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <Avatar className="h-6 w-6">
              <AvatarImage src={mention.mentioned_by_profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-amber-200 dark:bg-amber-800">
                {mentionedByName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                {mentionedByName}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400">mencionou</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-xs font-medium text-amber-800 dark:text-amber-200">
                <AtSign className="h-3 w-3" />
                {mentionedUserName}
              </span>
            </div>
            
            <p className="text-sm text-amber-900 dark:text-amber-100 mt-1 whitespace-pre-wrap break-words">
              {mention.content}
            </p>
            
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <EyeOff className="h-3 w-3" />
                <span className="text-[10px]">Visível apenas para agentes</span>
              </div>
              <span className="text-[10px] text-amber-500 dark:text-amber-500">{time}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
