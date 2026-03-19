
-- Add perda_tipo column to meetings
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS perda_tipo text;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_perda_tipo_check 
  CHECK (perda_tipo IS NULL OR perda_tipo IN ('simples', 'definitiva'));
CREATE INDEX IF NOT EXISTS idx_meetings_status_perda_tipo ON public.meetings (status, perda_tipo);

-- Update trigger to handle perda_tipo logic
CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'ganha' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = 'Deal ganho em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
    WHERE meeting_id = NEW.id AND status = 'pendente';
  ELSIF NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.perda_tipo = 'simples' THEN
      UPDATE followup_steps
      SET status = 'ignorado',
          notas = 'Perdido simples — encerrada cadência inicial; manter mensal.'
      WHERE meeting_id = NEW.id AND status = 'pendente'
        AND (codigo IS NULL OR codigo NOT LIKE 'MEN%');
    ELSE
      UPDATE followup_steps
      SET status = 'ignorado',
          notas = 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
      WHERE meeting_id = NEW.id AND status = 'pendente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_close_followups_on_loss ON public.meetings;
CREATE TRIGGER trg_close_followups_on_loss
  AFTER UPDATE OF status ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.close_followups_on_loss();
