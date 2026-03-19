CREATE OR REPLACE FUNCTION public.close_followups_on_loss()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('perdida', 'ganha') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE followup_steps
    SET status = 'ignorado',
        notas = CASE
          WHEN NEW.status = 'ganha' THEN 'Deal ganho em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
          ELSE 'Deal marcado como perdida em ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') || '. Follow-ups encerrados automaticamente.'
        END
    WHERE meeting_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$;