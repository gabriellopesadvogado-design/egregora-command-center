
CREATE TYPE public.followup_canal AS ENUM ('ligacao', 'whatsapp');
CREATE TYPE public.followup_status AS ENUM ('pendente', 'feito', 'ignorado');

CREATE TABLE public.followup_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  closer_id uuid NOT NULL REFERENCES public.profiles(id),
  canal followup_canal NOT NULL DEFAULT 'whatsapp',
  data_prevista date NOT NULL,
  status followup_status NOT NULL DEFAULT 'pendente',
  notas text,
  executado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.followup_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Closers can view own followups" ON public.followup_steps
  FOR SELECT TO authenticated
  USING (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Closers can insert own followups" ON public.followup_steps
  FOR INSERT TO authenticated
  WITH CHECK (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Closers can update own followups" ON public.followup_steps
  FOR UPDATE TO authenticated
  USING (closer_id = auth.uid() OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/Manager can delete followups" ON public.followup_steps
  FOR DELETE TO authenticated
  USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Block anonymous followup_steps" ON public.followup_steps
  FOR ALL TO anon USING (false);
