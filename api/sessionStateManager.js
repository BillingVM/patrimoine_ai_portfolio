/**
 * Session State Manager
 * Manages structured financial data cache with timestamps
 * Allows SPA to decide whether to refresh data based on age
 */

class SessionStateManager {
    constructor() {
        // Default TTL (time-to-live) for different data types
        this.TTL = {
            prices: 5 * 60 * 1000,        // 5 minutes (market data changes frequently)
            holdings: 24 * 60 * 60 * 1000, // 24 hours (user portfolio doesn't change often)
            portfolioValue: 5 * 60 * 1000, // 5 minutes (recalculate with fresh prices)
            fundamentals: 60 * 60 * 1000   // 1 hour (company metrics change slowly)
        };
    }

    /**
     * Initialize a new session state
     * @returns {Object} Empty state structure
     */
    initializeState() {
        return {
            prices: {},
            holdings: {},
            portfolioValue: null,
            fundamentals: {},
            metadata: {
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                version: 1
            }
        };
    }

    /**
     * Update prices in state with timestamps
     * @param {Object} state - Current state
     * @param {Object} prices - New prices { AAPL: { price: 272.36, source: 'api' } }
     * @returns {Object} Updated state
     */
    updatePrices(state, prices) {
        const now = new Date().toISOString();

        if (!state.prices) state.prices = {};

        Object.entries(prices).forEach(([ticker, data]) => {
            state.prices[ticker] = {
                price: data.price,
                timestamp: now,
                source: data.source || 'api',
                confirmed: data.confirmed || false,
                updatedAt: now,
                changePercent: data.changePercent,
                previousPrice: state.prices[ticker]?.price || null
            };
        });

        state.metadata.lastUpdated = now;
        return state;
    }

    /**
     * Update holdings in state with timestamps
     * @param {Object} state - Current state
     * @param {Object} holdings - New holdings { AAPL: { shares: 100, source: 'ocr' } }
     * @returns {Object} Updated state
     */
    updateHoldings(state, holdings) {
        const now = new Date().toISOString();

        if (!state.holdings) state.holdings = {};

        Object.entries(holdings).forEach(([ticker, data]) => {
            state.holdings[ticker] = {
                shares: data.shares,
                companyName: data.companyName,
                timestamp: now,
                source: data.source || 'ocr',
                confirmed: data.confirmed || false,
                updatedAt: now,
                previousShares: state.holdings[ticker]?.shares || null
            };
        });

        state.metadata.lastUpdated = now;
        return state;
    }

    /**
     * Update portfolio value in state
     * @param {Object} state - Current state
     * @param {number} value - Total portfolio value
     * @param {Array} calculatedFrom - Tickers used in calculation
     * @returns {Object} Updated state
     */
    updatePortfolioValue(state, value, calculatedFrom = []) {
        const now = new Date().toISOString();

        state.portfolioValue = {
            value: value,
            timestamp: now,
            calculatedFrom: calculatedFrom,
            updatedAt: now,
            previousValue: state.portfolioValue?.value || null
        };

        state.metadata.lastUpdated = now;
        return state;
    }

    /**
     * Update fundamentals (P/E, market cap, etc.)
     * @param {Object} state - Current state
     * @param {Object} fundamentals - { AAPL: { pe: 33.8, marketCap: 3.7T } }
     * @returns {Object} Updated state
     */
    updateFundamentals(state, fundamentals) {
        const now = new Date().toISOString();

        if (!state.fundamentals) state.fundamentals = {};

        Object.entries(fundamentals).forEach(([ticker, metrics]) => {
            state.fundamentals[ticker] = {
                ...metrics,
                timestamp: now,
                updatedAt: now
            };
        });

        state.metadata.lastUpdated = now;
        return state;
    }

    /**
     * Check if data is stale and needs refresh
     * @param {Object} stateData - State data object with timestamp
     * @param {string} dataType - Type of data (prices, holdings, etc.)
     * @returns {boolean} True if data is stale
     */
    isStale(stateData, dataType) {
        if (!stateData || !stateData.timestamp) return true;

        const age = Date.now() - new Date(stateData.timestamp).getTime();
        const ttl = this.TTL[dataType] || this.TTL.prices;

        return age > ttl;
    }

    /**
     * Get fresh data needed based on staleness
     * @param {Object} state - Current state
     * @param {Array} requestedTickers - Tickers needed
     * @returns {Object} { needsRefresh: boolean, stale: [], fresh: [] }
     */
    getRefreshNeeds(state, requestedTickers) {
        const stale = [];
        const fresh = [];

        requestedTickers.forEach(ticker => {
            const priceData = state.prices?.[ticker];

            if (!priceData || this.isStale(priceData, 'prices')) {
                stale.push(ticker);
            } else {
                fresh.push(ticker);
            }
        });

        return {
            needsRefresh: stale.length > 0,
            stale,
            fresh,
            allFresh: stale.length === 0
        };
    }

    /**
     * Merge new data with existing state (preserves old data)
     * @param {Object} state - Current state
     * @param {Object} newData - New data from extraction/API
     * @returns {Object} Merged state
     */
    mergeData(state, newData) {
        const now = new Date().toISOString();

        // Initialize if empty
        if (!state || Object.keys(state).length === 0) {
            state = this.initializeState();
        }

        // Merge prices
        if (newData.prices) {
            this.updatePrices(state, newData.prices);
        }

        // Merge holdings
        if (newData.holdings) {
            this.updateHoldings(state, newData.holdings);
        }

        // Merge fundamentals
        if (newData.fundamentals) {
            this.updateFundamentals(state, newData.fundamentals);
        }

        // Merge portfolio value
        if (newData.portfolioValue) {
            this.updatePortfolioValue(
                state,
                newData.portfolioValue.value,
                newData.portfolioValue.calculatedFrom
            );
        }

        state.metadata.lastUpdated = now;
        return state;
    }

    /**
     * Format state for SPA prompt inclusion
     * @param {Object} state - Session state
     * @returns {string} Formatted text for AI prompt
     */
    formatForPrompt(state) {
        if (!state || Object.keys(state).length === 0) {
            return '';
        }

        let formatted = '\n## Session State (Known Data)\n';
        formatted += `**Last Updated**: ${new Date(state.metadata?.lastUpdated).toLocaleString()}\n\n`;

        // Prices
        if (state.prices && Object.keys(state.prices).length > 0) {
            formatted += '### Stock Prices (Cached)\n';
            Object.entries(state.prices).forEach(([ticker, data]) => {
                const age = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000 / 60);
                const stale = this.isStale(data, 'prices');

                formatted += `**${ticker}**: $${data.price}`;
                formatted += ` (${age}min ago${stale ? ' ⚠️ STALE' : ' ✓ FRESH'})`;
                formatted += ` [source: ${data.source}]\n`;
            });
            formatted += '\n';
        }

        // Holdings
        if (state.holdings && Object.keys(state.holdings).length > 0) {
            formatted += '### Portfolio Holdings (Cached)\n';
            formatted += '**CRITICAL: These are your known holdings. DO NOT change these values.**\n\n';
            Object.entries(state.holdings).forEach(([ticker, data]) => {
                const age = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000 / 60);

                formatted += `**${ticker}**: ${data.shares} shares`;
                if (data.companyName) formatted += ` (${data.companyName})`;
                formatted += ` [${data.source}, ${age}min ago]\n`;
            });
            formatted += '\n';
        }

        // Portfolio Value
        if (state.portfolioValue) {
            const age = Math.floor((Date.now() - new Date(state.portfolioValue.timestamp).getTime()) / 1000 / 60);
            formatted += '### Portfolio Total Value (Cached)\n';
            formatted += `**Total**: $${state.portfolioValue.value.toLocaleString()}`;
            formatted += ` (calculated ${age}min ago)\n`;
            formatted += `Based on: ${state.portfolioValue.calculatedFrom?.join(', ') || 'N/A'}\n\n`;
        }

        return formatted;
    }

    /**
     * Log state for debugging
     * @param {Object} state - Session state
     */
    logState(state) {
        if (!state || Object.keys(state).length === 0) {
            console.log('📦 Session State: Empty');
            return;
        }

        console.log('📦 Session State Summary:');
        console.log(`   Prices: ${Object.keys(state.prices || {}).length} tickers`);
        console.log(`   Holdings: ${Object.keys(state.holdings || {}).length} positions`);
        console.log(`   Portfolio Value: ${state.portfolioValue ? `$${state.portfolioValue.value.toLocaleString()}` : 'None'}`);
        console.log(`   Last Updated: ${state.metadata?.lastUpdated || 'Never'}`);

        // Show staleness
        if (state.prices) {
            const prices = Object.keys(state.prices);
            const refreshNeeds = this.getRefreshNeeds(state, prices);
            if (refreshNeeds.stale.length > 0) {
                console.log(`   ⚠️ Stale prices: ${refreshNeeds.stale.join(', ')}`);
            }
        }
    }
}

module.exports = SessionStateManager;
