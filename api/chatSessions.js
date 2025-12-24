/**
 * Chat Sessions Management
 * Handles persistent chat history with portfolio context awareness
 */

const { pool } = require('./db');

/**
 * Create a new chat session
 * @param {number} userId - User ID
 * @param {string} title - Session title (auto-generated from first message)
 * @param {number|null} portfolioId - Portfolio ID (null for general chats)
 * @returns {Promise<Object>} Created session
 */
async function createSession(userId, title, portfolioId = null) {
    const query = `
        INSERT INTO chat_sessions (user_id, title, portfolio_id)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, portfolio_id, title, created_at, updated_at, last_message_at
    `;

    const result = await pool.query(query, [userId, title, portfolioId]);
    console.log(`✅ Created chat session #${result.rows[0].id}: "${title}"`);
    return result.rows[0];
}

/**
 * Get all sessions for a user, grouped by type
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Sessions grouped by general/portfolio
 */
async function getUserSessions(userId) {
    const query = `
        SELECT
            s.id,
            s.user_id,
            s.portfolio_id,
            s.title,
            s.created_at,
            s.updated_at,
            s.last_message_at,
            p.portfolio_name,
            p.original_name as portfolio_file_name,
            (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count,
            (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'assistant' ORDER BY created_at DESC LIMIT 1) as last_message_preview
        FROM chat_sessions s
        LEFT JOIN portfolios_simple p ON s.portfolio_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.last_message_at DESC
    `;

    const result = await pool.query(query, [userId]);

    // Group by general vs portfolio-specific
    const generalSessions = [];
    const portfolioSessions = {};

    result.rows.forEach(session => {
        if (session.portfolio_id === null) {
            generalSessions.push(session);
        } else {
            const portfolioName = session.portfolio_name || session.portfolio_file_name || `Portfolio #${session.portfolio_id}`;
            if (!portfolioSessions[portfolioName]) {
                portfolioSessions[portfolioName] = {
                    portfolioId: session.portfolio_id,
                    portfolioName: portfolioName,
                    sessions: []
                };
            }
            portfolioSessions[portfolioName].sessions.push(session);
        }
    });

    return {
        general: generalSessions,
        byPortfolio: Object.values(portfolioSessions)
    };
}

/**
 * Get a single session with all its messages
 * @param {number} sessionId - Session ID
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<Object|null>} Session with messages
 */
async function getSession(sessionId, userId) {
    const sessionQuery = `
        SELECT
            s.*,
            p.portfolio_name,
            p.original_name as portfolio_file_name
        FROM chat_sessions s
        LEFT JOIN portfolios_simple p ON s.portfolio_id = p.id
        WHERE s.id = $1 AND s.user_id = $2
    `;

    const messagesQuery = `
        SELECT id, role, content, created_at, metadata
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
    `;

    const sessionResult = await pool.query(sessionQuery, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
        return null;
    }

    const session = sessionResult.rows[0];
    const messagesResult = await pool.query(messagesQuery, [sessionId]);

    return {
        ...session,
        messages: messagesResult.rows
    };
}

/**
 * Add a message to a session
 * @param {number} sessionId - Session ID
 * @param {string} role - Message role (user/assistant/system)
 * @param {string} content - Message content
 * @param {Object} metadata - Optional metadata (tokens, cost, etc.)
 * @returns {Promise<Object>} Created message
 */
async function addMessage(sessionId, role, content, metadata = {}) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Insert message
        const messageQuery = `
            INSERT INTO chat_messages (session_id, role, content, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING id, session_id, role, content, created_at, metadata
        `;

        const messageResult = await client.query(messageQuery, [
            sessionId,
            role,
            content,
            JSON.stringify(metadata)
        ]);

        // Update session's last_message_at
        await client.query(
            'UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1',
            [sessionId]
        );

        await client.query('COMMIT');

        return messageResult.rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Update session title
 * @param {number} sessionId - Session ID
 * @param {string} title - New title
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<Object>} Updated session
 */
async function updateSessionTitle(sessionId, title, userId) {
    const query = `
        UPDATE chat_sessions
        SET title = $1
        WHERE id = $2 AND user_id = $3
        RETURNING id, title
    `;

    const result = await pool.query(query, [title, sessionId, userId]);
    return result.rows[0];
}

/**
 * Delete a session and all its messages
 * @param {number} sessionId - Session ID
 * @param {number} userId - User ID (for security check)
 * @returns {Promise<boolean>} Success status
 */
async function deleteSession(sessionId, userId) {
    const query = `
        DELETE FROM chat_sessions
        WHERE id = $1 AND user_id = $2
        RETURNING id
    `;

    const result = await pool.query(query, [sessionId, userId]);
    const deleted = result.rows.length > 0;

    if (deleted) {
        console.log(`🗑️ Deleted chat session #${sessionId}`);
    }

    return deleted;
}

/**
 * Generate title from first user message
 * @param {string} message - First user message
 * @returns {string} Generated title (max 50 chars)
 */
function generateTitle(message) {
    // Clean message and truncate
    let title = message
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (title.length > 50) {
        title = title.substring(0, 47) + '...';
    }

    return title;
}

/**
 * Get session count for user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Total session count
 */
async function getSessionCount(userId) {
    const query = 'SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count) || 0;
}

module.exports = {
    createSession,
    getUserSessions,
    getSession,
    addMessage,
    updateSessionTitle,
    deleteSession,
    generateTitle,
    getSessionCount
};
