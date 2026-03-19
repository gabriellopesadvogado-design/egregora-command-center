
ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'padrao';
ALTER TABLE public.followup_steps ADD COLUMN IF NOT EXISTS manual_titulo text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'followup_steps_tipo_check') THEN
    ALTER TABLE public.followup_steps ADD CONSTRAINT followup_steps_tipo_check CHECK (tipo IN ('padrao', 'manual'));
  END IF;
END $$;

-- Drop old unique constraint/index on (meeting_id, codigo) and recreate as partial
ALTER TABLE public.followup_steps DROP CONSTRAINT IF EXISTS followup_steps_meeting_id_codigo_key;
DROP INDEX IF EXISTS followup_steps_meeting_id_codigo_key;

-- Create partial unique index only for tipo='padrao'
CREATE UNIQUE INDEX IF NOT EXISTS followup_steps_meeting_id_codigo_padrao_key 
  ON public.followup_steps (meeting_id, codigo) WHERE tipo = 'padrao';
