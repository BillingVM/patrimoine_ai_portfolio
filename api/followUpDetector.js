/**
 * Follow-up Question Detector
 * Identifies when a user is asking a clarification/follow-up question
 * to avoid unnecessary data gathering and processing
 */

class FollowUpDetector {
    constructor() {
        // Keywords that indicate follow-up questions
        this.followUpKeywords = [
            'explain', 'clarify', 'what do you mean', 'what did you mean',
            'why did you say', 'can you elaborate', 'tell me more about',
            'what about', 'how about', 'what is', 'what are',
            'in your response', 'you mentioned', 'you said',
            'from above', 'from before', 'earlier you',
            'that', 'this', 'it', 'those', 'these'
        ];

        // Reference words that indicate continuation
        this.referenceWords = [
            'your response', 'your answer', 'your analysis',
            'the prediction', 'the analysis', 'the advice',
            'that point', 'that part', 'that section',
            'what you said', 'what you wrote', 'what you mentioned'
        ];

        // Question words
        this.questionWords = [
            'what', 'why', 'how', 'when', 'where', 'which',
            'can you', 'could you', 'would you', 'should i'
        ];
    }

    /**
     * Detect if message is a follow-up question
     * @param {string} message - Current user message
     * @param {Array} history - Conversation history
     * @returns {Object} Detection result with confidence and reasoning
     */
    detect(message, history = []) {
        // No history = definitely not a follow-up
        if (!history || history.length === 0) {
            return {
                isFollowUp: false,
                confidence: 1.0,
                needsData: true,
                reason: 'No conversation history'
            };
        }

        const lower = message.toLowerCase();
        const signals = [];
        let score = 0;

        // Signal 1: Short message (likely clarification)
        if (message.length < 80) {
            score += 0.2;
            signals.push('Short message (< 80 chars)');
        }

        // Signal 2: Contains follow-up keywords
        const hasFollowUpKeyword = this.followUpKeywords.some(keyword =>
            lower.includes(keyword.toLowerCase())
        );
        if (hasFollowUpKeyword) {
            score += 0.3;
            signals.push('Contains follow-up keywords');
        }

        // Signal 3: Contains reference words
        const hasReference = this.referenceWords.some(ref =>
            lower.includes(ref.toLowerCase())
        );
        if (hasReference) {
            score += 0.4;
            signals.push('Contains reference to previous response');
        }

        // Signal 4: Starts with question word but very short
        const startsWithQuestion = this.questionWords.some(qw =>
            lower.startsWith(qw.toLowerCase() + ' ')
        );
        if (startsWithQuestion && message.length < 100) {
            score += 0.2;
            signals.push('Starts with question word (short)');
        }

        // Signal 5: Contains pronouns without clear subject
        const hasVaguePronouns = /\b(it|that|this|those|these)\b/i.test(message);
        if (hasVaguePronouns && message.length < 100) {
            score += 0.15;
            signals.push('Contains vague pronouns');
        }

        // Signal 6: Recent history exists (within last 2 messages)
        const hasRecentHistory = history.length >= 2;
        if (hasRecentHistory) {
            score += 0.1;
            signals.push('Recent conversation context available');
        }

        // Signal 7: Doesn't contain new entities (stocks, tickers)
        const hasNewEntities = this.containsNewEntities(message, history);
        if (!hasNewEntities) {
            score += 0.15;
            signals.push('No new financial entities detected');
        }

        // Calculate confidence
        const confidence = Math.min(score, 1.0);
        const isFollowUp = confidence >= 0.5;

        // CRITICAL: Check if follow-up still needs data
        const needsData = this.checkDataNeeds(message);

        console.log(`🔍 Follow-up Detection:`);
        console.log(`   Message: "${message.substring(0, 60)}..."`);
        console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   Is Follow-up: ${isFollowUp ? 'YES ✅' : 'NO ❌'}`);
        console.log(`   Needs Data: ${needsData ? 'YES ✅' : 'NO ❌'}`);
        if (signals.length > 0) {
            console.log(`   Signals: ${signals.join(', ')}`);
        }

        return {
            isFollowUp,
            confidence,
            needsData,  // NEW: Critical flag
            signals,
            reason: signals.join(', ') || 'No follow-up signals detected'
        };
    }

    /**
     * Check if message contains new financial entities not in history
     */
    containsNewEntities(message, history) {
        // Common stock ticker patterns (2-5 uppercase letters)
        const tickerPattern = /\b[A-Z]{2,5}\b/g;
        const tickers = message.match(tickerPattern) || [];

        // If no tickers found, check for company names
        const companies = [
            'Tesla', 'Apple', 'Microsoft', 'Google', 'Amazon',
            'Meta', 'Netflix', 'Nvidia', 'AMD', 'Intel'
        ];

        const hasNewCompany = companies.some(company =>
            message.toLowerCase().includes(company.toLowerCase()) &&
            !this.isInHistory(company, history)
        );

        const hasNewTicker = tickers.some(ticker =>
            !this.isInHistory(ticker, history)
        );

        return hasNewCompany || hasNewTicker;
    }

    /**
     * Check if entity exists in conversation history
     */
    isInHistory(entity, history) {
        const historyText = history
            .map(h => h.content)
            .join(' ')
            .toLowerCase();

        return historyText.includes(entity.toLowerCase());
    }

    /**
     * Check if message needs external data (prices, news, fundamentals)
     * Even follow-ups might need fresh data for analysis/advice
     * @param {string} message - User message
     * @returns {boolean} True if needs external data
     */
    checkDataNeeds(message) {
        const lower = message.toLowerCase();

        // Action keywords that need current data
        const actionKeywords = [
            'sell', 'buy', 'trade', 'invest', 'purchase',
            'should i', 'recommend', 'advice', 'suggest',
            'worth', 'value', 'price', 'current',
            'performance', 'analyze', 'analysis',
            'rebalance', 'diversify', 'allocate',
            'compare', 'better', 'worse',
            'risk', 'return', 'profit', 'loss',
            'up', 'down', 'going', 'trend',
            'news', 'earnings', 'report'
        ];

        // Financial decision keywords
        const decisionKeywords = [
            'which one', 'which stock', 'which asset',
            'what should', 'should i sell', 'should i buy',
            'do i need to', 'is it time to',
            'when to', 'how much'
        ];

        // Valuation keywords
        const valuationKeywords = [
            'how much is', 'how much worth',
            'total value', 'portfolio value',
            'calculate', 'total', 'sum'
        ];

        // Check if any keywords match
        const needsAction = actionKeywords.some(kw => lower.includes(kw));
        const needsDecision = decisionKeywords.some(kw => lower.includes(kw));
        const needsValuation = valuationKeywords.some(kw => lower.includes(kw));

        const needsData = needsAction || needsDecision || needsValuation;

        if (needsData) {
            console.log(`   ⚠️ FOLLOW-UP NEEDS DATA: Contains action/decision/valuation keywords`);
        }

        return needsData;
    }

    /**
     * Get suggested response strategy based on detection
     */
    getSuggestedStrategy(detection) {
        if (!detection.isFollowUp) {
            return 'full_pipeline';
        }

        // CRITICAL: If follow-up needs data, use full pipeline
        if (detection.needsData) {
            console.log(`   → Strategy: FULL PIPELINE (follow-up but needs data)`);
            return 'full_pipeline';
        }

        // Pure clarification follow-ups can use lightweight
        if (detection.confidence >= 0.8) {
            console.log(`   → Strategy: LIGHTWEIGHT (pure clarification)`);
            return 'lightweight';
        }

        if (detection.confidence >= 0.5) {
            console.log(`   → Strategy: LIGHTWEIGHT (likely clarification)`);
            return 'lightweight';
        }

        return 'full_pipeline';
    }
}

module.exports = FollowUpDetector;
