-- Migration: 003_add_periodo_afastamento_to_atestados.sql
-- Adds optional `periodo_afastamento` integer column to the `atestados` table.

BEGIN;

-- Add column 'periodo_afastamento' if it does not already exist
ALTER TABLE public.atestados
  ADD COLUMN IF NOT EXISTS periodo_afastamento INTEGER;

-- Optional: create index to speed up queries that filter by periodo_afastamento
CREATE INDEX IF NOT EXISTS idx_atestados_periodo_afastamento ON public.atestados (periodo_afastamento);

COMMIT;
