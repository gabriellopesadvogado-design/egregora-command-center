-- Função para match automático WhatsApp → Lead por telefone
CREATE OR REPLACE FUNCTION match_whatsapp_to_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Busca lead pelo telefone (normalizado: apenas dígitos)
  IF NEW.lead_id IS NULL AND NEW.phone_number IS NOT NULL THEN
    SELECT id INTO NEW.lead_id
    FROM crm_leads
    WHERE regexp_replace(telefone, '[^0-9]', '', 'g') = regexp_replace(NEW.phone_number, '[^0-9]', '', 'g')
       OR regexp_replace(whatsapp, '[^0-9]', '', 'g') = regexp_replace(NEW.phone_number, '[^0-9]', '', 'g')
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para novos contatos e atualizações
DROP TRIGGER IF EXISTS trg_match_whatsapp_lead ON whatsapp_contacts;
CREATE TRIGGER trg_match_whatsapp_lead
  BEFORE INSERT OR UPDATE ON whatsapp_contacts
  FOR EACH ROW
  EXECUTE FUNCTION match_whatsapp_to_lead();

-- View para visualização completa do pipeline
CREATE OR REPLACE VIEW whatsapp_contact_pipeline AS
SELECT 
  wc.id as contact_id,
  wc.name as contact_name,
  wc.phone_number,
  wc.lead_id,
  cl.nome as lead_name,
  cl.email as lead_email,
  cl.campanha,
  cl.utm_source,
  cm.id as meeting_id,
  cm.status as pipeline_status,
  cm.avaliacao_reuniao as lead_quality,
  cm.closer_id,
  cm.sdr_id,
  cm.valor_proposta,
  cm.valor_fechamento,
  cm.data_reuniao,
  cm.data_proposta,
  CASE cm.status
    WHEN 'novo_lead' THEN 1
    WHEN 'qualificado' THEN 2
    WHEN 'reuniao_agendada' THEN 3
    WHEN 'reuniao_realizada' THEN 4
    WHEN 'proposta_enviada' THEN 5
    WHEN 'followup_ativo' THEN 6
    WHEN 'contrato_enviado' THEN 7
    WHEN 'fechado' THEN 8
    WHEN 'perdido' THEN 9
    ELSE 0
  END as pipeline_order,
  wc.created_at as contact_created_at,
  wc.last_activity
FROM whatsapp_contacts wc
LEFT JOIN crm_leads cl ON wc.lead_id = cl.id
LEFT JOIN crm_meetings cm ON cm.lead_id = cl.id;

-- Função para atualizar leads existentes
CREATE OR REPLACE FUNCTION sync_existing_whatsapp_contacts()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  UPDATE whatsapp_contacts wc
  SET lead_id = (
    SELECT cl.id
    FROM crm_leads cl
    WHERE regexp_replace(cl.telefone, '[^0-9]', '', 'g') = regexp_replace(wc.phone_number, '[^0-9]', '', 'g')
       OR regexp_replace(cl.whatsapp, '[^0-9]', '', 'g') = regexp_replace(wc.phone_number, '[^0-9]', '', 'g')
    LIMIT 1
  )
  WHERE wc.lead_id IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
