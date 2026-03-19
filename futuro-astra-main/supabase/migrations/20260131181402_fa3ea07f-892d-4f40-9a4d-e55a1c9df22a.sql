-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_lida ON public.notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notifications_meeting_tipo ON public.notifications(meeting_id, tipo);
CREATE INDEX IF NOT EXISTS idx_proposals_fechado_em ON public.proposals(fechado_em);
CREATE INDEX IF NOT EXISTS idx_meetings_inicio_em_status ON public.meetings(inicio_em, status);