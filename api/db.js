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

    // Create clients table first (referenced by portfolios)
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(50) DEFAULT 'individual',
        email VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create portfolios_simple table
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolios_simple (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
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

// ==================== CLIENT MANAGEMENT ====================

/**
 * Get all clients with portfolio and report counts
 */
async function getAllClients() {
  const query = `
    SELECT
      c.*,
      COUNT(DISTINCT p.id) as portfolio_count,
      COUNT(DISTINCT r.id) as report_count
    FROM clients c
    LEFT JOIN portfolios_simple p ON p.client_id = c.id
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get single client by ID
 */
async function getClient(id) {
  const query = `
    SELECT
      c.*,
      COUNT(DISTINCT p.id) as portfolio_count,
      COUNT(DISTINCT r.id) as report_count
    FROM clients c
    LEFT JOIN portfolios_simple p ON p.client_id = c.id
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    WHERE c.id = $1
    GROUP BY c.id
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Create new client
 */
async function createClient(name, entityType, email, phone) {
  const query = `
    INSERT INTO clients (user_id, name, entity_type, email, phone, total_aum, risk_level)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, name, entity_type, email, phone, total_aum, risk_level, created_at, updated_at
  `;

  const result = await pool.query(query, [
    1, // user_id (demo user)
    name,
    entityType || 'individual',
    email || null,
    phone || null,
    0.00, // total_aum (default)
    'medium' // risk_level (default)
  ]);
  return result.rows[0];
}

/**
 * Update client
 */
async function updateClient(id, name, entityType, email, phone) {
  const query = `
    UPDATE clients
    SET name = $1, entity_type = $2, email = $3, phone = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id, name, entity_type, email, phone, created_at, updated_at
  `;

  const result = await pool.query(query, [
    name,
    entityType || 'individual',
    email || null,
    phone || null,
    id
  ]);
  return result.rows[0] || null;
}

/**
 * Delete client (will fail if client has portfolios due to foreign key)
 */
async function deleteClient(id) {
  const query = 'DELETE FROM clients WHERE id = $1 RETURNING id';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

/**
 * Get client's portfolios
 */
async function getClientPortfolios(clientId) {
  const query = `
    SELECT p.*, r.id as report_id, r.generated_at as report_generated
    FROM portfolios_simple p
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    WHERE p.client_id = $1
    ORDER BY p.uploaded_at DESC
  `;

  const result = await pool.query(query, [clientId]);
  return result.rows;
}

module.exports = {
  pool,
  initTables,
  savePortfolio,
  getAllPortfolios,
  getPortfolio,
  saveReport,
  deletePortfolio,
  // Client management
  getAllClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientPortfolios,
};
