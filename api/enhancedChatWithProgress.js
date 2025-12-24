/**
 * Enhanced Chat Handler with Progress Events
 * Wraps EnhancedChatHandler to emit real-time progress updates
 */

const { EventEmitter } = require('events');
const EnhancedChatHandler = require('./enhancedChat');
const SessionStateManager = require('./sessionStateManager');
const chatSessions = require('./chatSessions');

class EnhancedChatWithProgress extends EventEmitter {
    constructor() {
        super();
        this.chatHandler = new EnhancedChatHandler();
        this.sessionStateManager = new SessionStateManager();
    }

    /**
     * Process message with progress events
     * @param {string} userMessage - User's message
     * @param {Array} history - Conversation history
     * @param {number} userId - User ID
     * @param {number} explicitPortfolioId - Explicit portfolio ID from URL (optional)
     * @param {number} sessionId - Session ID for state persistence (optional)
     * @returns {Promise<Object>} Enhanced response
     */
    async processMessageWithProgress(userMessage, history = [], userId = 1, explicitPortfolioId = null, sessionId = null) {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 ENHANCED CHAT WITH PROGRESS - STARTED');
        console.log('='.repeat(80));
        console.log(`📝 User Message: "${userMessage.substring(0, 100)}..."`);
        console.log(`📚 History Length: ${history.length} messages`);
        console.log(`👤 User ID: ${userId}`);
        if (explicitPortfolioId) {
            console.log(`📎 Explicit Portfolio ID from URL: ${explicitPortfolioId}`);
        }
        if (sessionId) {
            console.log(`💾 Session ID: ${sessionId}`);
        }

        const pipeline = {
            startTime: Date.now(),
            stages: {}
        };

        try {
            // Load session state
            let sessionState = {};
            if (sessionId) {
                console.log(`\n📦 Loading session state for session #${sessionId}`);
                sessionState = await chatSessions.getSessionState(sessionId);
                this.sessionStateManager.logState(sessionState);
            } else {
                console.log('\n📦 No session ID - starting fresh state');
                sessionState = this.sessionStateManager.initializeState();
            }
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
            console.log(`✅ Follow-up detection complete: isFollowUp=${followUpDetection.isFollowUp}, needsData=${followUpDetection.needsData}, confidence=${followUpDetection.confidence}`);

            pipeline.stages.followUpDetection = {
                duration: Date.now() - followUpStart,
                result: followUpDetection
            };

            // CRITICAL: Only use lightweight path if it's a follow-up that DOESN'T need data
            if (followUpDetection.isFollowUp && !followUpDetection.needsData) {
                console.log('⚡ PURE FOLLOW-UP (no data needed)! Switching to lightweight path...');
                console.log('📤 Emitting: followup detected progress (15%)');
                this.emit('progress', {
                    stage: 'followup',
                    message: 'Follow-up detected! Fast-tracking response...',
                    progress: 15
                });

                return await this.processFollowUpWithProgress(userMessage, history, userId, pipeline);
            }

            // If it's a follow-up that NEEDS data, or a new topic, use full pipeline
            if (followUpDetection.isFollowUp && followUpDetection.needsData) {
                console.log('⚠️ FOLLOW-UP BUT NEEDS DATA! Using full pipeline with data gathering...');
            } else {
                console.log('📌 New topic detected. Proceeding with full pipeline...');
            }

            console.log('📤 Emitting: new topic progress (10%)');
            this.emit('progress', {
                stage: 'followup',
                message: followUpDetection.isFollowUp ? 'Follow-up needs data. Running full analysis...' : 'New topic detected. Running full analysis...',
                progress: 10
            });

            // ==================== STAGE 1: Unified Context Analysis ====================
            console.log('\n🎯 STAGE 1: UNIFIED CONTEXT ANALYSIS');
            console.log('📤 Emitting: context analysis progress (15%)');
            this.emit('progress', {
                stage: 'context',
                message: 'Analyzing complete context (portfolio + intent + data needs)...',
                progress: 15
            });

            const contextStart = Date.now();
            console.log('🔍 Calling UnifiedContextAnalyzer.analyze()...');

            // CRITICAL: Use portfolio ID priority: URL parameter > Session state
            const portfolioIdToUse = explicitPortfolioId || sessionState.portfolioId || null;
            if (portfolioIdToUse) {
                console.log(`📎 Using Portfolio ID ${portfolioIdToUse} from ${explicitPortfolioId ? 'URL' : 'session state'}`);
            }

            const unifiedContext = await this.chatHandler.unifiedContextAnalyzer.analyze(userMessage, history, userId, portfolioIdToUse);

            console.log(`✅ Unified context analysis complete:`);
            console.log(this.chatHandler.unifiedContextAnalyzer.getSummary(unifiedContext));

            // CRITICAL: Save portfolio ID to session state if resolved
            if (unifiedContext.portfolio && unifiedContext.portfolio.resolved && unifiedContext.portfolio.portfolios && unifiedContext.portfolio.portfolios.length > 0) {
                const resolvedPortfolioId = unifiedContext.portfolio.portfolios[0].id;
                if (resolvedPortfolioId && resolvedPortfolioId !== sessionState.portfolioId) {
                    console.log(`💾 Saving portfolio ID ${resolvedPortfolioId} to session state`);
                    this.sessionStateManager.updatePortfolioId(sessionState, resolvedPortfolioId);
                }
            }

            pipeline.stages.unifiedContext = {
                duration: Date.now() - contextStart,
                portfolio: unifiedContext.portfolio,
                intent: unifiedContext.intent,
                entities: unifiedContext.entities,
                needsData: unifiedContext.needsData
            };

            console.log('📤 Emitting: context ready progress (35%)');
            this.emit('progress', {
                stage: 'context',
                message: `Context ready: ${unifiedContext.intent?.intents.join(', ') || 'general'}`,
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
            const gatheredData = await this.chatHandler.dataGatherer.gatherData(unifiedContext, userMessage, sessionState, this.sessionStateManager);
            console.log(`✅ Data gathering complete`);
            console.log(`   - Data keys:`, Object.keys(gatheredData));

            // Update session state with fresh data
            if (gatheredData.prices) {
                this.sessionStateManager.updatePrices(sessionState, gatheredData.prices);
            }
            if (gatheredData.fundamentals) {
                this.sessionStateManager.updateFundamentals(sessionState, gatheredData.fundamentals);
            }

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
            console.log(`   - Portfolio context: ${unifiedContext.portfolio ? 'YES' : 'NO'}`);
            const superPrompt = await this.chatHandler.spaOrchestrator.generateSuperPrompt(
                userMessage,
                unifiedContext.intent,
                gatheredData,
                unifiedContext.portfolio,
                sessionState,
                this.sessionStateManager
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

            // Emit streaming start event
            this.emit('progress', {
                stage: 'ai_streaming',
                message: 'Streaming AI response...',
                progress: 70
            });

            // Call AI with enhanced prompt and streaming
            const aiResponse = await this.chatHandler.modelManager.callModel(
                messages,
                null,
                3,
                (token) => {
                    // Emit each token as it arrives
                    this.emit('token', { token });
                }
            );
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
                message: 'AI response complete',
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
                `Chat: ${unifiedContext.intent?.intents.join(', ') || 'general'}`,
                null,
                null
            );
            console.log(`✅ Credits deducted`);
            console.log(`   - New balance: ${creditsResult.balance}`);

            // ==================== Save Session State ====================
            if (sessionId) {
                console.log(`\n💾 Saving session state for session #${sessionId}`);
                await chatSessions.updateSessionState(sessionId, sessionState);
                console.log('✅ Session state saved successfully');
            }

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
                classification: unifiedContext.intent,
                portfolioContext: unifiedContext.portfolio ? {
                    detected: true,
                    scope: unifiedContext.portfolio.scope,
                    portfolioCount: unifiedContext.portfolio.portfolios?.length || 0,
                    portfolios: unifiedContext.portfolio.portfolios?.map(p => ({
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
                        unifiedContext: pipeline.stages.unifiedContext?.duration,
                        dataGathering: pipeline.stages.dataGathering?.duration,
                        spaGeneration: pipeline.stages.spaGeneration?.duration,
                        aiResponse: pipeline.stages.aiResponse?.duration
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

            // AI Response with streaming
            this.emit('progress', {
                stage: 'ai_streaming',
                message: 'Streaming AI response...',
                progress: 60
            });

            const aiStart = Date.now();
            const aiResponse = await this.chatHandler.modelManager.callModel(
                messages,
                null,
                3,
                (token) => {
                    // Emit each token as it arrives
                    this.emit('token', { token });
                }
            );

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
                portfolioContext: unifiedContext.portfolio ? {
                    detected: true,
                    scope: unifiedContext.portfolio.scope,
                    portfolioCount: unifiedContext.portfolio.portfolios?.length || 0,
                    portfolios: unifiedContext.portfolio.portfolios?.map(p => ({
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
