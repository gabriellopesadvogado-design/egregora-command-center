-- Criar tabela para metas anuais
CREATE TABLE public.yearly_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL UNIQUE,
  meta_faturamento NUMERIC NOT NULL,
  criado_por UUID NOT NULL REFERENCES public.profiles(id),
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.yearly_targets ENABLE ROW LEVEL SECURITY;

-- Policy para Admin/Manager gerenciar metas anuais
CREATE POLICY "Admin/Manager can manage yearly targets"
  ON public.yearly_targets
  FOR ALL
  USING (is_admin_or_manager(auth.uid()));

-- Policy para todos visualizarem metas anuais
CREATE POLICY "Everyone can view yearly targets"
  ON public.yearly_targets
  FOR SELECT
  USING (true);