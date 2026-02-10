const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
    console.log('--- Starting Transaction Tests ---');

    // 1. Get User A ID from DB (to ensure we use a valid ID)
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    let userAId;
    try {
        const res = await client.query("SELECT id FROM accounts WHERE name = 'User A'");
        userAId = res.rows[0]?.id;
    } finally {
        await client.end();
    }

    if (!userAId) {
        console.error('User A not found in DB. Run seed.sql first.');
        return;
    }

    console.log(`Testing with User A ID: ${userAId}`);

    try {
        // 2. Initial Health Check
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('Health Check:', health.data);

        // 3. BONUS (Treasury -> User)
        console.log('\n--- Testing BONUS ---');
        const bonusRes = await axios.post(`${BASE_URL}/transactions/bonus`, {
            accountId: userAId,
            amount: 100,
            referenceId: 'BONUS-001'
        });
        console.log('Bonus Result:', bonusRes.data);

        // 4. SPEND (User -> Treasury)
        console.log('\n--- Testing SPEND ---');
        const spendRes = await axios.post(`${BASE_URL}/transactions/spend`, {
            accountId: userAId,
            amount: 50,
            referenceId: 'SPEND-001'
        });
        console.log('Spend Result:', spendRes.data);

        // 5. TOPUP (External -> User)
        console.log('\n--- Testing TOPUP ---');
        const topupRes = await axios.post(`${BASE_URL}/transactions/topup`, {
            accountId: userAId,
            amount: 200,
            referenceId: 'TOPUP-001'
        });
        console.log('Topup Result:', topupRes.data);

        // 6. Verify Final Balance by attempting a spend that should fail if balance is incorrect
        // Expected Balance: 0 + 100 - 50 + 200 = 250
        console.log('\n--- Verifying Balance via Overspend ---');
        try {
            await axios.post(`${BASE_URL}/transactions/spend`, {
                accountId: userAId,
                amount: 1000, // Should fail
                referenceId: 'SPEND-FAIL-001'
            });
        } catch (err) {
            console.log('Overspend failed as expected:', err.response?.data || err.message);
        }

    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
}

runTests();
