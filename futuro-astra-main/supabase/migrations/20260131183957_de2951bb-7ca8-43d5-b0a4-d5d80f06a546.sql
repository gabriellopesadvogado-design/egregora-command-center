-- Adiciona campo para nome do lead inline (sem precisar tabela leads)
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS nome_lead TEXT;

-- Torna lead_id opcional para reuniões simples
ALTER TABLE public.meetings 
ALTER COLUMN lead_id DROP NOT NULL;