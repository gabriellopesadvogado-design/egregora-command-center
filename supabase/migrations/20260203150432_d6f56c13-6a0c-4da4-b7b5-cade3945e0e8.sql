ALTER TABLE public.meetings 
ADD COLUMN valor_proposta numeric;

COMMENT ON COLUMN public.meetings.valor_proposta IS 'Valor da proposta enviada ao lead';