/**
 * Client Management API Routes
 * Portfolio AI v1.1
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/clients - List all clients for demo user
router.get('/', async (req, res) => {
    try {
        const result = await db.pool.query(`
            SELECT c.*,
                   COUNT(p.id) as portfolio_count,
                   SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) as report_count
            FROM clients c
            LEFT JOIN portfolios_simple p ON p.client_id = c.id
            LEFT JOIN reports_simple r ON r.portfolio_id = p.id
            WHERE c.user_id = 1
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `);

        res.json({
            success: true,
            clients: result.rows.map(row => ({
                ...row,
                portfolio_count: parseInt(row.portfolio_count) || 0,
                report_count: parseInt(row.report_count) || 0
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching clients:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch clients',
            details: error.message
        });
    }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
    const { name, entity_type, email, phone } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Client name is required'
        });
    }

    try {
        const result = await db.pool.query(
            `INSERT INTO clients (user_id, name, entity_type, email, phone)
             VALUES (1, $1, $2, $3, $4)
             RETURNING *`,
            [name.trim(), entity_type || 'individual', email, phone]
        );

        console.log(`✅ Created client: ${name} (ID: ${result.rows[0].id})`);

        res.json({
            success: true,
            client: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error creating client:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create client',
            details: error.message
        });
    }
});

// GET /api/clients/:id - Get client details with portfolios
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
            success: false,
            error: 'Invalid client ID'
        });
    }

    try {
        // Get client
        const clientResult = await db.pool.query(
            'SELECT * FROM clients WHERE id = $1 AND user_id = 1',
            [id]
        );

        if (clientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        // Get portfolios for this client
        const portfoliosResult = await db.pool.query(`
            SELECT p.*, r.id as report_id, r.created_at as report_created
            FROM portfolios_simple p
            LEFT JOIN reports_simple r ON r.portfolio_id = p.id
            WHERE p.client_id = $1
            ORDER BY p.created_at DESC
        `, [id]);

        res.json({
            success: true,
            client: clientResult.rows[0],
            portfolios: portfoliosResult.rows
        });
    } catch (error) {
        console.error('❌ Error fetching client:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch client',
            details: error.message
        });
    }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, entity_type, email, phone, risk_level } = req.body;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
            success: false,
            error: 'Invalid client ID'
        });
    }

    if (!name || name.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Client name is required'
        });
    }

    try {
        const result = await db.pool.query(
            `UPDATE clients
             SET name = $1, entity_type = $2, email = $3, phone = $4, risk_level = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND user_id = 1
             RETURNING *`,
            [name.trim(), entity_type, email, phone, risk_level || 'medium', id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        console.log(`✅ Updated client: ${name} (ID: ${id})`);

        res.json({
            success: true,
            client: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error updating client:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update client',
            details: error.message
        });
    }
});

// DELETE /api/clients/:id - Delete client (only if no portfolios)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({
            success: false,
            error: 'Invalid client ID'
        });
    }

    try {
        // Check if client has portfolios
        const portfolioCheck = await db.pool.query(
            'SELECT COUNT(*) as count FROM portfolios_simple WHERE client_id = $1',
            [id]
        );

        if (parseInt(portfolioCheck.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete client with existing portfolios. Delete or reassign portfolios first.'
            });
        }

        // Delete client
        const result = await db.pool.query(
            'DELETE FROM clients WHERE id = $1 AND user_id = 1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        console.log(`✅ Deleted client: ${result.rows[0].name} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Client deleted successfully',
            deleted: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error deleting client:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete client',
            details: error.message
        });
    }
});

module.exports = router;
