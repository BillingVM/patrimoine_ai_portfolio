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
     * Gather all relevant data based on unified context
     * @param {Object} context - Unified context from UnifiedContextAnalyzer
     * @param {string} userPrompt - Original user prompt
     * @param {Object} knownData - Data from conversation history (optional)
     * @returns {Promise<Object>} Gathered data from all sources
     */
    async gatherData(context, userPrompt, knownData = null) {
        console.log('📊 DataGatherer: Starting smart data collection...');

        const { entities, needsData, intent } = context;
        const startTime = Date.now();

        // Filter out entities we already have data for
        let entitiesToFetch = entities;
        if (knownData && knownData.stockPrices) {
            const knownTickers = Object.keys(knownData.stockPrices);
            const newEntities = entities.filter(e => !knownTickers.includes(e.toUpperCase()));

            if (newEntities.length < entities.length) {
                console.log(`♻️ Using ${knownTickers.length} prices from conversation history`);
                console.log(`   Known: ${knownTickers.join(', ')}`);
                console.log(`   Fetching fresh: ${newEntities.length > 0 ? newEntities.join(', ') : 'none'}`);
                entitiesToFetch = newEntities;
            }
        }

        const tasks = [];
        const gatheredData = {
            prices: null,
            fundamentals: null,
            holdings: null,
            news: null,
            earnings: null,
            insiderTrading: null,
            secFilings: null,
            institutionalHoldings: null,
            predictionMarkets: null,
            webSearch: null,
            metadata: {
                entities,
                intents: intent?.intents || [],
                timeframe: intent?.timeframe,
                duration: 0,
                timestamp: new Date().toISOString()
            }
        };

        // Only fetch data if we have entities to fetch
        if (!entitiesToFetch || entitiesToFetch.length === 0) {
            if (knownData && Object.keys(knownData.stockPrices || {}).length > 0) {
                console.log('✅ All data available from conversation history, skipping API calls');
                // Merge known data into gatheredData
                gatheredData.prices = this.convertKnownDataToPrices(knownData.stockPrices);
                gatheredData.metadata.fromConversation = true;
                gatheredData.metadata.duration = Date.now() - startTime;
                return gatheredData;
            } else {
                console.log('⚠️ No entities detected, skipping data gathering');
                return gatheredData;
            }
        }

        console.log(`📋 Data plan: ${Object.entries(needsData).filter(([_, v]) => v).map(([k]) => k).join(', ')}`);

        // Prices (current market prices)
        if (needsData.prices) {
            tasks.push(
                this.getPrices(entitiesToFetch).catch(err => {
                    console.warn('⚠️ Prices error:', err.message);
                    return null;
                }).then(result => { gatheredData.prices = result; })
            );
        }

        // Fundamentals (financial metrics)
        if (needsData.fundamentals) {
            tasks.push(
                this.getFundamentals(entitiesToFetch).catch(err => {
                    console.warn('⚠️ Fundamentals error:', err.message);
                    return null;
                }).then(result => { gatheredData.fundamentals = result; })
            );
        }

        // News
        if (needsData.news) {
            tasks.push(
                this.getNews(entitiesToFetch).catch(err => {
                    console.warn('⚠️ News error:', err.message);
                    return null;
                }).then(result => { gatheredData.news = result; })
            );
        }

        // Earnings
        if (needsData.earnings) {
            tasks.push(
                this.getEarnings(entitiesToFetch).catch(err => {
                    console.warn('⚠️ Earnings error:', err.message);
                    return null;
                }).then(result => { gatheredData.earnings = result; })
            );
        }

        // Insider Trading
        if (needsData.insiderTrading) {
            tasks.push(
                this.getInsiderTrading(entities).catch(err => {
                    console.warn('⚠️ Insider trading error:', err.message);
                    return null;
                }).then(result => { gatheredData.insiderTrading = result; })
            );
        }

        // SEC Filings
        if (needsData.secFilings) {
            tasks.push(
                this.getSECFilings(entities).catch(err => {
                    console.warn('⚠️ SEC filings error:', err.message);
                    return null;
                }).then(result => { gatheredData.secFilings = result; })
            );
        }

        // Institutional Holdings
        if (needsData.institutionalHoldings) {
            tasks.push(
                this.getInstitutionalHoldings(entities).catch(err => {
                    console.warn('⚠️ Institutional holdings error:', err.message);
                    return null;
                }).then(result => { gatheredData.institutionalHoldings = result; })
            );
        }

        // Prediction Markets (if prediction intent)
        if (intent?.intents?.includes('prediction')) {
            tasks.push(
                this.getPredictionMarkets(entities, intent.timeframe).catch(err => {
                    console.warn('⚠️ Prediction markets error:', err.message);
                    return null;
                }).then(result => { gatheredData.predictionMarkets = result; })
            );
        }

        // Web Search (if news intent or general)
        if (needsData.news || intent?.intents?.includes('general')) {
            tasks.push(
                this.getWebSearch(userPrompt, entities).catch(err => {
                    console.warn('⚠️ Web search error:', err.message);
                    return null;
                }).then(result => { gatheredData.webSearch = result; })
            );
        }

        // Execute all tasks in parallel
        await Promise.all(tasks);

        // Merge known data from conversation with freshly fetched data
        if (knownData && knownData.stockPrices && Object.keys(knownData.stockPrices).length > 0) {
            gatheredData.prices = this.mergeKnownAndFreshPrices(
                knownData.stockPrices,
                gatheredData.prices
            );
            gatheredData.metadata.usedConversationData = true;
            gatheredData.metadata.conversationTickers = Object.keys(knownData.stockPrices);
        }

        // Preserve holdings from conversation
        if (knownData && knownData.portfolioHoldings && Object.keys(knownData.portfolioHoldings).length > 0) {
            gatheredData.holdings = knownData.portfolioHoldings;
            console.log(`♻️ Preserved ${Object.keys(knownData.portfolioHoldings).length} holdings from conversation`);
            Object.entries(knownData.portfolioHoldings).forEach(([ticker, data]) => {
                console.log(`   ${ticker}: ${data.shares} shares`);
            });
        }

        gatheredData.metadata.duration = Date.now() - startTime;

        console.log(`✅ Data gathering complete in ${gatheredData.metadata.duration}ms`);
        this.logGatheredData(gatheredData);

        return gatheredData;
    }

    /**
     * Get current prices for entities
     */
    async getPrices(entities) {
        console.log('💰 Fetching current prices for:', entities);

        const prices = {};

        for (const entity of entities.slice(0, 5)) {
            try {
                console.log(`  → Fetching price for ${entity}...`);
                const priceData = await this.financialAPI.getStockPrice(entity);

                if (priceData && priceData.price) {
                    prices[entity] = {
                        ticker: entity,
                        price: priceData.price,
                        open: priceData.open,
                        high: priceData.high,
                        low: priceData.low,
                        volume: priceData.volume,
                        change: priceData.change,
                        changePercent: priceData.changePercent,
                        date: priceData.date,
                        timestamp: priceData.timestamp,
                        source: 'api',
                        fresh: true
                    };

                    console.log(`  ✓ ${entity}: $${priceData.price} (${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent}%)`);
                } else {
                    console.warn(`  ✗ No price data for ${entity}`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch price for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched prices for ${Object.keys(prices).length} entities`);
        return Object.keys(prices).length > 0 ? prices : null;
    }

    /**
     * Get fundamental financial metrics
     */
    async getFundamentals(entities) {
        console.log('📈 Fetching fundamentals for:', entities);

        const fundamentals = {};

        for (const entity of entities.slice(0, 5)) {
            try {
                console.log(`  → Fetching metrics for ${entity}...`);
                const metrics = await this.financialAPI.getFinancialMetrics(entity, 'ttm', 1);

                if (metrics && metrics.financial_metrics && metrics.financial_metrics.length > 0) {
                    const latestMetrics = metrics.financial_metrics[0];

                    fundamentals[entity] = {
                        marketCap: latestMetrics.market_cap || null,
                        pe: latestMetrics.price_to_earnings_ratio || null,
                        eps: latestMetrics.earnings_per_share_basic || null,
                        revenue: latestMetrics.revenue || null,
                        netIncome: latestMetrics.net_income || null,
                        roe: latestMetrics.return_on_equity || null,
                        debtToEquity: latestMetrics.debt_to_equity_ratio || null,
                        currentRatio: latestMetrics.current_ratio || null
                    };

                    console.log(`  ✓ ${entity}: Market Cap $${latestMetrics.market_cap}, P/E ${latestMetrics.price_to_earnings_ratio}`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch fundamentals for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched fundamentals for ${Object.keys(fundamentals).length} entities`);
        return Object.keys(fundamentals).length > 0 ? fundamentals : null;
    }

    /**
     * Get news for entities
     */
    async getNews(entities) {
        console.log('📰 Fetching news for:', entities);

        const allNews = [];

        for (const entity of entities.slice(0, 3)) {
            try {
                console.log(`  → Fetching news for ${entity}...`);
                const newsData = await this.financialAPI.getNews(entity, 5);

                if (newsData && newsData.news && newsData.news.length > 0) {
                    newsData.news.forEach(article => {
                        allNews.push({
                            ticker: entity,
                            title: article.title,
                            summary: article.summary || article.text,
                            url: article.url,
                            publishedAt: article.published_utc,
                            source: article.publisher?.name || 'Unknown'
                        });
                    });
                    console.log(`  ✓ ${entity}: ${newsData.news.length} articles`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch news for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched ${allNews.length} news articles`);
        return allNews.length > 0 ? allNews : null;
    }

    /**
     * Get earnings data for entities
     */
    async getEarnings(entities) {
        console.log('💼 Fetching earnings for:', entities);

        const earnings = {};

        for (const entity of entities.slice(0, 3)) {
            try {
                console.log(`  → Fetching earnings for ${entity}...`);

                const [pressReleases, estimates] = await Promise.all([
                    this.financialAPI.getEarningsPressReleases(entity, 4).catch(() => null),
                    this.financialAPI.getAnalystEstimates(entity, 4).catch(() => null)
                ]);

                earnings[entity] = {
                    pressReleases: pressReleases?.earnings || [],
                    analystEstimates: estimates?.analyst_estimates || []
                };

                console.log(`  ✓ ${entity}: ${earnings[entity].pressReleases.length} releases, ${earnings[entity].analystEstimates.length} estimates`);
            } catch (error) {
                console.warn(`⚠️ Could not fetch earnings for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched earnings for ${Object.keys(earnings).length} entities`);
        return Object.keys(earnings).length > 0 ? earnings : null;
    }

    /**
     * Get insider trading for entities
     */
    async getInsiderTrading(entities) {
        console.log('👔 Fetching insider trading for:', entities);

        const insiderTrades = {};

        for (const entity of entities.slice(0, 3)) {
            try {
                console.log(`  → Fetching insider trades for ${entity}...`);
                const tradesData = await this.financialAPI.getInsiderTrading(entity, 20);

                if (tradesData && tradesData.insider_trades && tradesData.insider_trades.length > 0) {
                    insiderTrades[entity] = tradesData.insider_trades.map(trade => ({
                        name: trade.reporting_name,
                        title: trade.reporting_title,
                        transactionType: trade.transaction_type,
                        shares: trade.shares,
                        pricePerShare: trade.price_per_share,
                        value: trade.value,
                        date: trade.filing_date
                    }));

                    console.log(`  ✓ ${entity}: ${insiderTrades[entity].length} trades`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch insider trading for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched insider trading for ${Object.keys(insiderTrades).length} entities`);
        return Object.keys(insiderTrades).length > 0 ? insiderTrades : null;
    }

    /**
     * Get SEC filings for entities
     */
    async getSECFilings(entities) {
        console.log('📋 Fetching SEC filings for:', entities);

        const filings = {};

        for (const entity of entities.slice(0, 3)) {
            try {
                console.log(`  → Fetching SEC filings for ${entity}...`);
                const filingsData = await this.financialAPI.getSECFilings(entity, null, 10);

                if (filingsData && filingsData.filings && filingsData.filings.length > 0) {
                    filings[entity] = filingsData.filings.map(filing => ({
                        type: filing.form_type,
                        description: filing.filing_type_description,
                        filingDate: filing.filing_date,
                        url: filing.filing_url
                    }));

                    console.log(`  ✓ ${entity}: ${filings[entity].length} filings`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch SEC filings for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched SEC filings for ${Object.keys(filings).length} entities`);
        return Object.keys(filings).length > 0 ? filings : null;
    }

    /**
     * Get institutional holdings for entities
     */
    async getInstitutionalHoldings(entities) {
        console.log('🏦 Fetching institutional holdings for:', entities);

        const holdings = {};

        for (const entity of entities.slice(0, 3)) {
            try {
                console.log(`  → Fetching institutional holdings for ${entity}...`);
                const holdingsData = await this.financialAPI.getInstitutionalHoldings(entity, 20);

                if (holdingsData && holdingsData.institutional_holdings && holdingsData.institutional_holdings.length > 0) {
                    holdings[entity] = holdingsData.institutional_holdings.map(holder => ({
                        name: holder.holder_name,
                        shares: holder.shares,
                        value: holder.value,
                        percentOwned: holder.percent_of_shares_outstanding
                    }));

                    console.log(`  ✓ ${entity}: ${holdings[entity].length} institutional holders`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch institutional holdings for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched institutional holdings for ${Object.keys(holdings).length} entities`);
        return Object.keys(holdings).length > 0 ? holdings : null;
    }

    /**
     * LEGACY: Get fundamental financial data (kept for compatibility)
     */
    async getFundamentalData(entities) {
        console.log('📈 Fetching fundamental data for:', entities);

        const fundamentals = {};

        // Get data for each entity (limit to 5 to avoid too many API calls)
        for (const entity of entities.slice(0, 5)) {
            try {
                console.log(`  → Fetching price for ${entity}...`);
                // Try to get price first
                const priceData = await this.financialAPI.getStockPrice(entity);

                if (priceData && priceData.price) {
                    fundamentals[entity] = {
                        price: priceData.price,
                        open: priceData.open,
                        high: priceData.high,
                        low: priceData.low,
                        volume: priceData.volume,
                        change: priceData.change,
                        changePercent: priceData.changePercent,
                        date: priceData.date,
                        timestamp: priceData.timestamp
                    };

                    console.log(`  ✓ ${entity}: $${priceData.price} (${priceData.changePercent >= 0 ? '+' : ''}${priceData.changePercent}%)`);

                    // Try to get additional metrics (market cap, P/E, etc.)
                    try {
                        console.log(`  → Fetching metrics for ${entity}...`);
                        const metrics = await this.financialAPI.getFinancialMetrics(entity, 'ttm', 1);

                        if (metrics && metrics.financial_metrics && metrics.financial_metrics.length > 0) {
                            const latestMetrics = metrics.financial_metrics[0];

                            // Extract key metrics
                            fundamentals[entity].marketCap = latestMetrics.market_cap || null;
                            fundamentals[entity].pe = latestMetrics.price_to_earnings_ratio || null;
                            fundamentals[entity].eps = latestMetrics.earnings_per_share_basic || null;
                            fundamentals[entity].revenue = latestMetrics.revenue || null;
                            fundamentals[entity].netIncome = latestMetrics.net_income || null;

                            console.log(`  ✓ Metrics: Market Cap $${latestMetrics.market_cap}, P/E ${latestMetrics.price_to_earnings_ratio}`);
                        }
                    } catch (metricsError) {
                        console.log(`  ⚠ Metrics unavailable for ${entity}`);
                        // Metrics are optional - continue without them
                    }
                } else {
                    console.warn(`  ✗ No price data for ${entity}`);
                }
            } catch (error) {
                console.warn(`⚠️ Could not fetch data for ${entity}:`, error.message);
            }
        }

        console.log(`✅ Fetched fundamental data for ${Object.keys(fundamentals).length} entities`);
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

        if (data.prices) {
            const count = Object.keys(data.prices).length;
            summary.push(`Prices: ${count} entities`);
        }

        if (data.holdings) {
            const count = Object.keys(data.holdings).length;
            summary.push(`Holdings: ${count} positions`);
        }

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

    /**
     * Convert known data from conversation to prices format
     * @param {Object} knownPrices - { AAPL: { price: 272.36, messageIndex: 1 } }
     * @returns {Object} Prices in standard format
     */
    convertKnownDataToPrices(knownPrices) {
        const prices = {};

        for (const [ticker, data] of Object.entries(knownPrices)) {
            prices[ticker] = {
                ticker: ticker,
                price: data.price,
                source: 'conversation',
                messageIndex: data.messageIndex
            };
        }

        return prices;
    }

    /**
     * Merge known prices from conversation with fresh API data
     * @param {Object} knownPrices - Prices from conversation history
     * @param {Object} freshPrices - Fresh prices from API
     * @returns {Object} Merged prices with provenance
     */
    mergeKnownAndFreshPrices(knownPrices, freshPrices) {
        const merged = {};

        // Add all known prices first
        for (const [ticker, data] of Object.entries(knownPrices)) {
            merged[ticker] = {
                ticker: ticker,
                price: data.price,
                source: 'conversation',
                messageIndex: data.messageIndex,
                preserved: true
            };
        }

        // Merge or update with fresh prices
        if (freshPrices) {
            for (const [ticker, data] of Object.entries(freshPrices)) {
                if (merged[ticker]) {
                    // We have both - check if price changed
                    const oldPrice = merged[ticker].price;
                    const newPrice = data.price;

                    if (Math.abs(oldPrice - newPrice) > 0.01) {
                        merged[ticker] = {
                            ticker: ticker,
                            price: newPrice,
                            previousPrice: oldPrice,
                            source: 'updated',
                            change: newPrice - oldPrice,
                            changePercent: ((newPrice - oldPrice) / oldPrice * 100).toFixed(2),
                            updated: true
                        };
                        console.log(`   📊 ${ticker}: $${oldPrice} → $${newPrice} (${merged[ticker].changePercent}%)`);
                    } else {
                        // Price confirmed, no change
                        merged[ticker].source = 'confirmed';
                        merged[ticker].confirmed = true;
                    }
                } else {
                    // New ticker from API
                    merged[ticker] = {
                        ...data,
                        source: 'api',
                        fresh: true
                    };
                }
            }
        }

        return merged;
    }
}

module.exports = DataGatherer;
