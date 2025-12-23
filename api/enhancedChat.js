/**
 * Enhanced Chat Handler
 * Multi-agent AI system with intent classification, specialized prompters, and data gathering
 */

const IntentClassifier = require('./intentClassifier');
const DataGatherer = require('./dataGatherer');
const SPAOrchestrator = require('./spa');
const ModelManager = require('./modelManager');
const credits = require('./credits');

class EnhancedChatHandler {
    constructor() {
        this.intentClassifier = new IntentClassifier();
        this.modelManager = new ModelManager();
        this.spaOrchestrator = new SPAOrchestrator();

        // Initialize data gatherer with config
        const config = this.modelManager.getConfig();
        this.dataGatherer = new DataGatherer({
            financialApiKey: config.financial?.financialDatasetsApiKey,
            finfeedApiKey: 'c68131c9-c89c-46ac-bf26-da33e48b9686',
            webSearch: {
                useGoogleSearch: false, // DISABLED - using web scraping
                googleApiKey: null,
                googleSearchEngineId: null
            }
        });
    }

    /**
     * Process chat message through the enhanced AI pipeline
     * @param {string} userMessage - User's message
     * @param {Array} history - Conversation history
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Enhanced response
     */
    async processMessage(userMessage, history = [], userId = 1) {
        const pipeline = {
            startTime: Date.now(),
            stages: {}
        };

        try {
            console.log('\n' + '='.repeat(80));
            console.log('🚀 ENHANCED CHAT PIPELINE STARTED');
            console.log('='.repeat(80));

            // ==================== STAGE 1: Intent Classification ====================
            console.log('\n📋 STAGE 1: Intent Classification (System Cost - FREE for user)');
            const classifyStart = Date.now();

            const classification = await this.intentClassifier.classify(userMessage);

            pipeline.stages.classification = {
                duration: Date.now() - classifyStart,
                result: classification
            };

            // Track system overhead (not charged to user)
            await credits.trackSystemUsage(userId, 500, 'Intent classification');

            // ==================== STAGE 2: Data Gathering ====================
            console.log('\n📊 STAGE 2: Data Gathering (API costs - FREE for user)');
            const gatherStart = Date.now();

            const gatheredData = await this.dataGatherer.gatherData(classification, userMessage);

            pipeline.stages.dataGathering = {
                duration: Date.now() - gatherStart,
                sources: Object.keys(gatheredData).filter(k => k !== 'metadata')
            };

            // ==================== STAGE 3: SPA Generation ====================
            console.log('\n🎯 STAGE 3: Super Prompt Generation (System Cost - FREE for user)');
            const spaStart = Date.now();

            const superPrompt = await this.spaOrchestrator.generateSuperPrompt(
                userMessage,
                classification,
                gatheredData
            );

            pipeline.stages.spaGeneration = {
                duration: Date.now() - spaStart,
                spaUsed: superPrompt.spaName || superPrompt.combinedFrom
            };

            // Track system overhead (not charged to user)
            await credits.trackSystemUsage(userId, 300, 'SPA generation');

            // ==================== STAGE 4: Final AI Response ====================
            console.log('\n🤖 STAGE 4: Final AI Response (USER COST - CHARGED)');
            const aiStart = Date.now();

            // Build messages array
            const messages = [
                // System prompt from SPA
                { role: 'system', content: superPrompt.systemPrompt },
                // Conversation history
                ...history,
                // Enhanced user prompt
                { role: 'user', content: superPrompt.userPrompt }
            ];

            // Call AI with enhanced prompt
            const aiResponse = await this.modelManager.callModel(messages, null, 3);

            pipeline.stages.aiResponse = {
                duration: Date.now() - aiStart,
                model: aiResponse.modelUsed,
                tokens: aiResponse.usage || {}
            };

            // ==================== STAGE 5: Credits Deduction ====================
            console.log('\n💳 STAGE 5: Credits Deduction (USER ONLY)');

            const tokensUsed = (aiResponse.usage?.total_tokens || 2000); // Default estimate if not provided

            const creditsResult = await credits.deductUserCredits(
                userId,
                tokensUsed,
                `Chat: ${classification.intents.join(', ')}`,
                null,
                null
            );

            // ==================== Pipeline Complete ====================
            pipeline.totalDuration = Date.now() - pipeline.startTime;

            console.log('\n' + '='.repeat(80));
            console.log('✅ ENHANCED CHAT PIPELINE COMPLETED');
            console.log(`   Total Duration: ${pipeline.totalDuration}ms`);
            console.log(`   Classification: ${pipeline.stages.classification.duration}ms`);
            console.log(`   Data Gathering: ${pipeline.stages.dataGathering.duration}ms`);
            console.log(`   SPA Generation: ${pipeline.stages.spaGeneration.duration}ms`);
            console.log(`   AI Response: ${pipeline.stages.aiResponse.duration}ms`);
            console.log(`   User Charged: ${tokensUsed} tokens`);
            console.log('='.repeat(80) + '\n');

            return {
                success: true,
                response: aiResponse.content,
                modelUsed: aiResponse.modelUsed,
                classification: classification,
                dataSourcesUsed: pipeline.stages.dataGathering.sources,
                tokensUsed: tokensUsed,
                balance: creditsResult.balance,
                hasCredits: creditsResult.balance > 0,
                pipeline: {
                    totalDuration: pipeline.totalDuration,
                    stages: {
                        classification: pipeline.stages.classification.duration,
                        dataGathering: pipeline.stages.dataGathering.duration,
                        spaGeneration: pipeline.stages.spaGeneration.duration,
                        aiResponse: pipeline.stages.aiResponse.duration
                    }
                }
            };

        } catch (error) {
            console.error('\n❌ ENHANCED CHAT PIPELINE ERROR:', error);
            console.error('='.repeat(80) + '\n');

            throw error;
        }
    }
}

module.exports = EnhancedChatHandler;
