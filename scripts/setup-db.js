const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  const client = await pool.connect();
  try {
    console.log('Starting Database Setup...');

    // Read Schema
    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying Schema...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    // Read Seed
    const seedPath = path.join(__dirname, '../src/db/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Seeding Data...');
    await client.query(seedSql);
    console.log('Data seeded successfully.');

  } catch (err) {
    console.error('Error setting up database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

setupDatabase();
