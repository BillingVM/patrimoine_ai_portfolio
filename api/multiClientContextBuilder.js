/**
 * Multi-Client Context Builder
 * Builds hierarchical context for multi-client/multi-portfolio queries
 */

const { pool } = require('./db');
const aumCalculator = require('./aumCalculator');

class MultiClientContextBuilder {
    /**
     * Build complete context hierarchy
     * Fetches all clients, portfolios, and optionally parses holdings
     */
    async buildContext(options = {}) {
        const {
            includeHoldings = false,  // Parse holdings for all portfolios
            filterClients = null,      // Array of client IDs to include
            filterPortfolios = null,   // Array of portfolio IDs to include
            filterStocks = null        // Array of stock symbols to filter by
        } = options;

        try {
            // Step 1: Fetch all clients
            const clientsResult = await pool.query(`
                SELECT id, name, entity_type, email, phone, total_aum, total_holdings, created_at
                FROM clients
                ORDER BY total_aum DESC NULLS LAST, name ASC
            `);

            let clients = clientsResult.rows;

            // Apply client filter if specified
            if (filterClients && filterClients.length > 0) {
                clients = clients.filter(c => filterClients.includes(c.id));
            }

            // Step 2: Fetch all portfolios
            const portfoliosResult = await pool.query(`
                SELECT
                    p.id,
                    p.portfolio_name,
                    p.client_id,
                    p.total_value,
                    p.holdings_count,
                    p.file_type,
                    p.uploaded_at,
                    p.raw_data,
                    c.name as client_name
                FROM portfolios_simple p
                LEFT JOIN clients c ON p.client_id = c.id
                ORDER BY p.total_value DESC NULLS LAST
            `);

            let portfolios = portfoliosResult.rows;

            // Apply portfolio filter if specified
            if (filterPortfolios && filterPortfolios.length > 0) {
                portfolios = portfolios.filter(p => filterPortfolios.includes(p.id));
            }

            // Step 3: Separate solo portfolios (no client_id)
            const soloPortfolios = portfolios.filter(p => !p.client_id);
            const clientPortfolios = portfolios.filter(p => p.client_id);

            // Step 4: Group portfolios by client
            const portfoliosByClient = {};
            clientPortfolios.forEach(portfolio => {
                if (!portfoliosByClient[portfolio.client_id]) {
                    portfoliosByClient[portfolio.client_id] = [];
                }

                // Parse holdings if requested or if filtering by stocks
                if (includeHoldings || filterStocks) {
                    portfolio.holdings = aumCalculator.parseHoldings(portfolio.raw_data);

                    // Filter holdings by stock symbols if specified
                    if (filterStocks && filterStocks.length > 0) {
                        portfolio.holdings = portfolio.holdings.filter(h =>
                            filterStocks.some(symbol =>
                                h.ticker.toUpperCase() === symbol.toUpperCase()
                            )
                        );

                        // Skip portfolios with no matching holdings
                        if (portfolio.holdings.length === 0) {
                            return;
                        }
                    }
                }

                // Don't include raw_data in final context (too large)
                delete portfolio.raw_data;

                portfoliosByClient[portfolio.client_id].push(portfolio);
            });

            // Step 5: Attach portfolios to clients
            clients = clients.map(client => ({
                ...client,
                portfolios: portfoliosByClient[client.id] || []
            }));

            // Step 6: Parse holdings for solo portfolios
            if (includeHoldings || filterStocks) {
                soloPortfolios.forEach(portfolio => {
                    portfolio.holdings = aumCalculator.parseHoldings(portfolio.raw_data);

                    if (filterStocks && filterStocks.length > 0) {
                        portfolio.holdings = portfolio.holdings.filter(h =>
                            filterStocks.some(symbol =>
                                h.ticker.toUpperCase() === symbol.toUpperCase()
                            )
                        );
                    }

                    delete portfolio.raw_data;
                });
            }

            // Step 7: Calculate summary statistics
            const totalAUM = clients.reduce((sum, c) => sum + parseFloat(c.total_aum || 0), 0)
                + soloPortfolios.reduce((sum, p) => sum + parseFloat(p.total_value || 0), 0);

            const totalHoldings = clients.reduce((sum, c) => sum + parseInt(c.total_holdings || 0), 0)
                + soloPortfolios.reduce((sum, p) => sum + parseInt(p.holdings_count || 0), 0);

            const totalPortfolios = clientPortfolios.length + soloPortfolios.length;

            const context = {
                summary: {
                    totalClients: clients.length,
                    totalPortfolios,
                    totalAUM,
                    totalHoldings,
                    soloPortfolios: soloPortfolios.length,
                    timestamp: new Date().toISOString()
                },
                clients,
                soloPortfolios
            };

            return context;
        } catch (error) {
            console.error('Error building multi-client context:', error);
            throw error;
        }
    }

    /**
     * Detect entities in user message
     * Extracts client names, portfolio names, and stock symbols
     */
    detectEntities(message, context) {
        const entities = {
            clients: [],
            portfolios: [],
            stocks: []
        };

        const messageLower = message.toLowerCase();

        // Detect client names
        context.clients.forEach(client => {
            const nameLower = client.name.toLowerCase();
            const firstNameLower = client.name.split(' ')[0].toLowerCase();

            if (messageLower.includes(nameLower) || messageLower.includes(firstNameLower)) {
                entities.clients.push({
                    id: client.id,
                    name: client.name
                });
            }
        });

        // Detect portfolio names
        context.clients.forEach(client => {
            client.portfolios.forEach(portfolio => {
                if (portfolio.portfolio_name) {
                    const portNameLower = portfolio.portfolio_name.toLowerCase();
                    if (messageLower.includes(portNameLower)) {
                        entities.portfolios.push({
                            id: portfolio.id,
                            name: portfolio.portfolio_name,
                            clientId: client.id,
                            clientName: client.name
                        });
                    }
                }
            });
        });

        // Detect solo portfolio names
        context.soloPortfolios.forEach(portfolio => {
            if (portfolio.portfolio_name) {
                const portNameLower = portfolio.portfolio_name.toLowerCase();
                if (messageLower.includes(portNameLower)) {
                    entities.portfolios.push({
                        id: portfolio.id,
                        name: portfolio.portfolio_name,
                        clientId: null,
                        clientName: 'Solo/Agency'
                    });
                }
            }
        });

        // Detect common stock symbols (basic detection)
        const commonStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD', 'NFLX', 'DIS'];
        commonStocks.forEach(symbol => {
            if (messageLower.includes(symbol.toLowerCase())) {
                entities.stocks.push(symbol);
            }
        });

        return entities;
    }

    /**
     * Detect query scope
     */
    detectScope(message, entities) {
        const messageLower = message.toLowerCase();

        // Keywords for different scopes
        const allClientsKeywords = ['all clients', 'total', 'overall', 'aggregate', 'entire portfolio', 'whole'];
        const comparisonKeywords = ['compare', 'versus', 'vs', 'better', 'worse', 'difference between'];
        const soloKeywords = ['my portfolio', 'agency', 'solo', 'our portfolio'];

        // Detect comparison
        if (comparisonKeywords.some(kw => messageLower.includes(kw))) {
            return 'comparison';
        }

        // Detect solo
        if (soloKeywords.some(kw => messageLower.includes(kw)) && entities.clients.length === 0) {
            return 'solo';
        }

        // Detect specific client
        if (entities.clients.length === 1 && entities.portfolios.length === 0) {
            return 'specific_client';
        }

        // Detect specific portfolio
        if (entities.portfolios.length === 1) {
            return 'specific_portfolio';
        }

        // Detect multiple clients
        if (entities.clients.length > 1) {
            return 'multiple_clients';
        }

        // Detect all clients
        if (allClientsKeywords.some(kw => messageLower.includes(kw))) {
            return 'all_clients';
        }

        // Default to all clients if no specific entities mentioned
        if (entities.clients.length === 0 && entities.portfolios.length === 0) {
            return 'all_clients';
        }

        return 'all_clients';
    }

    /**
     * Build filtered context based on detected scope and entities
     */
    async buildFilteredContext(message) {
        // First build full context without holdings
        const fullContext = await this.buildContext({ includeHoldings: false });

        // Detect entities
        const entities = this.detectEntities(message, fullContext);

        // Detect scope
        const scope = this.detectScope(message, entities);

        // Build filtered context with holdings only for relevant entities
        const filterOptions = {
            includeHoldings: true
        };

        // Apply filters based on scope
        if (scope === 'specific_client' && entities.clients.length > 0) {
            filterOptions.filterClients = entities.clients.map(c => c.id);
        } else if (scope === 'specific_portfolio' && entities.portfolios.length > 0) {
            filterOptions.filterPortfolios = entities.portfolios.map(p => p.id);
        } else if (scope === 'multiple_clients' && entities.clients.length > 0) {
            filterOptions.filterClients = entities.clients.map(c => c.id);
        }

        // Apply stock filter if stocks mentioned
        if (entities.stocks.length > 0) {
            filterOptions.filterStocks = entities.stocks;
        }

        const filteredContext = await this.buildContext(filterOptions);

        return {
            scope,
            entities,
            context: filteredContext
        };
    }
}

module.exports = new MultiClientContextBuilder();
