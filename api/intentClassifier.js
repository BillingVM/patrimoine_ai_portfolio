/**
 * Intent Classifier
 * Analyzes user prompts to detect intent and entities
 * Uses free AI model (system cost, not charged to user)
 */

const ModelManager = require('./modelManager');

class IntentClassifier {
    constructor() {
        this.modelManager = new ModelManager();
    }

    /**
     * Classify user prompt intent and extract entities
     * @param {string} userPrompt - The user's question/prompt
     * @returns {Promise<Object>} Classification result
     */
    async classify(userPrompt) {
        console.log('🔍 Classifying intent for prompt...');

        const classificationPrompt = `You are an intent classifier for a financial portfolio AI assistant.

Analyze this user prompt and return a JSON object with:
1. "intents": Array of detected intents from: ["prediction", "analysis", "advice", "news", "general"]
2. "entities": Array of financial entities (stock tickers, company names, crypto, etc.)
3. "timeframe": Detected time period ("short_term", "medium_term", "long_term", "unspecified")
4. "confidence": Confidence score 0-1

User Prompt: "${userPrompt}"

Return ONLY valid JSON, no other text:`;

        try {
            // Use free model for classification (system overhead, not user cost)
            const response = await this.modelManager.callModel(
                [{ role: 'user', content: classificationPrompt }],
                null, // No tools needed
                3 // Max retries
            );

            console.log('📄 Raw classification response:', response.content);

            // Parse JSON response
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn('⚠️ Failed to parse classification, using defaults');
                return this.getDefaultClassification(userPrompt);
            }

            const classification = JSON.parse(jsonMatch[0]);

            // Validate and normalize
            const normalized = {
                intents: Array.isArray(classification.intents) ? classification.intents : ['general'],
                entities: Array.isArray(classification.entities) ? classification.entities : this.extractEntitiesSimple(userPrompt),
                timeframe: classification.timeframe || 'unspecified',
                confidence: classification.confidence || 0.5
            };

            console.log('✅ Intent classification:', JSON.stringify(normalized, null, 2));
            return normalized;

        } catch (error) {
            console.error('❌ Intent classification error:', error.message);
            return this.getDefaultClassification(userPrompt);
        }
    }

    /**
     * Fallback: Simple entity extraction using regex
     */
    extractEntitiesSimple(prompt) {
        const entities = [];

        // Common stock ticker patterns (3-5 uppercase letters)
        const tickerMatches = prompt.match(/\b[A-Z]{2,5}\b/g);
        if (tickerMatches) {
            entities.push(...tickerMatches);
        }

        // Common company names
        const companies = ['Tesla', 'Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Netflix', 'Nvidia'];
        companies.forEach(company => {
            if (prompt.toLowerCase().includes(company.toLowerCase())) {
                entities.push(company.toUpperCase().slice(0, 4));
            }
        });

        // Crypto patterns
        const cryptoPatterns = ['Bitcoin', 'BTC', 'Ethereum', 'ETH', 'crypto'];
        cryptoPatterns.forEach(crypto => {
            if (prompt.toLowerCase().includes(crypto.toLowerCase())) {
                entities.push(crypto.toUpperCase());
            }
        });

        return [...new Set(entities)]; // Remove duplicates
    }

    /**
     * Default classification when AI fails
     */
    getDefaultClassification(userPrompt) {
        const lower = userPrompt.toLowerCase();
        const intents = [];

        // Simple keyword-based intent detection
        if (lower.match(/will|predict|forecast|future|next|gonna|going to/)) {
            intents.push('prediction');
        }
        if (lower.match(/should i|recommend|advice|what to do|buy|sell/)) {
            intents.push('advice');
        }
        if (lower.match(/analyze|analysis|how is|performance|review/)) {
            intents.push('analysis');
        }
        if (lower.match(/news|latest|update|happen/)) {
            intents.push('news');
        }

        // Default to general if no specific intent
        if (intents.length === 0) {
            intents.push('general');
        }

        return {
            intents,
            entities: this.extractEntitiesSimple(userPrompt),
            timeframe: this.detectTimeframe(userPrompt),
            confidence: 0.6 // Lower confidence for fallback
        };
    }

    /**
     * Detect timeframe from prompt
     */
    detectTimeframe(prompt) {
        const lower = prompt.toLowerCase();

        if (lower.match(/today|tomorrow|this week|next week|short term/)) {
            return 'short_term';
        }
        if (lower.match(/month|quarter|medium term/)) {
            return 'medium_term';
        }
        if (lower.match(/year|decade|long term/)) {
            return 'long_term';
        }

        return 'unspecified';
    }
}

module.exports = IntentClassifier;
