-- Adicionar coluna telefone na tabela meetings (nullable para dados existentes)
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS telefone text;

-- Índice para busca por telefone (chave de integração)
CREATE INDEX IF NOT EXISTS idx_meetings_telefone ON public.meetings (telefone);