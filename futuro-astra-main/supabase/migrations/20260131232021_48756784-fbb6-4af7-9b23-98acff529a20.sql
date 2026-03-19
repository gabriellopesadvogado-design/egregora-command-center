-- Adicionar novos valores ao enum plataforma_origem
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'blog';
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'organico';
ALTER TYPE public.plataforma_origem ADD VALUE IF NOT EXISTS 'indicacao';

-- Adicionar coluna fonte_lead na tabela meetings
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS fonte_lead public.plataforma_origem DEFAULT 'outros';