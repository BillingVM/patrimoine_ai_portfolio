/**
 * Enhanced Chat Handler
 * Multi-agent AI system with intent classification, specialized prompters, and data gathering
 */

const IntentClassifier = require('./intentClassifier');
const DataGatherer = require('./dataGatherer');
const SPAOrchestrator = require('./spa');
const ModelManager = require('./modelManager');
const FollowUpDetector = require('./followUpDetector');
const PortfolioContextDetector = require('./portfolioContextDetector');
const PortfolioResolver = require('./portfolioResolver');
const UnifiedContextAnalyzer = require('./unifiedContextAnalyzer');
const credits = require('./credits');

class EnhancedChatHandler {
    constructor() {
        this.intentClassifier = new IntentClassifier();
        this.modelManager = new ModelManager();
        this.spaOrchestrator = new SPAOrchestrator();
        this.followUpDetector = new FollowUpDetector();
        this.portfolioContextDetector = new PortfolioContextDetector();
        this.portfolioResolver = new PortfolioResolver();
        this.unifiedContextAnalyzer = new UnifiedContextAnalyzer();

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

            // ==================== STAGE 0: Follow-up Detection ====================
            console.log('\n🔍 STAGE 0: Follow-up Detection (FREE - Instant)');
            const followUpStart = Date.now();

            const followUpDetection = this.followUpDetector.detect(userMessage, history);

            pipeline.stages.followUpDetection = {
                duration: Date.now() - followUpStart,
                result: followUpDetection
            };

            // CRITICAL: Only use lightweight path if it's a follow-up that DOESN'T need data
            if (followUpDetection.isFollowUp && !followUpDetection.needsData) {
                console.log('✅ Pure follow-up (no data needed)! Using LIGHTWEIGHT path');
                return await this.processFollowUp(userMessage, history, userId, pipeline);
            }

            if (followUpDetection.isFollowUp && followUpDetection.needsData) {
                console.log('⚠️ Follow-up BUT NEEDS DATA! Using FULL pipeline with data gathering');
            } else {
                console.log('📌 New topic detected. Using FULL pipeline with data gathering.');
            }

            // ==================== STAGE 0.5: Portfolio Context Detection ====================
            console.log('\n📊 STAGE 0.5: Portfolio Context Detection (System Cost - FREE for user)');
            const portfolioDetectStart = Date.now();

            const portfolioContextDetection = this.portfolioContextDetector.detect(userMessage, history);

            pipeline.stages.portfolioDetection = {
                duration: Date.now() - portfolioDetectStart,
                isPortfolioRelated: portfolioContextDetection.isPortfolioRelated,
                scope: portfolioContextDetection.scope
            };

            // Resolve portfolio context if detected
            let portfolioContext = null;
            if (portfolioContextDetection.isPortfolioRelated) {
                console.log('✅ Portfolio context detected! Resolving to database records...');
                const portfolioResolveStart = Date.now();

                portfolioContext = await this.portfolioResolver.resolve(portfolioContextDetection, userId);

                pipeline.stages.portfolioResolution = {
                    duration: Date.now() - portfolioResolveStart,
                    resolved: portfolioContext.resolved,
                    portfolioCount: portfolioContext.portfolios?.length || 0
                };

                if (portfolioContext.resolved) {
                    console.log(`   ✓ Resolved ${portfolioContext.portfolios.length} portfolio(s)`);
                } else {
                    console.log(`   ⚠ ${portfolioContext.reason}`);
                }
            } else {
                console.log('   → No portfolio context detected');
            }

            // Track system overhead (not charged to user)
            await credits.trackSystemUsage(userId, 200, 'Portfolio context detection/resolution');

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
                gatheredData,
                portfolioContext  // Pass portfolio context to SPA
            );

            pipeline.stages.spaGeneration = {
                duration: Date.now() - spaStart,
                spaUsed: superPrompt.spaName || superPrompt.combinedFrom || superPrompt.metadata?.spa
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
            if (pipeline.stages.portfolioDetection) {
                console.log(`   Portfolio Detection: ${pipeline.stages.portfolioDetection.duration}ms`);
            }
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
                portfolioContext: portfolioContext ? {
                    detected: true,
                    scope: portfolioContext.scope,
                    portfolioCount: portfolioContext.portfolios?.length || 0,
                    portfolios: portfolioContext.portfolios?.map(p => ({
                        id: p.id,
                        name: p.name || `Portfolio #${p.id}`,
                        totalValue: p.totalValue,
                        assetCount: p.assetCount
                    })) || []
                } : { detected: false },
                dataSourcesUsed: pipeline.stages.dataGathering.sources,
                tokensUsed: tokensUsed,
                balance: creditsResult.balance,
                hasCredits: creditsResult.balance > 0,
                pipeline: {
                    totalDuration: pipeline.totalDuration,
                    stages: {
                        portfolioDetection: pipeline.stages.portfolioDetection?.duration,
                        portfolioResolution: pipeline.stages.portfolioResolution?.duration,
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

    /**
     * Process follow-up question using lightweight path
     * Skips data gathering and complex processing
     */
    async processFollowUp(userMessage, history, userId, pipeline) {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ LIGHTWEIGHT FOLLOW-UP PATH');
        console.log('='.repeat(80));

        try {
            // ==================== Portfolio Context Detection (even for follow-ups) ====================
            console.log('\n📊 Checking portfolio context (follow-up)');
            const portfolioDetectStart = Date.now();

            const portfolioContextDetection = this.portfolioContextDetector.detect(userMessage, history);
            let portfolioContext = null;

            if (portfolioContextDetection.isPortfolioRelated) {
                console.log('✅ Portfolio context detected in follow-up! Resolving...');
                portfolioContext = await this.portfolioResolver.resolve(portfolioContextDetection, userId);

                pipeline.stages.portfolioDetection = {
                    duration: Date.now() - portfolioDetectStart,
                    isPortfolioRelated: true,
                    resolved: portfolioContext.resolved
                };

                if (portfolioContext.resolved) {
                    console.log(`   ✓ Resolved ${portfolioContext.portfolios.length} portfolio(s)`);
                }
            } else {
                console.log('   → No portfolio context in follow-up');
            }

            // ==================== Build Simple Contextual Prompt ====================
            console.log('\n💬 Building contextual response (no data gathering needed)');

            let systemPrompt = `You are an expert financial analyst and portfolio advisor.

The user is asking a follow-up question about your previous response.
Provide a clear, helpful answer based on the conversation context.

Guidelines:
- Reference your previous response when relevant
- Explain concepts clearly and simply
- Be specific and actionable
- Acknowledge what you said before`;

            // Add portfolio context to system prompt if detected
            if (portfolioContext && portfolioContext.resolved) {
                systemPrompt += `\n\n**Portfolio Context:**\n`;
                systemPrompt += this.portfolioResolver.formatForAI(portfolioContext);
            }

            // Build enhanced user message
            let enhancedUserMessage = userMessage;

            // Build messages with full history
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: enhancedUserMessage }
            ];

            // ==================== AI Response ====================
            console.log('\n🤖 Generating follow-up response');
            const aiStart = Date.now();

            const aiResponse = await this.modelManager.callModel(messages, null, 3);

            pipeline.stages.aiResponse = {
                duration: Date.now() - aiStart,
                model: aiResponse.modelUsed,
                tokens: aiResponse.usage || {}
            };

            // ==================== Credits Deduction ====================
            console.log('\n💳 Credits Deduction (USER ONLY)');

            const tokensUsed = aiResponse.usage?.total_tokens || 800;

            const creditsResult = await credits.deductUserCredits(
                userId,
                tokensUsed,
                'Chat: follow-up',
                null,
                null
            );

            // ==================== Pipeline Complete ====================
            pipeline.totalDuration = Date.now() - pipeline.startTime;

            console.log('\n' + '='.repeat(80));
            console.log('✅ LIGHTWEIGHT FOLLOW-UP COMPLETED');
            console.log(`   Total Duration: ${pipeline.totalDuration}ms (vs ~32s for full pipeline)`);
            console.log(`   Follow-up Detection: ${pipeline.stages.followUpDetection.duration}ms`);
            if (pipeline.stages.portfolioDetection) {
                console.log(`   Portfolio Detection: ${pipeline.stages.portfolioDetection.duration}ms`);
            }
            console.log(`   AI Response: ${pipeline.stages.aiResponse.duration}ms`);
            console.log(`   User Charged: ${tokensUsed} tokens`);
            console.log(`   💰 Saved: No data gathering, no classification, no SPA generation`);
            console.log('='.repeat(80) + '\n');

            return {
                success: true,
                response: aiResponse.content,
                modelUsed: aiResponse.modelUsed,
                followUp: true,
                followUpDetection: pipeline.stages.followUpDetection.result,
                portfolioContext: portfolioContext ? {
                    detected: true,
                    scope: portfolioContext.scope,
                    portfolioCount: portfolioContext.portfolios?.length || 0,
                    portfolios: portfolioContext.portfolios?.map(p => ({
                        id: p.id,
                        name: p.name || `Portfolio #${p.id}`,
                        totalValue: p.totalValue,
                        assetCount: p.assetCount
                    })) || []
                } : { detected: false },
                tokensUsed: tokensUsed,
                balance: creditsResult.balance,
                hasCredits: creditsResult.balance > 0,
                pipeline: {
                    totalDuration: pipeline.totalDuration,
                    type: 'lightweight_followup',
                    stages: {
                        followUpDetection: pipeline.stages.followUpDetection.duration,
                        portfolioDetection: pipeline.stages.portfolioDetection?.duration,
                        aiResponse: pipeline.stages.aiResponse.duration
                    },
                    saved: 'Skipped: classification, data gathering, SPA generation'
                }
            };

        } catch (error) {
            console.error('\n❌ LIGHTWEIGHT FOLLOW-UP ERROR:', error);
            console.error('='.repeat(80) + '\n');
            throw error;
        }
    }
}

module.exports = EnhancedChatHandler;
