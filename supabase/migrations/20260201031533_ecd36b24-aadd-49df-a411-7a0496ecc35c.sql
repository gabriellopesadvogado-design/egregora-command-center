-- Adicionar constraint UNIQUE para permitir upsert por semana
ALTER TABLE weekly_targets 
ADD CONSTRAINT weekly_targets_semana_unique 
UNIQUE (semana_inicio, semana_fim);