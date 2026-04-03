-- Migration: Adicionar campo para Client-Token da conta Z-API
-- O Client-Token é diferente do Instance Token!
-- - Instance Token: vai na URL (já temos em zapi_token)
-- - Client-Token: vai no header (novo campo zapi_client_token)

ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS zapi_client_token TEXT;

COMMENT ON COLUMN public.whatsapp_instances.zapi_client_token IS 'Token de segurança da CONTA Z-API (vai no header Client-Token)';

-- Renomear zapi_token para zapi_instance_token para clareza (opcional)
-- ALTER TABLE public.whatsapp_instances RENAME COLUMN zapi_token TO zapi_instance_token;
