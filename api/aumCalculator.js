/**
 * AUM Calculator Module
 * Calculates and updates Assets Under Management for portfolios, clients, and solo user
 */

const { pool } = require('./db');

class AUMCalculator {
    /**
     * Parse holdings from portfolio raw data
     */
    parseHoldings(rawData) {
        if (!rawData) return [];

        try {
            // Try to parse as JSON first
            if (rawData.trim().startsWith('{') || rawData.trim().startsWith('[')) {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed)) {
                    return parsed.map(h => ({
                        ticker: h.ticker || h.symbol || 'N/A',
                        name: h.name || h.description || 'Unknown',
                        value: parseFloat(h.value || h.amount || 0),
                        percentage: parseFloat(h.percentage || h.weight || 0)
                    }));
                } else if (parsed.holdings && Array.isArray(parsed.holdings)) {
                    return parsed.holdings.map(h => ({
                        ticker: h.ticker || h.symbol || 'N/A',
                        name: h.name || h.description || 'Unknown',
                        value: parseFloat(h.value || h.amount || 0),
                        percentage: parseFloat(h.percentage || h.weight || 0)
                    }));
                }
            }

            // Try to parse as CSV
            const lines = rawData.split('\n').filter(l => l.trim());
            if (lines.length < 2) return [];

            const holdings = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length >= 3) {
                    const value = parseFloat(values[2]) || 0;
                    if (value > 0) { // Only include holdings with positive value
                        holdings.push({
                            ticker: values[0]?.trim() || 'N/A',
                            name: values[1]?.trim() || 'Unknown',
                            value: value,
                            percentage: parseFloat(values[3]) || 0
                        });
                    }
                }
            }

            return holdings;
        } catch (error) {
            console.error('Error parsing holdings:', error);
            return [];
        }
    }

    /**
     * Recalculate AUM for a specific portfolio
     */
    async recalculatePortfolio(portfolioId) {
        try {
            // Fetch portfolio
            const portfolioResult = await pool.query(
                'SELECT id, raw_data, client_id FROM portfolios_simple WHERE id = $1',
                [portfolioId]
            );

            if (portfolioResult.rows.length === 0) {
                console.error(`Portfolio ${portfolioId} not found`);
                return null;
            }

            const portfolio = portfolioResult.rows[0];
            const holdings = this.parseHoldings(portfolio.raw_data);

            // Calculate total value
            const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
            const holdingsCount = holdings.length;

            // Update portfolio
            await pool.query(
                `UPDATE portfolios_simple
                 SET total_value = $1, holdings_count = $2, last_calculated_at = NOW()
                 WHERE id = $3`,
                [totalValue, holdingsCount, portfolioId]
            );

            console.log(`✓ Portfolio ${portfolioId}: $${totalValue.toFixed(2)} (${holdingsCount} holdings)`);

            return {
                portfolioId,
                totalValue,
                holdingsCount,
                clientId: portfolio.client_id
            };
        } catch (error) {
            console.error(`Error recalculating portfolio ${portfolioId}:`, error);
            throw error;
        }
    }

    /**
     * Recalculate AUM for a specific client
     */
    async recalculateClient(clientId) {
        try {
            // Get all portfolios for this client
            const portfoliosResult = await pool.query(
                'SELECT total_value, holdings_count FROM portfolios_simple WHERE client_id = $1',
                [clientId]
            );

            const portfolios = portfoliosResult.rows;
            const totalAUM = portfolios.reduce((sum, p) => sum + parseFloat(p.total_value || 0), 0);
            const totalHoldings = portfolios.reduce((sum, p) => sum + parseInt(p.holdings_count || 0), 0);

            // Update client
            await pool.query(
                `UPDATE clients
                 SET total_aum = $1, total_holdings = $2, last_calculated_at = NOW()
                 WHERE id = $3`,
                [totalAUM, totalHoldings, clientId]
            );

            console.log(`✓ Client ${clientId}: $${totalAUM.toFixed(2)} AUM (${totalHoldings} holdings)`);

            return {
                clientId,
                totalAUM,
                totalHoldings,
                portfolioCount: portfolios.length
            };
        } catch (error) {
            console.error(`Error recalculating client ${clientId}:`, error);
            throw error;
        }
    }

    /**
     * Recalculate solo user (agency) AUM
     * Returns portfolios with no client_id
     */
    async recalculateSoloUser() {
        try {
            const result = await pool.query(
                `SELECT
                    SUM(total_value) as total_aum,
                    SUM(holdings_count) as total_holdings,
                    COUNT(*) as portfolio_count
                 FROM portfolios_simple
                 WHERE client_id IS NULL`
            );

            const stats = result.rows[0];

            console.log(`✓ Solo User (Agency): $${parseFloat(stats.total_aum || 0).toFixed(2)} AUM (${stats.total_holdings || 0} holdings)`);

            return {
                totalAUM: parseFloat(stats.total_aum || 0),
                totalHoldings: parseInt(stats.total_holdings || 0),
                portfolioCount: parseInt(stats.portfolio_count || 0)
            };
        } catch (error) {
            console.error('Error recalculating solo user AUM:', error);
            throw error;
        }
    }

    /**
     * Recalculate all portfolios and clients
     * Use for initial setup or full recalculation
     */
    async recalculateAll() {
        try {
            console.log('🔄 Starting full AUM recalculation...');

            // Step 1: Recalculate all portfolios
            const portfoliosResult = await pool.query('SELECT id FROM portfolios_simple');
            const portfolios = portfoliosResult.rows;

            console.log(`📊 Recalculating ${portfolios.length} portfolios...`);
            for (const portfolio of portfolios) {
                await this.recalculatePortfolio(portfolio.id);
            }

            // Step 2: Recalculate all clients
            const clientsResult = await pool.query('SELECT id FROM clients');
            const clients = clientsResult.rows;

            console.log(`👥 Recalculating ${clients.length} clients...`);
            for (const client of clients) {
                await this.recalculateClient(client.id);
            }

            // Step 3: Recalculate solo user
            console.log('🏢 Recalculating solo user (agency)...');
            const soloStats = await this.recalculateSoloUser();

            console.log('✅ Full recalculation complete!');

            return {
                portfoliosUpdated: portfolios.length,
                clientsUpdated: clients.length,
                soloUserStats: soloStats
            };
        } catch (error) {
            console.error('Error in full recalculation:', error);
            throw error;
        }
    }

    /**
     * Recalculate after portfolio upload/update
     * Updates portfolio, then updates client if applicable
     */
    async recalculateAfterPortfolioChange(portfolioId) {
        try {
            const portfolioStats = await this.recalculatePortfolio(portfolioId);

            if (portfolioStats && portfolioStats.clientId) {
                // Portfolio belongs to a client, recalculate client
                await this.recalculateClient(portfolioStats.clientId);
            }

            return portfolioStats;
        } catch (error) {
            console.error('Error in recalculateAfterPortfolioChange:', error);
            throw error;
        }
    }

    /**
     * Recalculate after portfolio deletion
     * Only updates client if applicable (portfolio already deleted)
     */
    async recalculateAfterPortfolioDeletion(clientId) {
        try {
            if (clientId) {
                await this.recalculateClient(clientId);
            }
        } catch (error) {
            console.error('Error in recalculateAfterPortfolioDeletion:', error);
            throw error;
        }
    }

    /**
     * Get overall statistics
     */
    async getOverallStats() {
        try {
            const result = await pool.query(`
                SELECT
                    COUNT(DISTINCT id) as total_portfolios,
                    COUNT(DISTINCT client_id) as total_clients,
                    SUM(total_value) as total_aum,
                    SUM(holdings_count) as total_holdings
                FROM portfolios_simple
            `);

            const stats = result.rows[0];

            return {
                totalPortfolios: parseInt(stats.total_portfolios || 0),
                totalClients: parseInt(stats.total_clients || 0),
                totalAUM: parseFloat(stats.total_aum || 0),
                totalHoldings: parseInt(stats.total_holdings || 0)
            };
        } catch (error) {
            console.error('Error getting overall stats:', error);
            throw error;
        }
    }
}

module.exports = new AUMCalculator();
