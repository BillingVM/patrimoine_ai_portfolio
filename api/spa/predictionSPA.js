/**
 * Prediction Specialized Prompter Agent
 * Enhances prompts for prediction-related queries
 */

const BaseSPA = require('./baseSPA');

class PredictionSPA extends BaseSPA {
    constructor() {
        super('PredictionSPA');
    }

    async generate(userPrompt, classification, gatheredData = {}) {
        console.log('🔮 PredictionSPA: Generating enhanced prediction prompt');

        const { entities, timeframe } = classification;
        const { predictionMarkets, fundamentals, webSearch } = gatheredData;

        // Build prediction framework
        const framework = this.buildPredictionFramework(entities, timeframe);

        // Build data context
        const dataContext = {};

        if (predictionMarkets) {
            dataContext['Prediction Market Data'] = this.formatPredictionMarkets(predictionMarkets);
        }

        if (fundamentals) {
            dataContext['Fundamental Data'] = this.formatFundamentals(fundamentals);
        }

        if (webSearch) {
            dataContext['Recent News & Sentiment'] = this.formatWebSearch(webSearch);
        }

        // Build enhanced prompts
        const systemPrompt = this.buildSystemPrompt(framework);
        const enhancedUserPrompt = this.buildUserPrompt(userPrompt, dataContext);

        return {
            spaName: this.name,
            systemPrompt: systemPrompt.content,
            userPrompt: enhancedUserPrompt,
            metadata: {
                entities,
                timeframe,
                dataSources: Object.keys(dataContext)
            }
        };
    }

    /**
     * Build prediction analysis framework
     */
    buildPredictionFramework(entities, timeframe) {
        const entitiesStr = entities.length > 0 ? entities.join(', ') : 'the mentioned assets';
        const timeframeStr = this.getTimeframeDescription(timeframe);

        return `You are an expert financial analyst specializing in market predictions.

**Your Task:** Provide a well-reasoned prediction for ${entitiesStr} over ${timeframeStr}.

**Analysis Framework:**

1. **Prediction Market Sentiment Analysis**
   - Analyze current market sentiment from prediction markets
   - Identify consensus vs contrarian views
   - Note any significant betting patterns

2. **Fundamental Analysis**
   - Review key financial metrics and ratios
   - Assess business performance and growth trends
   - Identify potential catalysts or risks

3. **Technical & Sentiment Indicators**
   - Recent price action and trends
   - News sentiment and market buzz
   - Institutional vs retail sentiment

4. **Risk Assessment**
   - Upside potential and probability
   - Downside risks and probability
   - Key factors that could change the prediction

5. **Final Prediction**
   - Clear directional prediction (bullish/bearish/neutral)
   - Confidence level (low/medium/high)
   - Time horizon for the prediction
   - Key events to watch

**Important Guidelines:**
- Base your prediction on the provided data
- Acknowledge uncertainty and provide probability ranges where appropriate
- Explain your reasoning clearly
- If data is missing, state assumptions clearly
- Provide actionable insights, not just analysis`;
    }

    /**
     * Format prediction market data
     */
    formatPredictionMarkets(data) {
        if (!data || !data.markets || data.markets.length === 0) {
            return 'No prediction market data available.';
        }

        let formatted = '';
        data.markets.forEach((market, idx) => {
            formatted += `\n**Market ${idx + 1}:** ${market.question || market.title}\n`;
            formatted += `- Current Probability: ${market.probability || 'N/A'}\n`;
            formatted += `- Volume: ${market.volume || 'N/A'}\n`;
            formatted += `- Source: ${market.source || 'Unknown'}\n`;
        });

        return formatted;
    }

    /**
     * Format fundamental data
     */
    formatFundamentals(data) {
        if (!data) return 'No fundamental data available.';

        let formatted = '';

        if (data.price) {
            formatted += `\n**Current Price:** $${data.price}`;
        }

        if (data.marketCap) {
            formatted += `\n**Market Cap:** ${data.marketCap}`;
        }

        if (data.metrics) {
            formatted += '\n**Key Metrics:**\n';
            formatted += JSON.stringify(data.metrics, null, 2);
        }

        return formatted || 'No fundamental data available.';
    }

    /**
     * Format web search results
     */
    formatWebSearch(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return 'No recent news available.';
        }

        let formatted = '';
        data.slice(0, 5).forEach((result, idx) => {
            formatted += `\n**${idx + 1}. ${result.title}**\n`;
            formatted += `${result.snippet || result.description}\n`;
            formatted += `Source: ${result.link || result.url}\n`;
        });

        return formatted;
    }

    /**
     * Get timeframe description
     */
    getTimeframeDescription(timeframe) {
        const descriptions = {
            'short_term': 'the short term (days to weeks)',
            'medium_term': 'the medium term (months to quarter)',
            'long_term': 'the long term (year+)',
            'unspecified': 'the relevant time period'
        };

        return descriptions[timeframe] || descriptions.unspecified;
    }
}

module.exports = PredictionSPA;
