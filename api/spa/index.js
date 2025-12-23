/**
 * SPA Orchestrator
 * Routes to appropriate Specialized Prompter Agents based on intent
 * Combines multiple SPAs when needed
 */

const BaseSPA = require('./baseSPA');
const PredictionSPA = require('./predictionSPA');

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
    }

    /**
     * Generate enhanced super prompt based on classification
     * @param {string} userPrompt - Original user prompt
     * @param {Object} classification - Intent classification
     * @param {Object} gatheredData - Data from all sources
     * @returns {Promise<Object>} Enhanced prompt components
     */
    async generateSuperPrompt(userPrompt, classification, gatheredData) {
        console.log('🎯 SPA Orchestrator: Generating super prompt for intents:', classification.intents);

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
            return this.generateGeneralPrompt(userPrompt, classification, gatheredData);
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
    generateGeneralPrompt(userPrompt, classification, gatheredData) {
        const { entities } = classification;

        // Build a simple but effective general prompt
        let systemPrompt = `You are an expert financial analyst and portfolio advisor.

Provide helpful, accurate, and actionable insights based on the user's question.

Guidelines:
- Use the provided data to support your analysis
- Be specific and concrete in your recommendations
- Acknowledge uncertainty when appropriate
- Provide both analysis and practical next steps`;

        // Add data context to user prompt
        let enhancedUserPrompt = userPrompt;

        if (gatheredData && Object.keys(gatheredData).length > 0) {
            enhancedUserPrompt += '\n\n**Available Data:**\n';

            if (gatheredData.fundamentals) {
                enhancedUserPrompt += `\n**Fundamental Data:**\n${JSON.stringify(gatheredData.fundamentals, null, 2)}\n`;
            }

            if (gatheredData.webSearch) {
                enhancedUserPrompt += `\n**Recent Information:**\n`;
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
