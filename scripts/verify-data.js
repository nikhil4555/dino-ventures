const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyData() {
    const client = await pool.connect();
    try {
        console.log('--- Verifying Database Data ---');

        // 1. Check Accounts
        const resAccounts = await client.query('SELECT id, name, type FROM accounts');
        console.log('\nAccounts:', resAccounts.rows);

        // 2. Check Asset Types
        const resAssets = await client.query('SELECT * FROM asset_types');
        console.log('\nAssets:', resAssets.rows);

        // 3. Check Wallet Balances
        const resBalances = await client.query(`
      SELECT a.name as account, wb.asset_type, wb.balance 
      FROM wallet_balances wb
      JOIN accounts a ON wb.account_id = a.id
    `);
        console.log('\nBalances:', resBalances.rows);

    } catch (err) {
        console.error('Error verifying data:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verifyData();
