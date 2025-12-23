/**
 * Migration Runner
 * Executes database migration 002_add_file_upload_fields.sql
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('./db');

async function runMigration() {
    console.log('\n🔄 Running database migration: 002_add_file_upload_fields.sql\n');

    try {
        // Read migration SQL file
        const migrationPath = path.join(__dirname, 'migrations', '002_add_file_upload_fields.sql');
        const migrationSQL = await fs.readFile(migrationPath, 'utf8');

        console.log('📄 Migration SQL loaded');
        console.log('━'.repeat(60));

        // Execute migration using existing database pool
        const client = await db.pool.connect();

        try {
            const result = await client.query(migrationSQL);

            console.log('━'.repeat(60));
            console.log('✅ Migration completed successfully!\n');

            // Display table structure
            console.log('📋 Verifying new columns in portfolios_simple table:\n');
            const tableInfo = await client.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'portfolios_simple'
                ORDER BY ordinal_position
            `);

            tableInfo.rows.forEach(col => {
                const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
                console.log(`   ${col.column_name}: ${col.data_type}${length}`);
            });

            console.log('\n✅ Migration 002 completed successfully!\n');

        } finally {
            client.release();
        }

        // Close database pool
        await db.pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
runMigration();
