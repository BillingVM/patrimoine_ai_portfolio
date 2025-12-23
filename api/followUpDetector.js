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

        console.log(`🔍 Follow-up Detection:`);
        console.log(`   Message: "${message.substring(0, 60)}..."`);
        console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   Is Follow-up: ${isFollowUp ? 'YES ✅' : 'NO ❌'}`);
        if (signals.length > 0) {
            console.log(`   Signals: ${signals.join(', ')}`);
        }

        return {
            isFollowUp,
            confidence,
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
     * Get suggested response strategy based on detection
     */
    getSuggestedStrategy(detection) {
        if (!detection.isFollowUp) {
            return 'full_pipeline';
        }

        if (detection.confidence >= 0.8) {
            return 'lightweight'; // Skip all data gathering
        }

        if (detection.confidence >= 0.5) {
            return 'lightweight'; // Still lightweight but monitor
        }

        return 'full_pipeline';
    }
}

module.exports = FollowUpDetector;
