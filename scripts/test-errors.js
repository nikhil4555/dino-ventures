const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runErrorTests() {
    console.log('--- Starting Error Handling Tests ---');
    console.log(`Target URL: ${BASE_URL}`);

    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    let userAId;
    try {
        const res = await client.query("SELECT id FROM accounts WHERE name = 'User A'");
        userAId = res.rows[0]?.id;
    } catch (err) {
        console.error('Database Connection Error:', err.message);
        await client.end();
        return;
    } finally {
        await client.end();
    }

    if (!userAId) {
        console.error('User A not found in DB. Run seed.sql first.');
        return;
    }

    // 1. Test 404 Route Not Found
    console.log('\n--- 1. Testing 404 Route Not Found ---');
    try {
        await axios.get(`${BASE_URL}/api/nonexistent`);
    } catch (err) {
        if (err.response) {
            console.log(`Status: ${err.response.status}`);
            console.log('Response:', err.response.data);
        } else {
            console.error('Error:', err.code || err.message);
        }
    }

    // 2. Test 400 Bad Request (Missing Fields)
    console.log('\n--- 2. Testing 400 Bad Request (Missing Fields) ---');
    try {
        await axios.post(`${BASE_URL}/transactions/topup`, {
            referenceId: 'INVALID-001'
        });
    } catch (err) {
        if (err.response) {
            console.log(`Status: ${err.response.status}`);
            console.log('Response:', err.response.data);
        } else {
            console.error('Error:', err.code || err.message);
        }
    }

    // 3. Test 404 Resource Not Found (Transaction)
    console.log('\n--- 3. Testing 404 Resource Not Found (Transaction) ---');
    try {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        await axios.get(`${BASE_URL}/transactions/${fakeId}`);
    } catch (err) {
        if (err.response) {
            console.log(`Status: ${err.response.status}`);
            console.log('Response:', err.response.data);
        } else {
            console.error('Error:', err.code || err.message);
        }
    }

    // 4. Test 400 Business Logic (Insufficient Funds)
    console.log('\n--- 4. Testing 400 Business Logic (Insufficient Funds) ---');
    try {
        await axios.post(`${BASE_URL}/transactions/spend`, {
            accountId: userAId,
            amount: 100000000,
            referenceId: 'SPEND-FAIL-HUGE'
        });
    } catch (err) {
        if (err.response) {
            console.log(`Status: ${err.response.status}`);
            console.log('Response:', err.response.data);
        } else {
            console.error('Error:', err.code || err.message);
        }
    }
}

runErrorTests();
