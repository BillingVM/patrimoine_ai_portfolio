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
        const pipeline = {
            startTime: Date.now(),
            stages: {}
        };

        try {
            this.emit('progress', {
                stage: 'start',
                message: 'Starting AI pipeline...',
                progress: 0
            });

            // ==================== STAGE 0: Follow-up Detection ====================
            this.emit('progress', {
                stage: 'followup',
                message: 'Analyzing conversation context...',
                progress: 5
            });

            const followUpStart = Date.now();
            const followUpDetection = this.chatHandler.followUpDetector.detect(userMessage, history);

            pipeline.stages.followUpDetection = {
                duration: Date.now() - followUpStart,
                result: followUpDetection
            };

            // If it's a follow-up, use lightweight path
            if (followUpDetection.isFollowUp) {
                this.emit('progress', {
                    stage: 'followup',
                    message: 'Follow-up detected! Fast-tracking response...',
                    progress: 15
                });

                return await this.processFollowUpWithProgress(userMessage, history, userId, pipeline);
            }

            this.emit('progress', {
                stage: 'followup',
                message: 'New topic detected. Running full analysis...',
                progress: 10
            });

            // ==================== STAGE 0.5: Portfolio Context Detection ====================
            this.emit('progress', {
                stage: 'portfolio',
                message: 'Detecting portfolio context...',
                progress: 15
            });

            const portfolioDetectStart = Date.now();
            const portfolioContextDetection = this.chatHandler.portfolioContextDetector.detect(userMessage, history);

            pipeline.stages.portfolioDetection = {
                duration: Date.now() - portfolioDetectStart,
                isPortfolioRelated: portfolioContextDetection.isPortfolioRelated,
                scope: portfolioContextDetection.scope
            };

            // Resolve portfolio context if detected
            let portfolioContext = null;
            if (portfolioContextDetection.isPortfolioRelated) {
                this.emit('progress', {
                    stage: 'portfolio',
                    message: `Resolving portfolio references... (${portfolioContextDetection.scope})`,
                    progress: 18
                });

                const portfolioResolveStart = Date.now();
                portfolioContext = await this.chatHandler.portfolioResolver.resolve(portfolioContextDetection, userId);

                pipeline.stages.portfolioResolution = {
                    duration: Date.now() - portfolioResolveStart,
                    resolved: portfolioContext.resolved,
                    portfolioCount: portfolioContext.portfolios?.length || 0
                };

                if (portfolioContext.resolved) {
                    this.emit('progress', {
                        stage: 'portfolio',
                        message: `Found ${portfolioContext.portfolios.length} portfolio(s)`,
                        progress: 22
                    });
                }
            }

            // ==================== STAGE 1: Intent Classification ====================
            this.emit('progress', {
                stage: 'classification',
                message: 'Analyzing your intent...',
                progress: 25
            });

            const classifyStart = Date.now();
            const classification = await this.chatHandler.intentClassifier.classify(userMessage);

            pipeline.stages.classification = {
                duration: Date.now() - classifyStart,
                result: classification
            };

            this.emit('progress', {
                stage: 'classification',
                message: `Intent detected: ${classification.intents.join(', ')}`,
                progress: 35
            });

            // ==================== STAGE 2: Data Gathering ====================
            this.emit('progress', {
                stage: 'data',
                message: 'Gathering market data from multiple sources...',
                progress: 40
            });

            const gatherStart = Date.now();
            const gatheredData = await this.chatHandler.dataGatherer.gatherData(classification, userMessage);

            pipeline.stages.dataGathering = {
                duration: Date.now() - gatherStart,
                sources: Object.keys(gatheredData).filter(k => k !== 'metadata')
            };

            const sourcesText = pipeline.stages.dataGathering.sources.join(', ');
            this.emit('progress', {
                stage: 'data',
                message: `Data gathered from: ${sourcesText}`,
                progress: 55
            });

            // ==================== STAGE 3: SPA Generation ====================
            this.emit('progress', {
                stage: 'spa',
                message: 'Building specialized analysis framework...',
                progress: 60
            });

            const spaStart = Date.now();
            const superPrompt = await this.chatHandler.spaOrchestrator.generateSuperPrompt(
                userMessage,
                classification,
                gatheredData,
                portfolioContext
            );

            pipeline.stages.spaGeneration = {
                duration: Date.now() - spaStart,
                spaUsed: superPrompt.spaName || superPrompt.combinedFrom || superPrompt.metadata?.spa
            };

            this.emit('progress', {
                stage: 'spa',
                message: 'Analysis framework ready',
                progress: 65
            });

            // ==================== STAGE 4: Final AI Response ====================
            this.emit('progress', {
                stage: 'ai',
                message: 'Generating AI response... (this may take 20-30 seconds)',
                progress: 70
            });

            const aiStart = Date.now();

            // Build messages array
            const messages = [
                { role: 'system', content: superPrompt.systemPrompt },
                ...history,
                { role: 'user', content: superPrompt.userPrompt }
            ];

            // Call AI with enhanced prompt
            const aiResponse = await this.chatHandler.modelManager.callModel(messages, null, 3);

            pipeline.stages.aiResponse = {
                duration: Date.now() - aiStart,
                model: aiResponse.modelUsed,
                tokens: aiResponse.usage || {}
            };

            this.emit('progress', {
                stage: 'ai',
                message: 'AI response received',
                progress: 90
            });

            // ==================== STAGE 5: Credits Deduction ====================
            this.emit('progress', {
                stage: 'credits',
                message: 'Processing credits...',
                progress: 95
            });

            const tokensUsed = (aiResponse.usage?.total_tokens || 2000);
            const credits = require('./credits');

            const creditsResult = await credits.deductUserCredits(
                userId,
                tokensUsed,
                `Chat: ${classification.intents.join(', ')}`,
                null,
                null
            );

            // ==================== Pipeline Complete ====================
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
        try {
            // Portfolio context detection
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
