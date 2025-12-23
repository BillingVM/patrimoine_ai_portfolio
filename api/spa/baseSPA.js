/**
 * Base Specialized Prompter Agent (SPA)
 * Parent class for all specialized prompter agents
 */

class BaseSPA {
    constructor(name) {
        this.name = name;
    }

    /**
     * Generate enhanced super prompt
     * @param {string} userPrompt - Original user prompt
     * @param {Object} classification - Intent classification result
     * @param {Object} gatheredData - Data from various sources
     * @returns {Object} Enhanced prompt components
     */
    async generate(userPrompt, classification, gatheredData = {}) {
        throw new Error(`${this.name} must implement generate() method`);
    }

    /**
     * Build system prompt with framework
     */
    buildSystemPrompt(framework, context = {}) {
        return {
            role: 'system',
            content: framework
        };
    }

    /**
     * Build enhanced user prompt with data
     */
    buildUserPrompt(originalPrompt, dataContext) {
        let enhanced = originalPrompt;

        // Add data context if available
        if (Object.keys(dataContext).length > 0) {
            enhanced += '\n\n**Available Data:**\n';

            for (const [source, data] of Object.entries(dataContext)) {
                if (data && Object.keys(data).length > 0) {
                    enhanced += `\n**${source}:**\n`;
                    enhanced += typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                }
            }
        }

        return enhanced;
    }

    /**
     * Combine multiple SPAs results
     */
    static combine(spaResults) {
        // Merge system prompts
        const systemPrompts = spaResults
            .map(r => r.systemPrompt)
            .filter(Boolean)
            .join('\n\n');

        // Use the most detailed user prompt
        const userPrompt = spaResults
            .sort((a, b) => b.userPrompt.length - a.userPrompt.length)[0]
            .userPrompt;

        return {
            systemPrompt: systemPrompts,
            userPrompt: userPrompt,
            combinedFrom: spaResults.map(r => r.spaName)
        };
    }
}

module.exports = BaseSPA;
