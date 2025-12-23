/**
 * FinFeed API Integration
 * Aggregator for prediction markets (Polymarket, Kalshi, Myriad, Manifold)
 * API Key: c68131c9-c89c-46ac-bf26-da33e48b9686
 */

class FinFeedAPI {
    constructor(apiKey) {
        this.apiKey = apiKey || 'c68131c9-c89c-46ac-bf26-da33e48b9686';
        this.baseUrl = 'https://api.finfeedapi.com/v1';
    }

    /**
     * Search prediction markets for specific entities/topics
     * @param {Array<string>} entities - Stock tickers, companies, topics
     * @param {string} timeframe - Time period for predictions
     * @returns {Promise<Object>} Prediction market data
     */
    async searchPredictions(entities, timeframe = 'unspecified') {
        console.log('🎲 FinFeedAPI: Searching prediction markets for:', entities);

        try {
            const results = {
                markets: [],
                sources: [],
                timestamp: new Date().toISOString()
            };

            // Search for each entity
            for (const entity of entities) {
                const entityMarkets = await this.fetchMarketsForEntity(entity);
                if (entityMarkets && entityMarkets.length > 0) {
                    results.markets.push(...entityMarkets);
                }
            }

            // Deduplicate and sort by volume/relevance
            results.markets = this.deduplicateMarkets(results.markets);
            results.sources = [...new Set(results.markets.map(m => m.source))];

            console.log(`✅ Found ${results.markets.length} prediction markets from ${results.sources.length} sources`);
            return results;

        } catch (error) {
            console.error('❌ FinFeedAPI error:', error.message);
            return {
                markets: [],
                sources: [],
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Fetch prediction markets for a specific entity
     */
    async fetchMarketsForEntity(entity) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            // FinFeedAPI endpoint for prediction markets
            const url = `${this.baseUrl}/predictions/search?query=${encodeURIComponent(entity)}&limit=10`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // If API fails, return empty (graceful degradation)
                console.warn(`⚠️ FinFeedAPI returned ${response.status} for ${entity}`);
                return [];
            }

            const data = await response.json();

            // Parse and normalize the response
            return this.normalizeMarkets(data, entity);

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                console.warn(`⚠️ FinFeedAPI timeout for ${entity}`);
            } else {
                console.warn(`⚠️ FinFeedAPI error for ${entity}:`, error.message);
            }

            return [];
        }
    }

    /**
     * Normalize market data from different sources
     */
    normalizeMarkets(data, entity) {
        const markets = [];

        // Handle different API response formats
        const marketList = data.markets || data.data || data.results || [];

        marketList.forEach(market => {
            markets.push({
                question: market.question || market.title || market.name,
                probability: market.probability || market.price || market.odds,
                volume: market.volume || market.liquidity || 'N/A',
                source: market.source || market.platform || 'Unknown',
                url: market.url || market.link,
                lastUpdated: market.lastUpdated || market.updatedAt,
                entity: entity
            });
        });

        return markets;
    }

    /**
     * Deduplicate similar markets
     */
    deduplicateMarkets(markets) {
        const seen = new Set();
        const unique = [];

        markets.forEach(market => {
            const key = `${market.question?.toLowerCase()}-${market.source}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(market);
            }
        });

        // Sort by volume (if available) or keep original order
        return unique.sort((a, b) => {
            const volA = typeof a.volume === 'number' ? a.volume : 0;
            const volB = typeof b.volume === 'number' ? b.volume : 0;
            return volB - volA;
        });
    }

    /**
     * Get prediction markets summary for display
     */
    formatForDisplay(predictionData) {
        if (!predictionData || !predictionData.markets || predictionData.markets.length === 0) {
            return 'No prediction market data available.';
        }

        let summary = `**Prediction Markets (${predictionData.markets.length} found)**\n\n`;

        predictionData.markets.slice(0, 5).forEach((market, idx) => {
            summary += `${idx + 1}. ${market.question}\n`;
            summary += `   - Probability: ${this.formatProbability(market.probability)}\n`;
            summary += `   - Volume: ${market.volume}\n`;
            summary += `   - Source: ${market.source}\n\n`;
        });

        return summary;
    }

    /**
     * Format probability for display
     */
    formatProbability(prob) {
        if (typeof prob === 'number') {
            return `${(prob * 100).toFixed(1)}%`;
        }
        return prob || 'N/A';
    }
}

module.exports = FinFeedAPI;
