/**
 * Run database migrations
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📦 Running migration: 001_add_portfolio_names.sql');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '001_add_portfolio_names.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
