-- Migração para adicionar sistema de aprovação em duas etapas aos atestados
-- Data: 2025-11-30
-- Descrição: Adiciona campos para rastrear aprovações pela pedagogia e secretaria

-- Adicionar campos de aprovação pela pedagogia
ALTER TABLE public.atestados 
ADD COLUMN IF NOT EXISTS aprovado_pedagogia_por TEXT,
ADD COLUMN IF NOT EXISTS aprovado_pedagogia_em TIMESTAMP;

-- Adicionar campos de aprovação pela secretaria
ALTER TABLE public.atestados 
ADD COLUMN IF NOT EXISTS aprovado_secretaria_por TEXT,
ADD COLUMN IF NOT EXISTS aprovado_secretaria_em TIMESTAMP;

-- Adicionar campos de rejeição
ALTER TABLE public.atestados 
ADD COLUMN IF NOT EXISTS rejeitado_por TEXT,
ADD COLUMN IF NOT EXISTS rejeitado_em TIMESTAMP;

-- Comentários para documentação
COMMENT ON COLUMN public.atestados.aprovado_pedagogia_por IS 'ID do usuário que aprovou pela pedagogia';
COMMENT ON COLUMN public.atestados.aprovado_pedagogia_em IS 'Data e hora da aprovação pela pedagogia';
COMMENT ON COLUMN public.atestados.aprovado_secretaria_por IS 'ID do usuário que aprovou pela secretaria';
COMMENT ON COLUMN public.atestados.aprovado_secretaria_em IS 'Data e hora da aprovação pela secretaria';
COMMENT ON COLUMN public.atestados.rejeitado_por IS 'ID do usuário que rejeitou';
COMMENT ON COLUMN public.atestados.rejeitado_em IS 'Data e hora da rejeição';
