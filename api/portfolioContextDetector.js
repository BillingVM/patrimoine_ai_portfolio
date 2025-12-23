/**
 * Portfolio Context Detector
 * Detects if user message is portfolio-related and extracts context
 */

class PortfolioContextDetector {
    constructor() {
        // Portfolio-related keywords
        this.portfolioKeywords = [
            'portfolio', 'portfolios', 'holdings', 'positions', 'allocation',
            'my investments', 'my stocks', 'my assets', 'my position',
            'rebalance', 'diversification', 'exposure'
        ];

        // Ownership indicators
        this.ownershipWords = ['my', 'mine', 'our', 'ours'];

        // Portfolio identifier patterns
        this.identifierPatterns = {
            byName: /\b(p\d+|portfolio\s*[#\d]+|[a-z][\w\s]*portfolio)\b/i,
            byRecency: /\b(latest|newest|most recent|recent|last|just uploaded|new)\b/i,
            byOrder: /\b(first|second|third|1st|2nd|3rd|#\d+|number\s*\d+)\b/i,
            byAll: /\b(all|total|entire|overall|combined|aggregate|everything)\b/i,
            byImplicit: /\b(it|this|that|these|those|one|the one|the other)\b/i
        };

        // Portfolio-specific actions
        this.portfolioActions = [
            'analyze', 'review', 'evaluate', 'assess', 'check',
            'compare', 'rebalance', 'optimize', 'adjust',
            'how is', 'performance', 'doing', 'worth',
            'should i', 'add to', 'remove from', 'sell from', 'buy for'
        ];

        // Asset-specific indicators
        this.assetContextIndicators = [
            'in my', 'from my', 'to my', 'within',
            'add', 'remove', 'sell', 'buy', 'increase', 'decrease'
        ];
    }

    /**
     * Detect portfolio context in user message
     * @param {string} message - User message
     * @param {Array} history - Conversation history
     * @returns {Object} Detection result
     */
    detect(message, history = []) {
        const lower = message.toLowerCase();
        const signals = [];
        let score = 0;

        // Signal 1: Contains portfolio keywords
        const hasPortfolioKeyword = this.portfolioKeywords.some(keyword =>
            lower.includes(keyword.toLowerCase())
        );
        if (hasPortfolioKeyword) {
            score += 0.4;
            signals.push('Contains portfolio keywords');
        }

        // Signal 2: Contains ownership words + investment terms
        const hasOwnership = this.ownershipWords.some(word => lower.includes(word));
        const investmentTerms = ['stock', 'investment', 'holding', 'position', 'asset'];
        const hasInvestmentTerm = investmentTerms.some(term => lower.includes(term));

        if (hasOwnership && hasInvestmentTerm) {
            score += 0.3;
            signals.push('Contains ownership + investment terms');
        }

        // Signal 3: Portfolio-specific actions
        const hasPortfolioAction = this.portfolioActions.some(action =>
            lower.includes(action.toLowerCase())
        );
        if (hasPortfolioAction && hasOwnership) {
            score += 0.2;
            signals.push('Contains portfolio-specific action');
        }

        // Signal 4: Previous context about portfolios
        if (this.hasPreviousPortfolioContext(history)) {
            score += 0.15;
            signals.push('Previous portfolio context exists');
        }

        // Determine if portfolio-related
        const isPortfolioRelated = score >= 0.3 || hasPortfolioKeyword;

        if (!isPortfolioRelated) {
            return {
                isPortfolioRelated: false,
                confidence: score,
                reason: 'No portfolio context detected'
            };
        }

        // Extract portfolio identifiers
        const identifiers = this.extractIdentifiers(message, history);

        // Extract asset mentions
        const assetMentions = this.extractAssetMentions(message);

        // Determine asset context
        const assetContext = this.determineAssetContext(message, assetMentions);

        // Determine scope
        const scope = this.determineScope(identifiers, message);

        // Determine action
        const action = this.determineAction(message);

        console.log(`📊 Portfolio Context Detection:`);
        console.log(`   Message: "${message.substring(0, 60)}..."`);
        console.log(`   Is Portfolio-Related: ${isPortfolioRelated ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Confidence: ${(score * 100).toFixed(1)}%`);
        if (identifiers.length > 0) {
            console.log(`   Identifiers: ${JSON.stringify(identifiers)}`);
        }
        if (assetMentions.length > 0) {
            console.log(`   Assets Mentioned: ${assetMentions.join(', ')}`);
        }
        console.log(`   Scope: ${scope}`);
        console.log(`   Action: ${action}`);

        return {
            isPortfolioRelated: true,
            confidence: Math.min(score, 1.0),
            scope,
            identifiers,
            assetMentions,
            assetContext,
            action,
            signals,
            reason: signals.join(', ')
        };
    }

    /**
     * Extract portfolio identifiers from message
     */
    extractIdentifiers(message, history) {
        const identifiers = [];
        const lower = message.toLowerCase();

        // Extract by name (P1, P2, "Tech Portfolio", etc.)
        const nameMatches = message.match(this.identifierPatterns.byName);
        if (nameMatches) {
            nameMatches.forEach(match => {
                identifiers.push({
                    type: 'name',
                    value: match.trim(),
                    referencedBy: 'explicit'
                });
            });
        }

        // Check for recency references
        if (this.identifierPatterns.byRecency.test(lower)) {
            identifiers.push({
                type: 'recency',
                value: 'latest',
                referencedBy: 'recency'
            });
        }

        // Check for order references
        const orderMatch = lower.match(/\b(first|second|third|#?\d+)\b/i);
        if (orderMatch) {
            const orderValue = this.parseOrderNumber(orderMatch[1]);
            if (orderValue) {
                identifiers.push({
                    type: 'order',
                    value: orderValue,
                    referencedBy: 'order'
                });
            }
        }

        // Check for "all" references
        if (this.identifierPatterns.byAll.test(lower)) {
            identifiers.push({
                type: 'all',
                value: 'all',
                referencedBy: 'aggregate'
            });
        }

        // Check for implicit references
        if (identifiers.length === 0 && this.identifierPatterns.byImplicit.test(lower)) {
            const previousPortfolio = this.getPreviousPortfolioFromHistory(history);
            if (previousPortfolio) {
                identifiers.push({
                    type: 'implicit',
                    value: previousPortfolio,
                    referencedBy: 'conversation_context'
                });
            }
        }

        return identifiers;
    }

    /**
     * Extract asset/ticker mentions
     */
    extractAssetMentions(message) {
        const assets = [];

        // Match stock tickers (2-5 uppercase letters)
        const tickerPattern = /\b[A-Z]{2,5}\b/g;
        const tickers = message.match(tickerPattern) || [];
        assets.push(...tickers);

        // Match common company names
        const companies = [
            'Tesla', 'Apple', 'Microsoft', 'Google', 'Amazon',
            'Meta', 'Netflix', 'Nvidia', 'AMD', 'Intel', 'Facebook'
        ];

        companies.forEach(company => {
            if (message.toLowerCase().includes(company.toLowerCase())) {
                assets.push(company.toUpperCase().slice(0, 4));
            }
        });

        return [...new Set(assets)]; // Remove duplicates
    }

    /**
     * Determine if assets are in portfolio context or general
     */
    determineAssetContext(message, assets) {
        if (assets.length === 0) {
            return 'none';
        }

        const lower = message.toLowerCase();

        // Check for portfolio-specific asset context
        const hasPortfolioContext = this.assetContextIndicators.some(indicator =>
            lower.includes(indicator)
        );

        return hasPortfolioContext ? 'within_portfolio' : 'general';
    }

    /**
     * Determine scope (specific, multiple, all, none)
     */
    determineScope(identifiers, message) {
        if (identifiers.length === 0) {
            return 'none';
        }

        const hasAll = identifiers.some(id => id.type === 'all');
        if (hasAll) {
            return 'all';
        }

        if (identifiers.length > 1) {
            return 'multiple';
        }

        return 'specific';
    }

    /**
     * Determine action type
     */
    determineAction(message) {
        const lower = message.toLowerCase();

        const actionMap = {
            'analysis': ['analyze', 'review', 'evaluate', 'assess', 'how is', 'performance', 'doing'],
            'comparison': ['compare', 'vs', 'versus', 'difference', 'better'],
            'advice': ['should i', 'recommend', 'advice', 'what to', 'suggest'],
            'rebalance': ['rebalance', 'adjust', 'optimize', 'reallocate'],
            'modification': ['add', 'remove', 'sell', 'buy', 'increase', 'decrease'],
            'information': ['what', 'which', 'show', 'list', 'tell me']
        };

        for (const [action, keywords] of Object.entries(actionMap)) {
            if (keywords.some(keyword => lower.includes(keyword))) {
                return action;
            }
        }

        return 'general';
    }

    /**
     * Check if previous messages mentioned portfolios
     */
    hasPreviousPortfolioContext(history) {
        if (!history || history.length === 0) return false;

        const recentMessages = history.slice(-4); // Check last 4 messages
        const historyText = recentMessages.map(h => h.content).join(' ').toLowerCase();

        return this.portfolioKeywords.some(keyword =>
            historyText.includes(keyword.toLowerCase())
        );
    }

    /**
     * Get previously mentioned portfolio from history
     */
    getPreviousPortfolioFromHistory(history) {
        if (!history || history.length === 0) return null;

        const recentMessages = history.slice(-2).reverse(); // Last 2 messages, most recent first

        for (const msg of recentMessages) {
            const match = msg.content.match(this.identifierPatterns.byName);
            if (match) {
                return match[0].trim();
            }
        }

        return null;
    }

    /**
     * Parse order number from text
     */
    parseOrderNumber(text) {
        const orderMap = {
            'first': 1, '1st': 1, '#1': 1, '1': 1,
            'second': 2, '2nd': 2, '#2': 2, '2': 2,
            'third': 3, '3rd': 3, '#3': 3, '3': 3,
            'fourth': 4, '4th': 4, '#4': 4, '4': 4,
            'fifth': 5, '5th': 5, '#5': 5, '5': 5
        };

        const cleaned = text.toLowerCase().replace('#', '');
        return orderMap[cleaned] || parseInt(text);
    }
}

module.exports = PortfolioContextDetector;
