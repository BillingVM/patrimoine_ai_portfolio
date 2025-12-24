/**
 * Portfolio Database Queries
 * Comprehensive queries for portfolio context awareness
 */

const { pool } = require('./db');

/**
 * Get user's portfolios (currently using demo user, userId = 1)
 * @param {number} userId - User ID (default: 1 for demo)
 * @returns {Promise<Array>} List of user's portfolios
 */
async function getUserPortfolios(userId = 1) {
  // FIXED: For demo system, get all portfolios
  // In production, would filter by user_id column when it exists
  const query = `
    SELECT
      p.id,
      p.client_id,
      p.name,
      p.description,
      p.filename,
      p.original_name,
      p.file_type,
      p.raw_data,
      p.parsed_holdings,
      p.total_value,
      p.currency,
      p.uploaded_at,
      c.name as client_name
    FROM portfolios_simple p
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY p.uploaded_at DESC
  `;

  const result = await pool.query(query);
  console.log(`   📊 Found ${result.rows.length} total portfolios`);
  return result.rows;
}

/**
 * Get portfolio by ID
 * @param {number} portfolioId - Portfolio ID
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<Object|null>} Portfolio object or null
 */
async function getPortfolioById(portfolioId, userId = 1) {
  const query = `
    SELECT
      p.*,
      c.name as client_name,
      c.email as client_email,
      r.id as report_id,
      r.content as report_content,
      r.generated_at as report_generated_at
    FROM portfolios_simple p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN reports_simple r ON r.portfolio_id = p.id
    WHERE p.id = $1
  `;

  const result = await pool.query(query, [portfolioId]);
  return result.rows[0] || null;
}

/**
 * Get portfolio by name (fuzzy match)
 * @param {string} name - Portfolio name
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Matching portfolios
 */
async function getPortfoliosByName(name, userId = 1) {
  const query = `
    SELECT
      p.id,
      p.client_id,
      p.name,
      p.description,
      p.total_value,
      p.currency,
      p.uploaded_at,
      p.parsed_holdings,
      c.name as client_name,
      similarity(p.name, $1) as name_similarity,
      similarity(p.original_name, $1) as filename_similarity
    FROM portfolios_simple p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.client_id IN (
      SELECT id FROM clients WHERE id = $2
    )
    AND (
      LOWER(p.name) LIKE LOWER($1) ||'%'
      OR LOWER(p.original_name) LIKE '%' || LOWER($1) || '%'
      OR LOWER(p.description) LIKE '%' || LOWER($1) || '%'
    )
    ORDER BY
      CASE
        WHEN LOWER(p.name) = LOWER($1) THEN 1
        WHEN LOWER(p.name) LIKE LOWER($1) || '%' THEN 2
        ELSE 3
      END,
      p.uploaded_at DESC
  `;

  const result = await pool.query(query, [name, userId]);
  return result.rows;
}

/**
 * Get most recently uploaded portfolio
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Most recent portfolio
 */
async function getLatestPortfolio(userId = 1) {
  // FIXED: For demo system, get most recent portfolio regardless of client_id
  // In production, would filter by user_id column when it exists
  const query = `
    SELECT
      p.*,
      c.name as client_name
    FROM portfolios_simple p
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY p.uploaded_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query);
  if (result.rows[0]) {
    console.log(`   ✅ Latest portfolio: ID ${result.rows[0].id}, uploaded ${result.rows[0].uploaded_at}`);
  } else {
    console.log(`   ⚠️ No portfolios found in database`);
  }
  return result.rows[0] || null;
}

/**
 * Get portfolio by order (e.g., "first", "second", "#1", "#2")
 * @param {number} order - 1-based order (1 = first, 2 = second, etc.)
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Portfolio at that position
 */
async function getPortfolioByOrder(order, userId = 1) {
  // FIXED: For demo system, get portfolio by order from all portfolios
  const query = `
    SELECT
      p.*,
      c.name as client_name,
      ROW_NUMBER() OVER (ORDER BY p.uploaded_at DESC) as portfolio_order
    FROM portfolios_simple p
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY p.uploaded_at DESC
  `;

  const result = await pool.query(query);

  // Filter to get the portfolio at the specified order
  const portfolios = result.rows;
  return portfolios[order - 1] || null;
}

/**
 * Get portfolio count for user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total portfolio count
 */
async function getPortfolioCount(userId = 1) {
  // FIXED: For demo system, count all portfolios
  const query = `
    SELECT COUNT(*) as count
    FROM portfolios_simple p
  `;

  const result = await pool.query(query);
  return parseInt(result.rows[0].count) || 0;
}

/**
 * Parse portfolio holdings from raw_data
 * @param {string} rawData - Raw portfolio data (CSV, JSON, etc.)
 * @param {string} fileType - File type (csv, xlsx, json)
 * @returns {Object} Parsed holdings with assets
 */
function parsePortfolioHoldings(rawData, fileType) {
  try {
    let holdings = [];

    if (fileType === 'csv') {
      // Parse CSV format
      const lines = rawData.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const holding = {};

        headers.forEach((header, index) => {
          holding[header] = values[index]?.trim();
        });

        if (holding.ticker || holding.symbol || holding.asset) {
          holdings.push({
            ticker: holding.ticker || holding.symbol || holding.asset || 'UNKNOWN',
            shares: parseFloat(holding.shares || holding.quantity || 0),
            value: parseFloat(holding.value || holding['market value'] || 0),
            allocation: parseFloat(holding.allocation || holding['%'] || 0)
          });
        }
      }
    } else if (fileType === 'json') {
      // Parse JSON format
      const data = JSON.parse(rawData);
      holdings = Array.isArray(data) ? data : data.holdings || [];
    }

    // Calculate total value
    const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

    // Calculate allocations if missing
    holdings = holdings.map(h => ({
      ...h,
      allocation: h.allocation || (totalValue > 0 ? (h.value / totalValue) * 100 : 0)
    }));

    return {
      holdings,
      totalValue,
      assetCount: holdings.length,
      tickers: holdings.map(h => h.ticker).filter(Boolean)
    };

  } catch (error) {
    console.error('❌ Error parsing portfolio holdings:', error.message);
    return {
      holdings: [],
      totalValue: 0,
      assetCount: 0,
      tickers: [],
      error: error.message
    };
  }
}

/**
 * Update portfolio name
 * @param {number} portfolioId - Portfolio ID
 * @param {string} name - New name
 * @returns {Promise<Object>} Updated portfolio
 */
async function updatePortfolioName(portfolioId, name) {
  const query = `
    UPDATE portfolios_simple
    SET name = $1
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [name, portfolioId]);
  return result.rows[0];
}

/**
 * Get aggregate portfolio stats for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Aggregate stats
 */
async function getAggregateStats(userId = 1) {
  const query = `
    SELECT
      COUNT(*) as total_portfolios,
      SUM(total_value) as total_value,
      AVG(total_value) as avg_portfolio_value,
      MAX(uploaded_at) as latest_upload,
      MIN(uploaded_at) as first_upload
    FROM portfolios_simple p
    WHERE p.client_id IN (
      SELECT id FROM clients WHERE id = $1
    )
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

module.exports = {
  getUserPortfolios,
  getPortfolioById,
  getPortfoliosByName,
  getLatestPortfolio,
  getPortfolioByOrder,
  getPortfolioCount,
  parsePortfolioHoldings,
  updatePortfolioName,
  getAggregateStats
};
