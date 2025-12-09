-- Adiciona colunas para gerenciar status de amizade
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna de status de amizade
ALTER TABLE friends 
ADD COLUMN IF NOT EXISTS friendship_status TEXT DEFAULT 'normal' CHECK (friendship_status IN ('normal', 'close', 'blocked'));

-- Adicionar coluna de atualização
ALTER TABLE friends 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar índice para melhor performance em buscas por status
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(user_id, friendship_status);

-- Adicionar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS friends_updated_at ON friends;
CREATE TRIGGER friends_updated_at
    BEFORE UPDATE ON friends
    FOR EACH ROW
    EXECUTE FUNCTION update_friends_updated_at();

-- Comentários para documentação
COMMENT ON COLUMN friends.friendship_status IS 'Status da amizade: normal (amigo comum), close (melhor amigo), blocked (bloqueado)';
COMMENT ON COLUMN friends.updated_at IS 'Data da última atualização do registro';
