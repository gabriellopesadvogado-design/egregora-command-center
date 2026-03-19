-- Motivos de perda com regras de reativação
CREATE TABLE public.crm_motivos_perda (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  motivo text NOT NULL UNIQUE,
  reativavel boolean NOT NULL DEFAULT true,
  dias_minimos_reativacao integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_motivos_perda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read motivos" ON public.crm_motivos_perda FOR SELECT TO authenticated USING (true);

-- Seed dos 11 motivos
INSERT INTO public.crm_motivos_perda (motivo, reativavel, dias_minimos_reativacao) VALUES
  ('Não possui orçamento', true, 60),
  ('Não respondeu proposta', true, 30),
  ('Não assinou contrato', true, 30),
  ('Fechou com corrente', true, 90),
  ('Não consegui contato', true, 30),
  ('Não tem requisitos mínimos', false, 0),
  ('Não quis continuar com o processo', true, 60),
  ('Desqualificado (busca visto para outro país)', false, 0),
  ('Brasileiro', false, 0),
  ('Tem pedido de refúgio', false, 0),
  ('Outro', true, 90);

-- Reativações
CREATE TABLE public.crm_reativacoes (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  motivo_perda_original text NOT NULL,
  data_perda timestamptz NOT NULL,
  data_reativacao timestamptz DEFAULT now(),
  faixa_reativacao text NOT NULL,
  responsavel_reativacao_id uuid NOT NULL,
  notas_reativacao text,
  resultado text NOT NULL DEFAULT 'em_andamento',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_reativacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read reativacoes" ON public.crm_reativacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert reativacoes" ON public.crm_reativacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update reativacoes" ON public.crm_reativacoes
  FOR UPDATE TO authenticated USING (is_admin_or_gestor(auth.uid()) OR responsavel_reativacao_id = auth.uid());