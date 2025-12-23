/**
 * Data Gatherer Orchestrator
 * Coordinates data collection from multiple sources in parallel
 * - FinancialDatasets API (existing)
 * - FinFeed API (prediction markets)
 * - Web Search (news & sentiment)
 */

const FinancialDatasetsAPI = require('./financialDatasets');
const FinFeedAPI = require('./finfeedApi');
const WebSearch = require('./webSearch');

class DataGatherer {
    constructor(config = {}) {
        this.financialAPI = new FinancialDatasetsAPI(config.financialApiKey);
        this.finfeedAPI = new FinFeedAPI(config.finfeedApiKey);
        this.webSearch = new WebSearch(config.webSearch || {});
    }

    /**
     * Gather all relevant data based on classification
     * @param {Object} classification - Intent classification result
     * @param {string} userPrompt - Original user prompt
     * @returns {Promise<Object>} Gathered data from all sources
     */
    async gatherData(classification, userPrompt) {
        console.log('📊 DataGatherer: Starting data collection...');

        const { intents, entities, timeframe } = classification;
        const startTime = Date.now();

        // Determine which data sources to query based on intent
        const tasks = [];

        // Always get fundamental data if entities detected
        if (entities && entities.length > 0) {
            tasks.push(
                this.getFundamentalData(entities).catch(err => {
                    console.warn('⚠️ Fundamental data error:', err.message);
                    return null;
                })
            );
        }

        // Get prediction markets for prediction intent
        if (intents.includes('prediction') && entities && entities.length > 0) {
            tasks.push(
                this.getPredictionMarkets(entities, timeframe).catch(err => {
                    console.warn('⚠️ Prediction markets error:', err.message);
                    return null;
                })
            );
        }

        // Get web search for news, analysis, or general queries
        if (intents.includes('news') || intents.includes('analysis') || intents.includes('general')) {
            tasks.push(
                this.getWebSearch(userPrompt, entities).catch(err => {
                    console.warn('⚠️ Web search error:', err.message);
                    return null;
                })
            );
        }

        // Execute all tasks in parallel
        const results = await Promise.all(tasks);

        // Organize results
        const gatheredData = {
            fundamentals: results[0] || null,
            predictionMarkets: results[1] || null,
            webSearch: results[2] || null,
            metadata: {
                entities,
                intents,
                timeframe,
                duration: Date.now() - startTime,
                timestamp: new Date().toISOString()
            }
        };

        console.log(`✅ Data gathering complete in ${gatheredData.metadata.duration}ms`);
        this.logGatheredData(gatheredData);

        return gatheredData;
    }

    /**
     * Get fundamental financial data
     */
    async getFundamentalData(entities) {
        console.log('📈 Fetching fundamental data for:', entities);

        const fundamentals = {};

        // Get data for each entity (typically just one, but can handle multiple)
        for (const entity of entities.slice(0, 3)) { // Limit to 3 to avoid too many API calls
            try {
                // Try to get price first
                const priceData = await this.financialAPI.getStockPrice(entity);

                if (priceData && priceData.price) {
                    fundamentals[entity] = {
                        price: priceData.price,
                        change: priceData.change,
                        changePercent: priceData.changePercent,
                        timestamp: priceData.timestamp
                    };

                    // Try to get additional metrics
                    try {
                        const metrics = await this.financialAPI.getFinancialMetrics(entity);
                        if (metrics) {
                            fundamentals[entity].metrics = metrics;
                        }
                    } catch (metricsError) {
                        // Metrics are optional
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch data for ${entity}:`, error.message);
            }
        }

        return Object.keys(fundamentals).length > 0 ? fundamentals : null;
    }

    /**
     * Get prediction market data
     */
    async getPredictionMarkets(entities, timeframe) {
        console.log('🎲 Fetching prediction markets for:', entities);

        const markets = await this.finfeedAPI.searchPredictions(entities, timeframe);

        return markets && markets.markets && markets.markets.length > 0 ? markets : null;
    }

    /**
     * Get web search results
     */
    async getWebSearch(userPrompt, entities = []) {
        console.log('🌐 Fetching web search results');

        // Build search query
        let query = userPrompt;

        // Enhance query with entities if available
        if (entities.length > 0) {
            query = `${entities.join(' ')} ${userPrompt}`;
        }

        // Limit query length
        if (query.length > 150) {
            query = query.substring(0, 150);
        }

        const results = await this.webSearch.search(query, 5);

        return results && results.length > 0 ? results : null;
    }

    /**
     * Log gathered data summary
     */
    logGatheredData(data) {
        const summary = [];

        if (data.fundamentals) {
            const count = Object.keys(data.fundamentals).length;
            summary.push(`Fundamentals: ${count} entities`);
        }

        if (data.predictionMarkets && data.predictionMarkets.markets) {
            summary.push(`Prediction Markets: ${data.predictionMarkets.markets.length} markets`);
        }

        if (data.webSearch && Array.isArray(data.webSearch)) {
            summary.push(`Web Search: ${data.webSearch.length} results`);
        }

        console.log(`📦 Gathered data: ${summary.join(', ')}`);
    }

    /**
     * Format all gathered data for AI prompt
     */
    formatForPrompt(gatheredData) {
        let formatted = '';

        if (gatheredData.fundamentals) {
            formatted += '\n**Fundamental Data:**\n';
            formatted += JSON.stringify(gatheredData.fundamentals, null, 2);
            formatted += '\n';
        }

        if (gatheredData.predictionMarkets) {
            formatted += '\n**Prediction Markets:**\n';
            formatted += this.finfeedAPI.formatForDisplay(gatheredData.predictionMarkets);
            formatted += '\n';
        }

        if (gatheredData.webSearch) {
            formatted += '\n**Recent News & Web Results:**\n';
            formatted += this.webSearch.formatForAI(gatheredData.webSearch);
            formatted += '\n';
        }

        return formatted || 'No additional data available.';
    }
}

module.exports = DataGatherer;
