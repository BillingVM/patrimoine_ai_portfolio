/**
 * SPA Orchestrator
 * Routes to appropriate Specialized Prompter Agents based on intent
 * Combines multiple SPAs when needed
 */

const BaseSPA = require('./baseSPA');
const PredictionSPA = require('./predictionSPA');
const PortfolioSPA = require('./portfolioSPA');

class SPAOrchestrator {
    constructor() {
        // Initialize all available SPAs
        this.spas = {
            prediction: new PredictionSPA(),
            // Add more SPAs here as they're created:
            // analysis: new AnalysisSPA(),
            // advice: new AdviceSPA(),
            // news: new NewsSPA(),
            // general: new GeneralSPA()
        };

        // Initialize portfolio SPA (not intent-based, context-based)
        this.portfolioSPA = new PortfolioSPA();
    }

    /**
     * Generate enhanced super prompt based on classification
     * @param {string} userPrompt - Original user prompt
     * @param {Object} classification - Intent classification
     * @param {Object} gatheredData - Data from all sources
     * @param {Object} portfolioContext - Resolved portfolio context (optional)
     * @returns {Promise<Object>} Enhanced prompt components
     */
    async generateSuperPrompt(userPrompt, classification, gatheredData, portfolioContext = null) {
        console.log('🎯 SPA Orchestrator: Generating super prompt for intents:', classification.intents);

        // PRIORITY: Check if Portfolio SPA should handle this
        if (portfolioContext && this.portfolioSPA.canHandle(classification, portfolioContext)) {
            console.log('   ✓ Using Portfolio SPA (portfolio context detected)');
            try {
                const result = await this.portfolioSPA.generate(
                    userPrompt,
                    classification,
                    gatheredData,
                    portfolioContext
                );
                console.log('✅ Portfolio super prompt generated');
                return result;
            } catch (error) {
                console.error(`❌ Portfolio SPA error:`, error.message);
                // Fall through to intent-based routing
            }
        }

        const { intents } = classification;
        const selectedSPAs = [];

        // Route to appropriate SPAs based on detected intents
        for (const intent of intents) {
            const spa = this.spas[intent];
            if (spa) {
                selectedSPAs.push(spa);
                console.log(`   ✓ Selected ${spa.name}`);
            } else {
                console.log(`   ⚠ No SPA found for intent: ${intent}`);
            }
        }

        // Fallback: if no specific SPA, use general approach
        if (selectedSPAs.length === 0) {
            console.log('   → Using general approach (no specialized SPA)');
            return this.generateGeneralPrompt(userPrompt, classification, gatheredData, portfolioContext);
        }

        // Generate prompts from all selected SPAs
        const spaResults = [];
        for (const spa of selectedSPAs) {
            try {
                const result = await spa.generate(userPrompt, classification, gatheredData);
                spaResults.push(result);
            } catch (error) {
                console.error(`❌ ${spa.name} error:`, error.message);
            }
        }

        // Combine results if multiple SPAs
        let finalPrompt;
        if (spaResults.length === 1) {
            finalPrompt = spaResults[0];
        } else {
            finalPrompt = BaseSPA.combine(spaResults);
        }

        console.log('✅ Super prompt generated');
        return finalPrompt;
    }

    /**
     * Generate general prompt when no specific SPA matches
     */
    generateGeneralPrompt(userPrompt, classification, gatheredData, portfolioContext = null) {
        const { entities } = classification;

        // Build a simple but effective general prompt
        let systemPrompt = `You are an expert financial analyst and portfolio advisor with access to real-time market data.

**CRITICAL: When "Real-Time Market Data" is provided below, those are CURRENT LIVE PRICES from FinancialDatasets API. You MUST use them in your analysis.**

Provide helpful, accurate, and actionable insights based on the user's question.

Guidelines:
- Use the provided real-time market data to support your analysis
- Be specific and concrete in your recommendations with current prices and values
- When price data is available, calculate exact values and percentages
- Acknowledge uncertainty when appropriate
- Provide both analysis and practical next steps`;

        // Add data context to user prompt
        let enhancedUserPrompt = userPrompt;

        if (gatheredData && Object.keys(gatheredData).length > 0) {
            enhancedUserPrompt += '\n\n## Available Market Data\n';

            // Prices (with conversation memory and change tracking)
            if (gatheredData.prices && typeof gatheredData.prices === 'object') {
                const hasUpdates = Object.values(gatheredData.prices).some(d => d.updated || d.source === 'updated');
                const hasConversationData = Object.values(gatheredData.prices).some(d => d.source === 'conversation' || d.preserved);

                enhancedUserPrompt += '\n### Current Stock Prices';
                if (hasUpdates) {
                    enhancedUserPrompt += ' 📊 UPDATES DETECTED\n';
                    enhancedUserPrompt += '**CRITICAL: Prices have changed since your last response. Use these updated values.**\n\n';
                } else if (hasConversationData) {
                    enhancedUserPrompt += ' (Preserved from Conversation)\n';
                    enhancedUserPrompt += '**CRITICAL: These are the SAME prices mentioned in your previous response. Maintain consistency.**\n\n';
                } else {
                    enhancedUserPrompt += '\n';
                    enhancedUserPrompt += '**CRITICAL: Use these current prices in your analysis.**\n\n';
                }

                // Show updated prices first (if any)
                const updated = Object.entries(gatheredData.prices).filter(([_, d]) => d.updated || d.source === 'updated');
                if (updated.length > 0) {
                    enhancedUserPrompt += '**PRICE UPDATES (since last message):**\n';
                    updated.forEach(([ticker, data]) => {
                        enhancedUserPrompt += `**${ticker}**: $${data.previousPrice} → $${data.price}`;
                        if (data.changePercent) {
                            enhancedUserPrompt += ` (${data.change >= 0 ? '+' : ''}${data.changePercent}% change)`;
                        }
                        enhancedUserPrompt += ' ⚠️ PRICE CHANGED\n';
                    });
                    enhancedUserPrompt += '\n';
                }

                // Show preserved/confirmed prices
                const preserved = Object.entries(gatheredData.prices).filter(([_, d]) =>
                    (d.source === 'conversation' || d.source === 'confirmed' || d.preserved) && !d.updated
                );
                if (preserved.length > 0) {
                    enhancedUserPrompt += '**CURRENT PRICES (from your previous response):**\n';
                    preserved.forEach(([ticker, data]) => {
                        enhancedUserPrompt += `**${ticker}**: $${data.price}`;
                        if (data.source === 'confirmed') {
                            enhancedUserPrompt += ' ✓ (confirmed by API)';
                        }
                        enhancedUserPrompt += '\n';
                    });
                    enhancedUserPrompt += '\n';
                }

                // Show fresh/new prices
                const fresh = Object.entries(gatheredData.prices).filter(([_, d]) =>
                    d.fresh || (d.source === 'api' && !d.updated && !d.preserved)
                );
                if (fresh.length > 0) {
                    enhancedUserPrompt += '**NEW DATA (from API):**\n';
                    fresh.forEach(([ticker, data]) => {
                        enhancedUserPrompt += `**${ticker}**: $${data.price}`;
                        if (data.changePercent !== null && data.changePercent !== undefined) {
                            enhancedUserPrompt += ` (${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%)`;
                        }
                        enhancedUserPrompt += '\n';
                    });
                    enhancedUserPrompt += '\n';
                }
            }

            // Holdings (from conversation - preserve consistency)
            if (gatheredData.holdings && typeof gatheredData.holdings === 'object') {
                const holdingsCount = Object.keys(gatheredData.holdings).length;
                if (holdingsCount > 0) {
                    enhancedUserPrompt += '\n### Portfolio Holdings (From Your Previous Response)\n';
                    enhancedUserPrompt += '**CRITICAL: These are the holdings you mentioned earlier. DO NOT change these quantities.**\n\n';

                    Object.entries(gatheredData.holdings).forEach(([ticker, data]) => {
                        enhancedUserPrompt += `**${ticker}** (${data.companyName}): ${data.shares} shares\n`;
                    });
                    enhancedUserPrompt += '\n';
                }
            }

            // Fundamentals
            if (gatheredData.fundamentals && typeof gatheredData.fundamentals === 'object') {
                enhancedUserPrompt += '\n### Financial Metrics\n';

                Object.entries(gatheredData.fundamentals).forEach(([ticker, metrics]) => {
                    enhancedUserPrompt += `**${ticker}**:\n`;
                    if (metrics.marketCap) enhancedUserPrompt += `  Market Cap: $${metrics.marketCap}\n`;
                    if (metrics.pe) enhancedUserPrompt += `  P/E Ratio: ${metrics.pe}\n`;
                    if (metrics.eps) enhancedUserPrompt += `  EPS: $${metrics.eps}\n`;
                });
                enhancedUserPrompt += '\n';
            }

            // News
            if (gatheredData.news && Array.isArray(gatheredData.news) && gatheredData.news.length > 0) {
                enhancedUserPrompt += '\n### Recent News\n';
                gatheredData.news.slice(0, 5).forEach(article => {
                    enhancedUserPrompt += `- **${article.ticker}**: ${article.title}\n`;
                });
                enhancedUserPrompt += '\n';
            }

            // Web Search (fallback)
            if (gatheredData.webSearch && gatheredData.webSearch.length > 0) {
                enhancedUserPrompt += '\n### Additional Information\n';
                gatheredData.webSearch.forEach((result, idx) => {
                    enhancedUserPrompt += `${idx + 1}. ${result.title}: ${result.snippet}\n`;
                });
            }
        }

        return {
            spaName: 'GeneralSPA',
            systemPrompt,
            userPrompt: enhancedUserPrompt,
            metadata: {
                entities,
                dataSources: Object.keys(gatheredData || {})
            }
        };
    }

    /**
     * Add a new SPA to the orchestrator
     */
    registerSPA(intent, spaInstance) {
        this.spas[intent] = spaInstance;
        console.log(`✅ Registered SPA for intent: ${intent}`);
    }

    /**
     * Get list of available SPAs
     */
    getAvailableSPAs() {
        return Object.keys(this.spas);
    }
}

module.exports = SPAOrchestrator;
