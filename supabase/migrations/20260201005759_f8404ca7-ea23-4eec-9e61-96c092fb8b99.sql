-- Adicionar novos status ao enum meeting_status
ALTER TYPE meeting_status ADD VALUE 'ganha' AFTER 'proposta_enviada';
ALTER TYPE meeting_status ADD VALUE 'perdida' AFTER 'ganha';

-- Adicionar campos financeiros na tabela meetings
ALTER TABLE meetings ADD COLUMN valor_fechado NUMERIC;
ALTER TABLE meetings ADD COLUMN caixa_gerado NUMERIC;
ALTER TABLE meetings ADD COLUMN motivo_perda TEXT;
ALTER TABLE meetings ADD COLUMN fechado_em TIMESTAMPTZ;