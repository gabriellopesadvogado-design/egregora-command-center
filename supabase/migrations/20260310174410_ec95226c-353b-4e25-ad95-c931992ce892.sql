
CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM 'perdida' THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
    WHERE meeting_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_close_followups_on_loss
AFTER UPDATE OF status ON meetings
FOR EACH ROW
WHEN (NEW.status = 'perdida' AND OLD.status IS DISTINCT FROM 'perdida')
EXECUTE FUNCTION close_followups_on_loss();
