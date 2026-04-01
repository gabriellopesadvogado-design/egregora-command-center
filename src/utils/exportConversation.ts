import { supabase } from '@/integrations/supabase/client';

export async function exportConversation(conversationId: string, format: 'txt' | 'json' = 'txt') {
  const { data: messages, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });

  if (error) throw error;

  if (format === 'json') {
    return JSON.stringify(messages, null, 2);
  }

  return messages
    ?.map(m => `[${new Date(m.sent_at).toLocaleString()}] ${m.message_from}: ${m.content}`)
    .join('\n') || '';
}

export function downloadConversation(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
