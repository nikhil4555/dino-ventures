-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Asset Types (e.g., 'GoldCoins')
CREATE TABLE IF NOT EXISTS asset_types (
    name VARCHAR(50) PRIMARY KEY, -- 'GoldCoins'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Accounts (Users & System Treasury)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('USER', 'TREASURY')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Wallet Balances (Fast Read Cache / SOT for constraints)
CREATE TABLE IF NOT EXISTS wallet_balances (
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) REFERENCES asset_types(name) ON DELETE RESTRICT,
    balance NUMERIC(20, 4) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (account_id, asset_type),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- 4. Transactions (Business Level Events)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL, -- Core for idempotency
    type VARCHAR(50) NOT NULL CHECK (type IN ('TOPUP', 'BONUS', 'SPEND')),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    reference_id VARCHAR(255), -- External Order ID, etc.
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ledger Entries (Double Entry Immutable Records)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    asset_type VARCHAR(50) REFERENCES asset_types(name) ON DELETE RESTRICT,
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')), -- DEBIT = Decrease, CREDIT = Increase
    balance_after NUMERIC(20, 4), -- Optional: Snapshot for auditing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
