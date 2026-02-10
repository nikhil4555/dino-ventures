-- Seed Data

-- 1. Create Asset Type
INSERT INTO asset_types (name, description)
VALUES ('GoldCoins', 'Internal currency for Dino Ventures')
ON CONFLICT (name) DO NOTHING;

-- 2. Create System Treasury Account
DO $$
DECLARE
    treasury_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'System Treasury') THEN
        INSERT INTO accounts (name, type)
        VALUES ('System Treasury', 'TREASURY')
        RETURNING id INTO treasury_id;
        
        -- Initialize Treasury Balance (Infinite or High amount for testing logic, but technically 0 start is fine if we mint)
        -- For a closed loop, usually Treasury mints. We'll start with 0 and assume minting happens via special trans types or manually.
        -- OR, let's give Treasury a huge balance to simulate "minted" coins available for distribution.
        INSERT INTO wallet_balances (account_id, asset_type, balance)
        VALUES (treasury_id, 'GoldCoins', 1000000000);
    END IF;
END $$;

-- 3. Create User Accounts
DO $$
DECLARE
    user_a_id UUID;
    user_b_id UUID;
BEGIN
    -- User A
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'User A') THEN
        INSERT INTO accounts (name, type)
        VALUES ('User A', 'USER')
        RETURNING id INTO user_a_id;
        
        INSERT INTO wallet_balances (account_id, asset_type, balance)
        VALUES (user_a_id, 'GoldCoins', 0);
    END IF;

    -- User B
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'User B') THEN
        INSERT INTO accounts (name, type)
        VALUES ('User B', 'USER')
        RETURNING id INTO user_b_id;
        
        INSERT INTO wallet_balances (account_id, asset_type, balance)
        VALUES (user_b_id, 'GoldCoins', 0);
    END IF;
END $$;
