-- ============================================================================
-- Migração: Implementar Row-Level Security (RLS) no Supabase
-- Data: 2025-11-30
-- Descrição: Adiciona RLS às tabelas mantendo funcionalidades de admin/funcionário
-- ============================================================================

-- ETAPA 1: Preparar tabela de usuários (se ainda não existir a coluna cargo)
-- ----------------------------------------------------------------------------
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'usuarios' AND column_name = 'cargo'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN cargo TEXT DEFAULT 'USUARIO';
  END IF;
END $$;

-- Criar índice para melhorar performance das políticas
CREATE INDEX IF NOT EXISTS idx_usuarios_cargo ON usuarios(cargo);
CREATE INDEX IF NOT EXISTS idx_usuarios_id ON usuarios(id);

-- ETAPA 2: Preparar tabela de atestados
-- ----------------------------------------------------------------------------
-- Adicionar coluna owner_id se não existir (referência ao usuário que criou)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atestados' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE atestados ADD COLUMN owner_id UUID;
  END IF;
END $$;

-- Popular owner_id com base em id_usuario (se ainda não estiver populado)
UPDATE atestados 
SET owner_id = id_usuario 
WHERE owner_id IS NULL AND id_usuario IS NOT NULL;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_atestados_owner_id ON atestados(owner_id);
CREATE INDEX IF NOT EXISTS idx_atestados_id_usuario ON atestados(id_usuario);
CREATE INDEX IF NOT EXISTS idx_atestados_status ON atestados(status);

-- ETAPA 3: Habilitar RLS nas tabelas
-- ----------------------------------------------------------------------------
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE atestados ENABLE ROW LEVEL SECURITY;

-- ETAPA 4: Políticas para tabela USUARIOS
-- ----------------------------------------------------------------------------

-- Primeiro, criar uma função auxiliar que bypass RLS para verificar cargo
CREATE OR REPLACE FUNCTION is_admin_or_funcionario()
RETURNS BOOLEAN AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  SELECT cargo INTO user_cargo FROM usuarios WHERE id::uuid = auth.uid();
  RETURN user_cargo IN ('ADMINISTRADOR', 'FUNCIONARIO');
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função auxiliar: retorna o cargo do usuário informado (usa SECURITY DEFINER
-- para evitar recursão de políticas ao consultar a tabela usuarios)
CREATE OR REPLACE FUNCTION get_user_cargo(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_cargo TEXT;
BEGIN
  SELECT cargo INTO v_cargo FROM usuarios WHERE id::uuid = p_user_id;
  RETURN v_cargo;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy 1: Usuários podem ler seu próprio perfil OU admin/funcionário veem todos
DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
CREATE POLICY "usuarios_select_own" ON usuarios
  FOR SELECT
  USING (
    auth.uid() = id::uuid OR
    is_admin_or_funcionario()
  );

-- Policy 2: Usuários podem atualizar seu próprio perfil (exceto cargo)
DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;
CREATE POLICY "usuarios_update_own" ON usuarios
  FOR UPDATE
  USING (auth.uid() = id::uuid)
  WITH CHECK (
    auth.uid() = id::uuid AND
    -- Não permite alteração de cargo a menos que seja admin
    (cargo = get_user_cargo(id::uuid) OR is_admin_or_funcionario())
  );

-- Policy 3: Admin pode inserir novos usuários
DROP POLICY IF EXISTS "usuarios_insert_admin" ON usuarios;
CREATE POLICY "usuarios_insert_admin" ON usuarios
  FOR INSERT
  WITH CHECK (is_admin_or_funcionario());

-- Policy 4: Admin pode atualizar qualquer usuário
DROP POLICY IF EXISTS "usuarios_update_admin" ON usuarios;
CREATE POLICY "usuarios_update_admin" ON usuarios
  FOR UPDATE
  USING (is_admin_or_funcionario());

-- ETAPA 5: Políticas para tabela ATESTADOS
-- ----------------------------------------------------------------------------

-- Policy 1: SELECT - Usuários veem seus próprios atestados, admin/funcionário veem todos
DROP POLICY IF EXISTS "atestados_select" ON atestados;
CREATE POLICY "atestados_select" ON atestados
  FOR SELECT
  USING (
    auth.uid() = owner_id::uuid OR
    auth.uid() = id_usuario::uuid OR
    is_admin_or_funcionario()
  );

-- Policy 2: INSERT - Usuários autenticados podem criar atestados
DROP POLICY IF EXISTS "atestados_insert" ON atestados;
CREATE POLICY "atestados_insert" ON atestados
  FOR INSERT
  WITH CHECK (
    auth.uid() = id_usuario::uuid AND
    auth.uid() = owner_id::uuid
  );

-- Policy 3: UPDATE - Usuário pode atualizar seus próprios atestados (apenas enquanto pendente)
DROP POLICY IF EXISTS "atestados_update_own" ON atestados;
CREATE POLICY "atestados_update_own" ON atestados
  FOR UPDATE
  USING (
    auth.uid() = owner_id::uuid AND
    status = 'pendente'
  )
  WITH CHECK (
    auth.uid() = owner_id::uuid AND
    status = 'pendente'
  );

-- Policy 4: UPDATE - Admin e funcionário podem atualizar status de qualquer atestado
DROP POLICY IF EXISTS "atestados_update_admin" ON atestados;
CREATE POLICY "atestados_update_admin" ON atestados
  FOR UPDATE
  USING (is_admin_or_funcionario())
  WITH CHECK (is_admin_or_funcionario());

-- Policy 5: DELETE - Apenas admin pode deletar atestados
DROP POLICY IF EXISTS "atestados_delete_admin" ON atestados;
CREATE POLICY "atestados_delete_admin" ON atestados
  FOR DELETE
  USING (is_admin_or_funcionario());

-- ETAPA 6: Função auxiliar para obter cargo do usuário atual
-- ----------------------------------------------------------------------------
-- Já criada acima junto com as policies

-- ETAPA 7: Comentários para documentação
-- ----------------------------------------------------------------------------
COMMENT ON POLICY "usuarios_select_own" ON usuarios IS 
  'Permite usuários lerem seu próprio perfil, admin/funcionário veem todos';

COMMENT ON POLICY "usuarios_update_own" ON usuarios IS 
  'Permite usuários atualizarem seu próprio perfil (sem mudar cargo)';

COMMENT ON POLICY "usuarios_insert_admin" ON usuarios IS 
  'Apenas administradores podem criar novos usuários';

COMMENT ON POLICY "usuarios_update_admin" ON usuarios IS 
  'Administradores podem atualizar qualquer usuário';

COMMENT ON POLICY "atestados_select" ON atestados IS 
  'Usuários veem seus atestados, admin/funcionário veem todos';

COMMENT ON POLICY "atestados_insert" ON atestados IS 
  'Usuários autenticados podem criar atestados para si mesmos';

COMMENT ON POLICY "atestados_update_own" ON atestados IS 
  'Usuários podem editar seus atestados pendentes';

COMMENT ON POLICY "atestados_update_admin" ON atestados IS 
  'Admin/funcionário podem aprovar/rejeitar qualquer atestado';

COMMENT ON POLICY "atestados_delete_admin" ON atestados IS 
  'Apenas administradores podem deletar atestados';

-- ============================================================================
-- VERIFICAÇÕES E TESTES RECOMENDADOS
-- ============================================================================

-- 1. Verificar se RLS está habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('usuarios', 'atestados');

-- 2. Listar todas as políticas criadas:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename IN ('usuarios', 'atestados');

-- 3. Testar como usuário comum (substitua USER_ID):
-- SET request.jwt.claims.sub = 'USER_ID';
-- SELECT * FROM atestados; -- Deve ver apenas seus atestados

-- 4. Testar como admin (substitua ADMIN_ID):
-- SET request.jwt.claims.sub = 'ADMIN_ID';
-- SELECT * FROM atestados; -- Deve ver todos os atestados

-- ============================================================================
-- ROLLBACK (caso precise reverter)
-- ============================================================================

-- Para desabilitar RLS (NÃO EXECUTE A MENOS QUE NECESSÁRIO):
-- DROP POLICY IF EXISTS "usuarios_select_own" ON usuarios;
-- DROP POLICY IF EXISTS "usuarios_update_own" ON usuarios;
-- DROP POLICY IF EXISTS "usuarios_insert_admin" ON usuarios;
-- DROP POLICY IF EXISTS "usuarios_update_admin" ON usuarios;
-- DROP POLICY IF EXISTS "atestados_select" ON atestados;
-- DROP POLICY IF EXISTS "atestados_insert" ON atestados;
-- DROP POLICY IF EXISTS "atestados_update_own" ON atestados;
-- DROP POLICY IF EXISTS "atestados_update_admin" ON atestados;
-- DROP POLICY IF EXISTS "atestados_delete_admin" ON atestados;
-- ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE atestados DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS is_admin_or_funcionario();

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================
