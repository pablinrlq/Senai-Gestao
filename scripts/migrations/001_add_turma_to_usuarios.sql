-- Migration: 001_add_turma_to_usuarios.sql
-- Adds optional `turma` column to the `usuarios` table and an index for faster filtering.

BEGIN;

-- Add column 'turma' if it does not already exist
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS turma TEXT;

-- Optional: create index to speed up queries that filter by turma
CREATE INDEX IF NOT EXISTS idx_usuarios_turma ON public.usuarios (turma);

COMMIT;
