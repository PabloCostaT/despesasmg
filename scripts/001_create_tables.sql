-- Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Famílias
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Membros da Família (Associação entre Usuários e Famílias)
CREATE TYPE member_role AS ENUM ('admin', 'member');
CREATE TYPE member_status AS ENUM ('pending', 'active', 'inactive');

CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    status member_status DEFAULT 'pending', -- 'pending' for invited, 'active' once joined
    joined_at TIMESTAMP WITH TIME ZONE, -- Set when status becomes 'active'
    invited_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (family_id, user_id) -- Um usuário só pode ser membro de uma família uma vez
);

-- Tabela de Carteiras (Saldo de cada membro dentro de uma família)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID UNIQUE NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) DEFAULT 0.00 NOT NULL, -- Saldo atual do membro (positivo = a receber, negativo = a pagar)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Projetos (para agrupar despesas)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    budget NUMERIC(10, 2),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Despesas
CREATE TYPE expense_category AS ENUM ('alimentacao', 'moradia', 'transporte', 'saude', 'educacao', 'lazer', 'contas', 'outros');

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category expense_category DEFAULT 'outros',
    paid_by_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Despesa pode ou não estar associada a um projeto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Divisão de Despesas (como cada membro contribui/deve para uma despesa)
CREATE TYPE split_type AS ENUM ('equal', 'percentage', 'manual');

CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    amount_owed NUMERIC(10, 2) NOT NULL, -- Valor que este membro deve da despesa
    split_type split_type NOT NULL,
    percentage NUMERIC(5, 2), -- Usado se split_type = 'percentage'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (expense_id, family_member_id)
);

-- Tabela de Transações da Carteira (Histórico de movimentos)
CREATE TYPE transaction_type AS ENUM ('expense_paid', 'expense_owed', 'settlement_sent', 'settlement_received', 'adjustment');

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    related_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    related_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL, -- Para settlements
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_families_created_by ON families(created_by_user_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_wallets_family_member_id ON wallets(family_member_id);
CREATE INDEX idx_expenses_family_id ON expenses(family_id);
CREATE INDEX idx_expenses_paid_by_member_id ON expenses(paid_by_member_id);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX idx_expense_splits_family_member_id ON expense_splits(family_member_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_related_expense_id ON transactions(related_expense_id);
CREATE INDEX idx_transactions_related_member_id ON transactions(related_member_id);

-- Funções e Triggers para manter o saldo da carteira atualizado
-- Função para atualizar o saldo da carteira após inserção/atualização/deleção de expense_splits
CREATE OR REPLACE FUNCTION update_wallet_balance_on_expense_split()
RETURNS TRIGGER AS $$
DECLARE
    paid_by_wallet_id UUID;
    paid_by_amount NUMERIC(10, 2);
    expense_title VARCHAR(255);
BEGIN
    -- Obter o wallet_id do pagador da despesa
    SELECT w.id, e.amount, e.title
    INTO paid_by_wallet_id, paid_by_amount, expense_title
    FROM wallets w
    JOIN family_members fm ON w.family_member_id = fm.id
    JOIN expenses e ON fm.id = e.paid_by_member_id
    WHERE e.id = NEW.expense_id;

    IF TG_OP = 'INSERT' THEN
        -- Atualiza o saldo do membro que deve
        UPDATE wallets
        SET balance = balance - NEW.amount_owed
        WHERE family_member_id = NEW.family_member_id;

        -- Registra a transação para o membro que deve
        INSERT INTO transactions (wallet_id, type, amount, description, related_expense_id, related_member_id)
        VALUES (
            (SELECT id FROM wallets WHERE family_member_id = NEW.family_member_id),
            'expense_owed',
            NEW.amount_owed,
            'Valor devido pela despesa: ' || expense_title,
            NEW.expense_id,
            paid_by_wallet_id -- O membro que pagou a despesa
        );

        -- Se for a primeira divisão para esta despesa, atualiza o saldo do pagador
        -- e registra a transação de pagamento da despesa
        IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = NEW.expense_id AND id != NEW.id) THEN
            UPDATE wallets
            SET balance = balance + paid_by_amount
            WHERE id = paid_by_wallet_id;

            INSERT INTO transactions (wallet_id, type, amount, description, related_expense_id)
            VALUES (
                paid_by_wallet_id,
                'expense_paid',
                paid_by_amount,
                'Despesa paga: ' || expense_title,
                NEW.expense_id
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Reverte o valor antigo e aplica o novo para o membro que deve
        UPDATE wallets
        SET balance = balance + OLD.amount_owed - NEW.amount_owed
        WHERE family_member_id = NEW.family_member_id;

        -- Atualiza a transação existente ou insere uma nova se não houver
        UPDATE transactions
        SET amount = NEW.amount_owed, description = 'Valor devido atualizado para despesa: ' || expense_title
        WHERE wallet_id = (SELECT id FROM wallets WHERE family_member_id = NEW.family_member_id)
          AND related_expense_id = NEW.expense_id
          AND type = 'expense_owed';

    ELSIF TG_OP = 'DELETE' THEN
        -- Reverte o saldo do membro que devia
        UPDATE wallets
        SET balance = balance + OLD.amount_owed
        WHERE family_member_id = OLD.family_member_id;

        -- Remove a transação correspondente
        DELETE FROM transactions
        WHERE wallet_id = (SELECT id FROM wallets WHERE family_member_id = OLD.family_member_id)
          AND related_expense_id = OLD.expense_id
          AND type = 'expense_owed';

        -- Se não houver mais divisões para esta despesa, reverte o saldo do pagador
        IF NOT EXISTS (SELECT 1 FROM expense_splits WHERE expense_id = OLD.expense_id) THEN
            UPDATE wallets
            SET balance = balance - paid_by_amount
            WHERE id = paid_by_wallet_id;

            DELETE FROM transactions
            WHERE wallet_id = paid_by_wallet_id
              AND related_expense_id = OLD.expense_id
              AND type = 'expense_paid';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_balance_on_expense_split
AFTER INSERT OR UPDATE OR DELETE ON expense_splits
FOR EACH ROW EXECUTE FUNCTION update_wallet_balance_on_expense_split();

-- Trigger para criar uma carteira para um novo family_member
CREATE OR REPLACE FUNCTION create_wallet_for_new_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        INSERT INTO wallets (family_member_id)
        VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_wallet_for_new_member
AFTER INSERT ON family_members
FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_member();

-- Trigger para atualizar `updated_at` automaticamente
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_families_updated_at
BEFORE UPDATE ON families
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_family_members_updated_at
BEFORE UPDATE ON family_members
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trg_expense_splits_updated_at
BEFORE UPDATE ON expense_splits
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
