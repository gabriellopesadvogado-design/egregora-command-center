export const CONVERSATION_TOPICS = [
  'naturalização',
  'residência',
  'documentação',
  'dúvidas',
  'preços',
  'prazos',
  'outros',
] as const;

export type ConversationTopic = typeof CONVERSATION_TOPICS[number];

export const TOPIC_COLORS: Record<string, string> = {
  naturalização: 'bg-blue-100 text-blue-800 border-blue-200',
  residência: 'bg-green-100 text-green-800 border-green-200',
  documentação: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  dúvidas: 'bg-purple-100 text-purple-800 border-purple-200',
  preços: 'bg-orange-100 text-orange-800 border-orange-200',
  prazos: 'bg-red-100 text-red-800 border-red-200',
  outros: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const TOPIC_LABELS: Record<string, string> = {
  naturalização: 'Naturalização',
  residência: 'Autorização de Residência',
  documentação: 'Documentação',
  dúvidas: 'Dúvidas Gerais',
  preços: 'Preços e Pagamento',
  prazos: 'Prazos',
  outros: 'Outros',
};

export const ALL_TOPICS = CONVERSATION_TOPICS;
