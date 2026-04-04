-- Habilitar extensões necessárias
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Agendar health check a cada 5 minutos
select cron.schedule(
  'health-check-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://zxwkjogjbyywufertkor.supabase.co/functions/v1/health-check',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4d2tqb2dqYnl5d3VmZXJ0a29yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkyNTQyNCwiZXhwIjoyMDg5NTAxNDI0fQ.mTk8KBRK43bnBFSIcsNeRMPbIVWLJIJHx6lNVw-bo5M", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
