/**
 * Migration Runner for Portfolio AI v1.1
 * Run with: node migrations/run-migration.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'portfolio_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting migration...');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    console.log('');

    // Read migration SQL file
    const sqlFile = path.join(__dirname, '001_add_clients_v1.1.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Backup check
    console.log('⚠️  IMPORTANT: Make sure you have a database backup!');
    console.log('   Run: pg_dump portfolio_ai > backup_$(date +%Y%m%d).sql');
    console.log('');

    // Run migration
    console.log('📝 Executing migration SQL...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');

    // Verify tables
    console.log('📋 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    console.log('');

    // Check clients table
    const clientsCount = await client.query('SELECT COUNT(*) as count FROM clients');
    console.log(`✅ Clients table: ${clientsCount.rows[0].count} rows`);

    // Check existing portfolios still accessible
    const portfoliosCount = await client.query('SELECT COUNT(*) as count FROM portfolios_simple');
    console.log(`✅ Portfolios table: ${portfoliosCount.rows[0].count} rows (preserved)`);

    // Check existing reports still accessible
    const reportsCount = await client.query('SELECT COUNT(*) as count FROM reports_simple');
    console.log(`✅ Reports table: ${reportsCount.rows[0].count} rows (preserved)`);

    console.log('');
    console.log('🎉 Migration v1.1 completed successfully!');
    console.log('You can now proceed with implementing the client management API.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('');
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
