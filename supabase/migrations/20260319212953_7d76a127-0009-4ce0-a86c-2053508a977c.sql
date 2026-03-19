CREATE TABLE public.crm_notas (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  meeting_id uuid NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conteudo text NOT NULL,
  tipo text NOT NULL DEFAULT 'nota',
  sincronizado_hubspot boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.crm_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read notes" ON public.crm_notas
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert notes" ON public.crm_notas
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());