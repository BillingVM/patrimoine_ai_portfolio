/**
 * Database Connection and Queries
 * Simple PostgreSQL wrapper for portfolio operations
 */

const { Pool } = require('pg');
require('dotenv').config();

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL error:', err);
});

/**
 * Initialize database tables
 */
async function initTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create portfolios_simple table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolios_simple (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        raw_data TEXT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create reports_simple table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports_simple (
        id SERIAL PRIMARY KEY,
        portfolio_id INTEGER REFERENCES portfolios_simple(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        ai_model VARCHAR(100),
        tokens_used INTEGER,
        cost_usd DECIMAL(10, 6),
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables initialized');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing tables:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Save uploaded portfolio to database
 */
async function savePortfolio(filename, originalName, fileType, rawData) {
  const query = `
    INSERT INTO portfolios_simple (filename, original_name, file_type, raw_data)
    VALUES ($1, $2, $3, $4)
    RETURNING id, filename, original_name, file_type, uploaded_at
  `;

  const result = await pool.query(query, [filename, originalName, fileType, rawData]);
  return result.rows[0];
}

/**
 * Get all portfolios
 */
async function getAllPortfolios() {
  const query = `
    SELECT p.*, r.id as report_id, r.generated_at as report_generated
    FROM portfolios_simple p
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    ORDER BY p.uploaded_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get single portfolio by ID
 */
async function getPortfolio(id) {
  const query = `
    SELECT p.*, r.id as report_id, r.content as report_content,
           r.ai_model, r.tokens_used, r.cost_usd, r.generated_at as report_generated
    FROM portfolios_simple p
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    WHERE p.id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Save generated report
 */
async function saveReport(portfolioId, content, aiModel, tokensUsed, costUsd) {
  const query = `
    INSERT INTO reports_simple (portfolio_id, content, ai_model, tokens_used, cost_usd)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, portfolio_id, generated_at
  `;

  const result = await pool.query(query, [portfolioId, content, aiModel, tokensUsed, costUsd]);
  return result.rows[0];
}

/**
 * Delete portfolio and its report
 */
async function deletePortfolio(id) {
  const query = 'DELETE FROM portfolios_simple WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

module.exports = {
  pool,
  initTables,
  savePortfolio,
  getAllPortfolios,
  getPortfolio,
  saveReport,
  deletePortfolio,
};
