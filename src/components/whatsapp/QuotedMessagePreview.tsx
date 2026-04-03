import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QuotedMessagePreviewProps {
  messageId: string;
}

export const QuotedMessagePreview = ({ messageId }: QuotedMessagePreviewProps) => {
  const { data: quotedMessage } = useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      // Tenta buscar primeiro por whatsapp_message_id, depois por id
      let { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('whatsapp_message_id', messageId)
        .maybeSingle();

      if (!data) {
        const result = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('id', messageId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;
      return data;
    },
  });

  if (!quotedMessage) return null;

  // Compatibilidade: suporta tanto is_from_me quanto message_from
  const isFromMe = (quotedMessage as any).is_from_me ?? (quotedMessage as any).message_from === 'human';

  return (
    <div
      className={cn(
        'border-l-4 pl-2 py-1 mb-2 text-xs opacity-80',
        isFromMe
          ? 'border-primary-foreground/50'
          : 'border-primary/50'
      )}
    >
      <p className="font-semibold">
        {isFromMe ? 'Você' : 'Contato'}
      </p>
      <p className="line-clamp-2">{quotedMessage.content}</p>
    </div>
  );
};
