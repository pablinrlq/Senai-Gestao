-- Migration: 002_add_registro_empregado_to_usuarios.sql
-- Adds optional `registro_empregado` column to the `usuarios` table and an index for faster filtering.

BEGIN;

-- Add column 'registro_empregado' if it does not already exist
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS registro_empregado TEXT;

-- Optional: create index to speed up queries that filter by registro_empregado
CREATE INDEX IF NOT EXISTS idx_usuarios_registro_empregado ON public.usuarios (registro_empregado);

COMMIT;
