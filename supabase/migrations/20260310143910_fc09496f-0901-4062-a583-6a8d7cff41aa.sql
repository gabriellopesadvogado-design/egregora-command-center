
ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS codigo text;

ALTER TABLE public.followup_steps
  ADD CONSTRAINT followup_steps_meeting_codigo_unique UNIQUE (meeting_id, codigo);
