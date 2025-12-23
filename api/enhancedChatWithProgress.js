/**
 * Enhanced Chat Handler with Progress Events
 * Wraps EnhancedChatHandler to emit real-time progress updates
 */

const { EventEmitter } = require('events');
const EnhancedChatHandler = require('./enhancedChat');

class EnhancedChatWithProgress extends EventEmitter {
    constructor() {
        super();
        this.chatHandler = new EnhancedChatHandler();
    }

    /**
     * Process message with progress events
     * @param {string} userMessage - User's message
     * @param {Array} history - Conversation history
     * @param {number} userId - User ID
     * @returns {Promise<Object>} Enhanced response
     */
    async processMessageWithProgress(userMessage, history = [], userId = 1) {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 ENHANCED CHAT WITH PROGRESS - STARTED');
        console.log('='.repeat(80));
        console.log(`📝 User Message: "${userMessage.substring(0, 100)}..."`);
        console.log(`📚 History Length: ${history.length} messages`);
        console.log(`👤 User ID: ${userId}`);

        const pipeline = {
            startTime: Date.now(),
            stages: {}
        };

        try {
            console.log('\n📤 Emitting: start progress (0%)');
            this.emit('progress', {
                stage: 'start',
                message: 'Starting AI pipeline...',
                progress: 0
            });

            // ==================== STAGE 0: Follow-up Detection ====================
            console.log('\n📋 STAGE 0: Follow-up Detection');
            console.log('📤 Emitting: followup progress (5%)');
            this.emit('progress', {
                stage: 'followup',
                message: 'Analyzing conversation context...',
                progress: 5
            });

            const followUpStart = Date.now();
            console.log('🔍 Calling followUpDetector.detect()...');
            const followUpDetection = this.chatHandler.followUpDetector.detect(userMessage, history);
            console.log(`✅ Follow-up detection complete: isFollowUp=${followUpDetection.isFollowUp}, confidence=${followUpDetection.confidence}`);

            pipeline.stages.followUpDetection = {
                duration: Date.now() - followUpStart,
                result: followUpDetection
            };

            // If it's a follow-up, use lightweight path
            if (followUpDetection.isFollowUp) {
                console.log('⚡ FOLLOW-UP DETECTED! Switching to lightweight path...');
                console.log('📤 Emitting: followup detected progress (15%)');
                this.emit('progress', {
                    stage: 'followup',
                    message: 'Follow-up detected! Fast-tracking response...',
                    progress: 15
                });

                return await this.processFollowUpWithProgress(userMessage, history, userId, pipeline);
            }

            console.log('📌 New topic detected. Proceeding with full pipeline...');
            console.log('📤 Emitting: new topic progress (10%)');
            this.emit('progress', {
                stage: 'followup',
                message: 'New topic detected. Running full analysis...',
                progress: 10
            });

            // ==================== STAGE 0.5: Portfolio Context Detection ====================
            console.log('\n📊 STAGE 0.5: Portfolio Context Detection');
            console.log('📤 Emitting: portfolio detection progress (15%)');
            this.emit('progress', {
                stage: 'portfolio',
                message: 'Detecting portfolio context...',
                progress: 15
            });

            const portfolioDetectStart = Date.now();
            console.log('🔍 Calling portfolioContextDetector.detect()...');
            const portfolioContextDetection = this.chatHandler.portfolioContextDetector.detect(userMessage, history);
            console.log(`✅ Portfolio context detection complete:`);
            console.log(`   - isPortfolioRelated: ${portfolioContextDetection.isPortfolioRelated}`);
            console.log(`   - scope: ${portfolioContextDetection.scope}`);
            console.log(`   - confidence: ${portfolioContextDetection.confidence}`);

            pipeline.stages.portfolioDetection = {
                duration: Date.now() - portfolioDetectStart,
                isPortfolioRelated: portfolioContextDetection.isPortfolioRelated,
                scope: portfolioContextDetection.scope
            };

            // Resolve portfolio context if detected
            let portfolioContext = null;
            if (portfolioContextDetection.isPortfolioRelated) {
                console.log('📊 Portfolio context IS related! Resolving...');
                console.log('📤 Emitting: portfolio resolution progress (18%)');
                this.emit('progress', {
                    stage: 'portfolio',
                    message: `Resolving portfolio references... (${portfolioContextDetection.scope})`,
                    progress: 18
                });

                const portfolioResolveStart = Date.now();
                console.log('🔍 Calling portfolioResolver.resolve()...');
                try {
                    portfolioContext = await this.chatHandler.portfolioResolver.resolve(portfolioContextDetection, userId);
                    console.log(`✅ Portfolio resolution complete:`);
                    console.log(`   - resolved: ${portfolioContext.resolved}`);
                    console.log(`   - portfolios: ${portfolioContext.portfolios ? portfolioContext.portfolios.length : 'undefined'}`);
                    console.log(`   - Full context:`, JSON.stringify(portfolioContext, null, 2));
                } catch (error) {
                    console.error('❌ ERROR in portfolioResolver.resolve():', error);
                    console.error('   Stack:', error.stack);
                    throw error;
                }

                pipeline.stages.portfolioResolution = {
                    duration: Date.now() - portfolioResolveStart,
                    resolved: portfolioContext.resolved,
                    portfolioCount: portfolioContext.portfolios?.length || 0
                };

                if (portfolioContext.resolved && portfolioContext.portfolios && portfolioContext.portfolios.length > 0) {
                    console.log(`✅ Successfully resolved ${portfolioContext.portfolios.length} portfolio(s)`);
                    console.log('📤 Emitting: portfolios found progress (22%)');
                    this.emit('progress', {
                        stage: 'portfolio',
                        message: `Found ${portfolioContext.portfolios.length} portfolio(s)`,
                        progress: 22
                    });
                } else {
                    console.log('⚠️  Portfolio resolution did not return portfolios');
                }
            } else {
                console.log('📌 Portfolio context NOT related. Skipping resolution.');
            }

            // ==================== STAGE 1: Intent Classification ====================
            console.log('\n📋 STAGE 1: Intent Classification');
            console.log('📤 Emitting: classification progress (25%)');
            this.emit('progress', {
                stage: 'classification',
                message: 'Analyzing your intent...',
                progress: 25
            });

            const classifyStart = Date.now();
            console.log('🔍 Calling intentClassifier.classify()...');
            const classification = await this.chatHandler.intentClassifier.classify(userMessage);
            console.log(`✅ Classification complete:`);
            console.log(`   - intents: ${classification.intents ? classification.intents.join(', ') : 'undefined'}`);
            console.log(`   - entities: ${classification.entities ? classification.entities.join(', ') : 'none'}`);
            console.log(`   - confidence: ${classification.confidence}`);

            pipeline.stages.classification = {
                duration: Date.now() - classifyStart,
                result: classification
            };

            console.log('📤 Emitting: intent detected progress (35%)');
            this.emit('progress', {
                stage: 'classification',
                message: `Intent detected: ${classification.intents.join(', ')}`,
                progress: 35
            });

            // ==================== STAGE 2: Data Gathering ====================
            console.log('\n📊 STAGE 2: Data Gathering');
            console.log('📤 Emitting: data gathering progress (40%)');
            this.emit('progress', {
                stage: 'data',
                message: 'Gathering market data from multiple sources...',
                progress: 40
            });

            const gatherStart = Date.now();
            console.log('🔍 Calling dataGatherer.gatherData()...');
            const gatheredData = await this.chatHandler.dataGatherer.gatherData(classification, userMessage);
            console.log(`✅ Data gathering complete`);
            console.log(`   - Data keys:`, Object.keys(gatheredData));

            pipeline.stages.dataGathering = {
                duration: Date.now() - gatherStart,
                sources: Object.keys(gatheredData).filter(k => k !== 'metadata')
            };

            const sourcesText = pipeline.stages.dataGathering.sources.join(', ') || 'none';
            console.log(`   - Sources used: ${sourcesText}`);
            console.log('📤 Emitting: data gathered progress (55%)');
            this.emit('progress', {
                stage: 'data',
                message: `Data gathered from: ${sourcesText}`,
                progress: 55
            });

            // ==================== STAGE 3: SPA Generation ====================
            console.log('\n🎯 STAGE 3: SPA Generation');
            console.log('📤 Emitting: SPA generation progress (60%)');
            this.emit('progress', {
                stage: 'spa',
                message: 'Building specialized analysis framework...',
                progress: 60
            });

            const spaStart = Date.now();
            console.log('🔍 Calling spaOrchestrator.generateSuperPrompt()...');
            console.log(`   - Portfolio context: ${portfolioContext ? 'YES' : 'NO'}`);
            const superPrompt = await this.chatHandler.spaOrchestrator.generateSuperPrompt(
                userMessage,
                classification,
                gatheredData,
                portfolioContext
            );
            console.log(`✅ SPA generation complete`);
            console.log(`   - SPA used: ${superPrompt.spaName || superPrompt.combinedFrom || superPrompt.metadata?.spa || 'unknown'}`);

            pipeline.stages.spaGeneration = {
                duration: Date.now() - spaStart,
                spaUsed: superPrompt.spaName || superPrompt.combinedFrom || superPrompt.metadata?.spa
            };

            console.log('📤 Emitting: framework ready progress (65%)');
            this.emit('progress', {
                stage: 'spa',
                message: 'Analysis framework ready',
                progress: 65
            });

            // ==================== STAGE 4: Final AI Response ====================
            console.log('\n🤖 STAGE 4: AI Response Generation');
            console.log('📤 Emitting: AI response progress (70%)');
            this.emit('progress', {
                stage: 'ai',
                message: 'Generating AI response... (this may take 20-30 seconds)',
                progress: 70
            });

            const aiStart = Date.now();
            console.log('🔍 Building messages array...');

            // Build messages array
            const messages = [
                { role: 'system', content: superPrompt.systemPrompt },
                ...history,
                { role: 'user', content: superPrompt.userPrompt }
            ];
            console.log(`   - Messages array built: ${messages.length} messages`);
            console.log('🔍 Calling modelManager.callModel()...');
            console.log('   (This is the longest step, may take 20-30 seconds)');

            // Call AI with enhanced prompt
            const aiResponse = await this.chatHandler.modelManager.callModel(messages, null, 3);
            console.log(`✅ AI response received`);
            console.log(`   - Model used: ${aiResponse.modelUsed}`);
            console.log(`   - Tokens: ${JSON.stringify(aiResponse.usage || {})}`);
            console.log(`   - Response length: ${aiResponse.content ? aiResponse.content.length : 0} chars`);

            pipeline.stages.aiResponse = {
                duration: Date.now() - aiStart,
                model: aiResponse.modelUsed,
                tokens: aiResponse.usage || {}
            };

            console.log('📤 Emitting: AI response received progress (90%)');
            this.emit('progress', {
                stage: 'ai',
                message: 'AI response received',
                progress: 90
            });

            // ==================== STAGE 5: Credits Deduction ====================
            console.log('\n💳 STAGE 5: Credits Deduction');
            console.log('📤 Emitting: credits progress (95%)');
            this.emit('progress', {
                stage: 'credits',
                message: 'Processing credits...',
                progress: 95
            });

            const tokensUsed = (aiResponse.usage?.total_tokens || 2000);
            console.log(`   - Tokens used: ${tokensUsed}`);
            const credits = require('./credits');

            console.log('🔍 Calling credits.deductUserCredits()...');
            const creditsResult = await credits.deductUserCredits(
                userId,
                tokensUsed,
                `Chat: ${classification.intents.join(', ')}`,
                null,
                null
            );
            console.log(`✅ Credits deducted`);
            console.log(`   - New balance: ${creditsResult.balance}`);

            // ==================== Pipeline Complete ====================
            pipeline.totalDuration = Date.now() - pipeline.startTime;

            console.log('\n' + '='.repeat(80));
            console.log('✅ ENHANCED CHAT WITH PROGRESS - COMPLETED');
            console.log('='.repeat(80));
            console.log(`⏱️  Total Duration: ${pipeline.totalDuration}ms`);
            console.log(`💰 User Charged: ${tokensUsed} tokens`);
            console.log(`💳 Remaining Balance: ${creditsResult.balance} credits`);
            console.log('='.repeat(80) + '\n');

            console.log('📤 Emitting: complete progress (100%)');
            this.emit('progress', {
                stage: 'complete',
                message: 'Complete!',
                progress: 100
            });

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
            console.error('\n' + '='.repeat(80));
            console.error('❌ ENHANCED CHAT WITH PROGRESS - ERROR (MAIN PIPELINE)');
            console.error('='.repeat(80));
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Full error object:', error);
            console.error('Pipeline state:', JSON.stringify(pipeline, null, 2));
            console.error('='.repeat(80) + '\n');

            this.emit('progress', {
                stage: 'error',
                message: `Error: ${error.message}`,
                progress: 0
            });

            throw error;
        }
    }

    /**
     * Process follow-up with progress events
     */
    async processFollowUpWithProgress(userMessage, history, userId, pipeline) {
        console.log('\n' + '='.repeat(80));
        console.log('⚡ LIGHTWEIGHT FOLLOW-UP PATH - STARTED');
        console.log('='.repeat(80));

        try {
            // Portfolio context detection
            console.log('\n📊 Checking portfolio context...');
            console.log('📤 Emitting: portfolio check progress (20%)');
            this.emit('progress', {
                stage: 'portfolio',
                message: 'Checking portfolio context...',
                progress: 20
            });

            const portfolioDetectStart = Date.now();
            const portfolioContextDetection = this.chatHandler.portfolioContextDetector.detect(userMessage, history);
            let portfolioContext = null;

            if (portfolioContextDetection.isPortfolioRelated) {
                this.emit('progress', {
                    stage: 'portfolio',
                    message: 'Resolving portfolio...',
                    progress: 25
                });

                portfolioContext = await this.chatHandler.portfolioResolver.resolve(portfolioContextDetection, userId);

                pipeline.stages.portfolioDetection = {
                    duration: Date.now() - portfolioDetectStart,
                    isPortfolioRelated: true,
                    resolved: portfolioContext.resolved
                };
            }

            // Build contextual prompt
            this.emit('progress', {
                stage: 'ai',
                message: 'Generating contextual response...',
                progress: 40
            });

            let systemPrompt = `You are an expert financial analyst and portfolio advisor.

The user is asking a follow-up question about your previous response.
Provide a clear, helpful answer based on the conversation context.

Guidelines:
- Reference your previous response when relevant
- Explain concepts clearly and simply
- Be specific and actionable
- Acknowledge what you said before`;

            if (portfolioContext && portfolioContext.resolved) {
                systemPrompt += `\n\n**Portfolio Context:**\n`;
                systemPrompt += this.chatHandler.portfolioResolver.formatForAI(portfolioContext);
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: userMessage }
            ];

            // AI Response
            this.emit('progress', {
                stage: 'ai',
                message: 'AI processing...',
                progress: 60
            });

            const aiStart = Date.now();
            const aiResponse = await this.chatHandler.modelManager.callModel(messages, null, 3);

            pipeline.stages.aiResponse = {
                duration: Date.now() - aiStart,
                model: aiResponse.modelUsed,
                tokens: aiResponse.usage || {}
            };

            this.emit('progress', {
                stage: 'credits',
                message: 'Processing credits...',
                progress: 90
            });

            const tokensUsed = aiResponse.usage?.total_tokens || 800;
            const credits = require('./credits');

            const creditsResult = await credits.deductUserCredits(
                userId,
                tokensUsed,
                'Chat: follow-up',
                null,
                null
            );

            pipeline.totalDuration = Date.now() - pipeline.startTime;

            this.emit('progress', {
                stage: 'complete',
                message: 'Complete!',
                progress: 100
            });

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
            console.error('\n' + '='.repeat(80));
            console.error('❌ LIGHTWEIGHT FOLLOW-UP PATH - ERROR');
            console.error('='.repeat(80));
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Full error object:', error);
            console.error('Pipeline state:', JSON.stringify(pipeline, null, 2));
            console.error('='.repeat(80) + '\n');

            this.emit('progress', {
                stage: 'error',
                message: `Error: ${error.message}`,
                progress: 0
            });

            throw error;
        }
    }
}

module.exports = EnhancedChatWithProgress;
