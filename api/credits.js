/**
 * Credits Management Module
 * Handles token/credits balance, purchases, and usage tracking
 */

const db = require('./db');

// Pricing: 100,000 tokens = $10 USD
const CREDITS_PRICING = {
  TOKENS_PER_DOLLAR: 100000 / 10, // ~33,333 tokens per dollar
  MIN_PURCHASE: 10000,  // Minimum 10k tokens
  DEFAULT_BALANCE: 100000, // New users get 100k tokens
};

/**
 * Get user credits balance
 */
async function getBalance(userId = 1) {
  const result = await db.pool.query(
    'SELECT credits_balance FROM users_demo WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0].credits_balance;
}

/**
 * Add credits to user account (purchase)
 */
async function addCredits(userId = 1, amount, description = 'Credits purchase') {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Update balance
    const result = await client.query(
      `UPDATE users_demo
       SET credits_balance = credits_balance + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING credits_balance`,
      [amount, userId]
    );

    const newBalance = result.rows[0].credits_balance;

    // Record transaction
    await client.query(
      `INSERT INTO credits_transactions
       (user_id, amount, balance_after, transaction_type, description)
       VALUES ($1, $2, $3, 'purchase', $4)`,
      [userId, amount, newBalance, description]
    );

    await client.query('COMMIT');

    console.log(`✅ Added ${amount} credits to user ${userId}. New balance: ${newBalance}`);

    return { balance: newBalance, added: amount };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deduct credits from user account (usage)
 */
async function deductCredits(userId = 1, amount, description, reportId = null, portfolioId = null) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Check current balance
    const balanceResult = await client.query(
      'SELECT credits_balance FROM users_demo WHERE id = $1 FOR UPDATE',
      [userId]
    );

    const currentBalance = balanceResult.rows[0].credits_balance;

    // Deduct credits (can go negative)
    const result = await client.query(
      `UPDATE users_demo
       SET credits_balance = credits_balance - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING credits_balance`,
      [amount, userId]
    );

    const newBalance = result.rows[0].credits_balance;

    // Record transaction
    await client.query(
      `INSERT INTO credits_transactions
       (user_id, amount, balance_after, transaction_type, description, related_report_id, related_portfolio_id)
       VALUES ($1, $2, $3, 'usage', $4, $5, $6)`,
      [userId, -amount, newBalance, description, reportId, portfolioId]
    );

    await client.query('COMMIT');

    console.log(`💳 Deducted ${amount} credits from user ${userId}. New balance: ${newBalance}`);

    return { balance: newBalance, deducted: amount };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if user has sufficient credits (>0)
 */
async function hasCredits(userId = 1) {
  const balance = await getBalance(userId);
  return balance > 0;
}

/**
 * Get credits usage history
 */
async function getHistory(userId = 1, limit = 50) {
  const result = await db.pool.query(
    `SELECT
      ct.*,
      p.filename as portfolio_filename,
      r.ai_model as report_model
     FROM credits_transactions ct
     LEFT JOIN portfolios_simple p ON ct.related_portfolio_id = p.id
     LEFT JOIN reports_simple r ON ct.related_report_id = r.id
     WHERE ct.user_id = $1
     ORDER BY ct.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

/**
 * Calculate price for token amount
 */
function calculatePrice(tokens) {
  const priceUSD = tokens / CREDITS_PRICING.TOKENS_PER_DOLLAR;
  return parseFloat(priceUSD.toFixed(2));
}

/**
 * Get user summary (balance + recent activity)
 */
async function getUserSummary(userId = 1) {
  const balance = await getBalance(userId);
  const history = await getHistory(userId, 10);

  // Calculate total usage and purchases
  const stats = await db.pool.query(
    `SELECT
      SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END) as total_purchased,
      SUM(CASE WHEN transaction_type = 'usage' THEN ABS(amount) ELSE 0 END) as total_used,
      COUNT(CASE WHEN transaction_type = 'usage' THEN 1 END) as reports_generated
     FROM credits_transactions
     WHERE user_id = $1`,
    [userId]
  );

  return {
    balance,
    hasCredits: balance > 0,
    totalPurchased: stats.rows[0].total_purchased || 0,
    totalUsed: stats.rows[0].total_used || 0,
    reportsGenerated: parseInt(stats.rows[0].reports_generated) || 0,
    recentHistory: history,
  };
}

/**
 * Track system token usage (not charged to user)
 * This is for infrastructure overhead: intent classification, SPA generation, etc.
 */
async function trackSystemUsage(userId = 1, tokens, description) {
  try {
    // Log system usage for monitoring, but don't deduct from user balance
    console.log(`🔧 System overhead: ${tokens} tokens (${description}) - NOT charged to user ${userId}`);

    // Optionally record in a separate system_usage table if needed for analytics
    // For now, just log it

    return { tracked: tokens, description };
  } catch (error) {
    console.error('❌ Error tracking system usage:', error.message);
    return { tracked: 0, error: error.message };
  }
}

/**
 * Deduct credits only for user-facing AI responses
 * System overhead (intent classification, SPA, data gathering) is NOT charged
 */
async function deductUserCredits(userId = 1, tokens, description, reportId = null, portfolioId = null) {
  console.log(`💳 Charging user ${userId}: ${tokens} tokens (${description})`);
  return deductCredits(userId, tokens, description, reportId, portfolioId);
}

module.exports = {
  getBalance,
  addCredits,
  deductCredits,
  deductUserCredits,      // NEW: Explicitly for user-facing AI responses
  trackSystemUsage,       // NEW: Track but don't charge system overhead
  hasCredits,
  getHistory,
  calculatePrice,
  getUserSummary,
  CREDITS_PRICING,
};
