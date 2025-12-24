/**
 * Session Helper
 * Manages user authentication and session handling
 */

/**
 * Get current user ID from request
 * For now, hardcoded to demo user (ID=1)
 * In production, this would read from session/JWT token
 *
 * @param {Object} req - Express request object
 * @returns {number} User ID
 */
function getCurrentUserId(req) {
    // TODO: In production, implement proper session/JWT authentication
    // For example:
    // return req.session?.userId || req.user?.id || null;

    // For demo system, always return user_id = 1
    return 1;
}

/**
 * Verify that a portfolio belongs to the current user
 * @param {number} portfolioId - Portfolio ID to check
 * @param {number} userId - User ID to verify against
 * @param {Object} db - Database connection
 * @returns {Promise<boolean>} True if portfolio belongs to user
 */
async function verifyPortfolioOwnership(portfolioId, userId, db) {
    try {
        const query = `
            SELECT id, user_id
            FROM portfolios_simple
            WHERE id = $1
        `;

        const result = await db.pool.query(query, [portfolioId]);

        if (result.rows.length === 0) {
            console.log(`⚠️ Portfolio ${portfolioId} not found`);
            return false;
        }

        const portfolio = result.rows[0];
        const ownsPortfolio = portfolio.user_id === userId;

        if (!ownsPortfolio) {
            console.log(`🚫 SECURITY: User ${userId} attempted to access portfolio ${portfolioId} belonging to user ${portfolio.user_id}`);
        } else {
            console.log(`✅ SECURITY: User ${userId} verified as owner of portfolio ${portfolioId}`);
        }

        return ownsPortfolio;

    } catch (error) {
        console.error('❌ Error verifying portfolio ownership:', error.message);
        return false;
    }
}

/**
 * Middleware to verify portfolio access
 * Use this in Express routes that access portfolios
 */
async function requirePortfolioAccess(req, res, next, db) {
    const userId = getCurrentUserId(req);
    const portfolioId = req.params.id || req.query.portfolio_id;

    if (!portfolioId) {
        return res.status(400).json({
            error: 'Portfolio ID required',
            success: false
        });
    }

    const hasAccess = await verifyPortfolioOwnership(portfolioId, userId, db);

    if (!hasAccess) {
        return res.status(403).json({
            error: 'Access denied. This portfolio does not belong to you.',
            success: false
        });
    }

    // Attach userId to request for use in route handler
    req.userId = userId;
    next();
}

module.exports = {
    getCurrentUserId,
    verifyPortfolioOwnership,
    requirePortfolioAccess
};
