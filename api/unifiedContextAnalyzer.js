/**
 * Unified Context Analyzer
 * Single source of truth for analyzing user query context
 * Combines: Portfolio detection + Intent classification + Entity extraction + Data needs decision
 */

const PortfolioContextDetector = require('./portfolioContextDetector');
const PortfolioResolver = require('./portfolioResolver');
const IntentClassifier = require('./intentClassifier');
const TickerNormalizer = require('./tickerNormalizer');

class UnifiedContextAnalyzer {
    constructor() {
        this.portfolioDetector = new PortfolioContextDetector();
        this.portfolioResolver = new PortfolioResolver();
        this.intentClassifier = new IntentClassifier();
        this.tickerNormalizer = new TickerNormalizer();
    }

    /**
     * Analyze complete context from user message
     * @param {string} message - User message
     * @param {Array} history - Conversation history
     * @param {number} userId - User ID
     * @param {number} explicitPortfolioId - Explicit portfolio ID from URL (optional)
     * @returns {Promise<Object>} Unified context object
     */
    async analyze(message, history = [], userId = 1, explicitPortfolioId = null) {
        console.log('\n🎯 UNIFIED CONTEXT ANALYSIS');
        console.log(`📝 Message: "${message.substring(0, 60)}..."`);
        if (explicitPortfolioId) {
            console.log(`🎯 EXPLICIT PORTFOLIO ID: ${explicitPortfolioId} (from URL parameter)`);
        }

        const context = {
            message,
            userId,
            portfolio: null,
            intent: null,
            entities: [],
            needsData: {
                prices: false,
                fundamentals: false,
                news: false,
                earnings: false,
                insiderTrading: false,
                secFilings: false,
                institutionalHoldings: false,
                screening: false
            },
            timestamp: new Date().toISOString()
        };

        // STEP 1: Portfolio Context Resolution
        console.log('\n📊 Step 1: Portfolio Context Resolution');

        // CRITICAL: If explicit portfolio ID provided, use it directly
        if (explicitPortfolioId) {
            console.log(`   ✓ Using EXPLICIT portfolio ID: ${explicitPortfolioId}`);
            const portfolioResolution = await this.portfolioResolver.resolve({
                isPortfolioRelated: true,
                scope: 'specific',
                identifiers: [{
                    type: 'id',
                    value: explicitPortfolioId,
                    referencedBy: 'url_parameter'
                }]
            }, userId);

            if (portfolioResolution.resolved && portfolioResolution.portfolios.length > 0) {
                context.portfolio = portfolioResolution;
                // Extract tickers from portfolio
                const portfolioTickers = new Set();
                if (portfolioResolution.portfolios) {
                    portfolioResolution.portfolios.forEach(p => {
                        if (p.tickers) {
                            p.tickers.forEach(t => portfolioTickers.add(t));
                        }
                    });
                }
                context.entities = Array.from(portfolioTickers);
                console.log(`   ✓ Explicit portfolio resolved: ${portfolioResolution.portfolios.length} portfolio(s)`);
                console.log(`   ✓ Portfolio tickers: ${context.entities.join(', ') || 'NONE (empty portfolio)'}`);

                // CRITICAL: Force skip auto-detection for explicit portfolio
                context.skipAutoDetection = true;
            } else {
                console.log(`   ⚠️ Explicit portfolio ${explicitPortfolioId} not found in database.`);
            }
        }

        // Only do auto-detection if no explicit portfolio AND not skipped
        if (!context.portfolio && !context.skipAutoDetection) {
            console.log('   → No explicit portfolio. Running auto-detection...');
            const portfolioDetection = this.portfolioDetector.detect(message, history);

            if (portfolioDetection.isPortfolioRelated) {
                console.log('   ✓ Portfolio-related query detected');
                const portfolioResolution = await this.portfolioResolver.resolve(portfolioDetection, userId);

                if (portfolioResolution.resolved) {
                    context.portfolio = portfolioResolution;

                    // Extract tickers from portfolio
                    const portfolioTickers = new Set();
                    if (portfolioResolution.portfolios) {
                        portfolioResolution.portfolios.forEach(p => {
                            if (p.tickers) {
                                p.tickers.forEach(t => portfolioTickers.add(t));
                            }
                        });
                    }
                    context.entities = Array.from(portfolioTickers);
                    console.log(`   ✓ Portfolio tickers: ${context.entities.join(', ')}`);
                }
            } else {
                console.log('   ⚬ Not portfolio-related');
            }
        }

        // STEP 2: Classify intent
        console.log('\n🧠 Step 2: Intent Classification');
        const classification = await this.intentClassifier.classify(message);
        context.intent = classification;

        // Normalize entities from intent classification
        const queryEntities = classification.entities || [];
        const normalizedQueryEntities = this.tickerNormalizer.normalizeAll(queryEntities);

        // Merge normalized entities from intent with portfolio tickers
        context.entities = [...new Set([...context.entities, ...normalizedQueryEntities])];

        console.log(`   ✓ Intents: ${classification.intents.join(', ')}`);
        console.log(`   ✓ Query entities (raw): ${queryEntities.join(', ') || 'none'}`);
        console.log(`   ✓ Query entities (normalized): ${normalizedQueryEntities.join(', ') || 'none'}`);
        console.log(`   ✓ Final merged entities: ${context.entities.join(', ')}`);

        // STEP 3: Decide what data is needed
        console.log('\n🔍 Step 3: Data Needs Decision');
        context.needsData = this.decideDataNeeds(message, classification, context.portfolio);

        const neededData = Object.entries(context.needsData)
            .filter(([key, value]) => value)
            .map(([key]) => key);

        console.log(`   ✓ Data needed: ${neededData.join(', ') || 'none'}`);

        console.log('\n✅ Unified context analysis complete');
        return context;
    }

    /**
     * Intelligently decide what data to fetch based on query analysis
     * @param {string} message - User message
     * @param {Object} classification - Intent classification result
     * @param {Object} portfolio - Portfolio context (if any)
     * @returns {Object} Data needs flags
     */
    decideDataNeeds(message, classification, portfolio) {
        const lower = message.toLowerCase();
        const intents = classification.intents || [];

        const needs = {
            prices: false,
            fundamentals: false,
            news: false,
            earnings: false,
            insiderTrading: false,
            secFilings: false,
            institutionalHoldings: false,
            screening: false
        };

        // Price indicators
        const priceKeywords = ['price', 'worth', 'value', 'cost', 'current', 'today', 'now', 'trading at', 'quote'];
        if (priceKeywords.some(kw => lower.includes(kw))) {
            needs.prices = true;
        }

        // For portfolio queries, always get prices if asking about value/performance
        if (portfolio && (lower.includes('value') || lower.includes('worth') || lower.includes('performance'))) {
            needs.prices = true;
        }

        // For analysis intent, get prices + fundamentals
        if (intents.includes('analysis')) {
            needs.prices = true;
            needs.fundamentals = true;
        }

        // For prediction intent, get everything
        if (intents.includes('prediction')) {
            needs.prices = true;
            needs.fundamentals = true;
            needs.news = true;
            needs.earnings = true;
        }

        // News indicators
        const newsKeywords = ['news', 'article', 'announcement', 'headline', 'update', 'latest', 'recent'];
        if (newsKeywords.some(kw => lower.includes(kw)) || intents.includes('news')) {
            needs.news = true;
        }

        // Earnings indicators
        const earningsKeywords = ['earning', 'revenue', 'profit', 'quarter', 'annual report', 'eps', 'estimate', 'forecast'];
        if (earningsKeywords.some(kw => lower.includes(kw))) {
            needs.earnings = true;
            needs.fundamentals = true;
        }

        // Insider trading indicators
        const insiderKeywords = ['insider', 'executive', 'ceo', 'cfo', 'director', 'buy', 'sell', 'purchase', 'trade'];
        const hasInsiderContext = insiderKeywords.some(kw => lower.includes(kw)) &&
                                 (lower.includes('insider') || lower.includes('executive'));
        if (hasInsiderContext) {
            needs.insiderTrading = true;
        }

        // SEC filings indicators
        const filingKeywords = ['filing', '10-k', '10-q', '8-k', 'sec', 'report', 'disclosure'];
        if (filingKeywords.some(kw => lower.includes(kw))) {
            needs.secFilings = true;
        }

        // Institutional holdings indicators
        const institutionalKeywords = ['institution', 'fund', 'hedge fund', 'owner', 'holder', 'who owns'];
        if (institutionalKeywords.some(kw => lower.includes(kw))) {
            needs.institutionalHoldings = true;
        }

        // Screening indicators
        const screeningKeywords = ['find', 'search', 'screen', 'filter', 'stocks that', 'companies with'];
        if (screeningKeywords.some(kw => lower.includes(kw)) && !portfolio) {
            needs.screening = true;
        }

        // Advice intent gets fundamentals + news
        if (intents.includes('advice')) {
            needs.fundamentals = true;
            needs.news = true;
        }

        return needs;
    }

    /**
     * Get human-readable summary of context
     */
    getSummary(context) {
        const summary = [];

        if (context.portfolio) {
            summary.push(`Portfolio: ${context.portfolio.portfolios?.length || 0} portfolio(s)`);
        }

        summary.push(`Intents: ${context.intent?.intents.join(', ') || 'none'}`);
        summary.push(`Entities: ${context.entities.join(', ') || 'none'}`);

        const dataNeeded = Object.entries(context.needsData)
            .filter(([_, needed]) => needed)
            .map(([type]) => type);

        if (dataNeeded.length > 0) {
            summary.push(`Data: ${dataNeeded.join(', ')}`);
        }

        return summary.join(' | ');
    }
}

module.exports = UnifiedContextAnalyzer;
