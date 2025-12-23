/**
 * AI Model Manager
 * Handles round-robin model selection, fallback, and health tracking
 * Supports OpenRouter, DeepSeek, and Qwen APIs
 */

const fs = require('fs');
const path = require('path');

class ModelManager {
    constructor() {
        this.config = this.loadConfig();
        this.models = this.initializeModels();
        this.currentIndex = 0;
        this.healthStatus = {}; // Track model health
        this.lastUsed = {}; // Track last usage time for rate limiting

        // Initialize health status
        this.models.forEach(model => {
            this.healthStatus[model.id] = {
                active: true,
                failCount: 0,
                lastFail: null,
                lastSuccess: null
            };
        });
    }

    /**
     * Load configuration from config.json
     */
    loadConfig() {
        try {
            const configPath = path.join(__dirname, 'config.json');
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('❌ Failed to load config.json:', error.message);
            throw new Error('Configuration file not found or invalid');
        }
    }

    /**
     * Initialize available models with their configurations
     */
    initializeModels() {
        const models = [];
        const aiConfig = this.config.ai;

        // OpenRouter Models
        if (aiConfig.openrouter && aiConfig.openrouter.apiKey) {
            const openrouterKey = aiConfig.openrouter.apiKey;

            aiConfig.openrouter.models.forEach((modelConfig, index) => {
                if (modelConfig.enabled) {
                    const isFree = modelConfig.price.inPrice === 0 && modelConfig.price.outPrice === 0;
                    const modelId = `openrouter-${modelConfig.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;

                    models.push({
                        id: modelId,
                        name: modelConfig.displayName,
                        provider: 'openrouter',
                        model: modelConfig.name,
                        apiKey: modelConfig.apiKey || openrouterKey,
                        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
                        free: isFree,
                        pricing: modelConfig.price
                    });
                }
            });
        }

        // DeepSeek Direct API
        if (aiConfig.deepseek && aiConfig.deepseek.enabled && aiConfig.deepseek.apiKey) {
            aiConfig.deepseek.models.forEach((modelConfig) => {
                if (modelConfig.enabled) {
                    const modelId = `deepseek-${modelConfig.name}`;

                    models.push({
                        id: modelId,
                        name: modelConfig.displayName,
                        provider: 'deepseek',
                        model: modelConfig.name,
                        apiKey: aiConfig.deepseek.apiKey,
                        endpoint: 'https://api.deepseek.com/v1/chat/completions',
                        free: false,
                        pricing: modelConfig.price
                    });
                }
            });
        }

        // Qwen Direct API
        if (aiConfig.qwen && aiConfig.qwen.enabled && aiConfig.qwen.apiKey) {
            aiConfig.qwen.models.forEach((modelConfig) => {
                if (modelConfig.enabled) {
                    const modelId = `qwen-${modelConfig.name}`;

                    models.push({
                        id: modelId,
                        name: modelConfig.displayName,
                        provider: 'qwen',
                        model: modelConfig.name,
                        apiKey: aiConfig.qwen.apiKey,
                        endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                        free: false,
                        pricing: modelConfig.price
                    });
                }
            });
        }

        if (models.length === 0) {
            console.warn('⚠️ No AI models configured! Please check config.json');
        } else {
            console.log(`✅ Initialized ${models.length} AI models`);
            models.forEach(m => {
                const priceInfo = m.pricing ? ` ($${m.pricing.inPrice}/$${m.pricing.outPrice} per 1M tokens)` : '';
                console.log(`   - ${m.name} (${m.provider}${m.free ? ' - FREE' : priceInfo})`);
            });
        }

        return models;
    }

    /**
     * Get next available model using round-robin
     */
    getNextModel() {
        const activeModels = this.models.filter(m => this.healthStatus[m.id].active);

        if (activeModels.length === 0) {
            return null; // No models available - trigger maintenance mode
        }

        // Round-robin through active models
        let attempts = 0;
        while (attempts < activeModels.length) {
            this.currentIndex = (this.currentIndex + 1) % activeModels.length;
            const model = activeModels[this.currentIndex];

            if (this.healthStatus[model.id].active) {
                console.log(`🤖 Selected model: ${model.name} (${model.id})`);
                return model;
            }

            attempts++;
        }

        return null;
    }

    /**
     * Call AI model with automatic retry and fallback
     * @param {Array} messages - Chat messages
     * @param {Array} tools - Optional tool definitions
     * @param {Number} maxRetries - Max retry attempts
     * @param {Function} onToken - Optional callback for streaming tokens
     */
    async callModel(messages, tools = null, maxRetries = 3, onToken = null) {
        let lastError = null;
        let retriesLeft = maxRetries;

        while (retriesLeft > 0) {
            const model = this.getNextModel();

            if (!model) {
                // All models are down
                throw new Error('MAINTENANCE_MODE');
            }

            try {
                console.log(`🔄 Attempt ${maxRetries - retriesLeft + 1}/${maxRetries} with ${model.name}`);

                const response = await this.executeModelCall(model, messages, tools, onToken);

                // Mark as successful
                this.markSuccess(model.id);

                return {
                    ...response,
                    modelUsed: model.name,
                    modelId: model.id
                };

            } catch (error) {
                lastError = error;
                console.error(`❌ Model ${model.name} failed:`, error.message);

                // Check if it's a permanent failure
                if (this.isPermanentFailure(error)) {
                    this.markFailed(model.id);
                    console.warn(`⚠️ Model ${model.name} marked as inactive`);
                }

                retriesLeft--;
            }
        }

        // All retries exhausted
        throw lastError || new Error('All model attempts failed');
    }

    /**
     * Execute actual API call to model
     * @param {Object} model - Model configuration
     * @param {Array} messages - Chat messages
     * @param {Array} tools - Optional tool definitions
     * @param {Function} onToken - Optional callback for streaming tokens
     */
    async executeModelCall(model, messages, tools, onToken = null) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // Longer timeout for streaming

        try {
            // Build request body based on provider
            const requestBody = this.buildRequestBody(model, messages, tools, !!onToken);

            // Build headers based on provider
            const headers = this.buildHeaders(model);

            const response = await fetch(model.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();

                // Parse error to determine if permanent
                const error = new Error(`API Error (${response.status}): ${errorText}`);
                error.status = response.status;
                error.response = errorText;

                throw error;
            }

            // Handle streaming response
            if (onToken && requestBody.stream) {
                return await this.handleStreamingResponse(response, onToken);
            }

            // Handle non-streaming response
            const data = await response.json();

            // Validate response
            if (!data.choices || !data.choices[0]) {
                throw new Error('Invalid API response - no choices returned');
            }

            const message = data.choices[0].message;

            return {
                content: message.content || null,
                tool_calls: message.tool_calls || null,
                usage: data.usage
            };

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                const timeoutError = new Error('Request timeout');
                timeoutError.timeout = true;
                throw timeoutError;
            }

            throw error;
        }
    }

    /**
     * Handle streaming response from AI model
     */
    async handleStreamingResponse(response, onToken) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let usage = null;

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                // Decode chunk
                buffer += decoder.decode(value, { stream: true });

                // Process complete lines
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    // Skip empty lines and comments
                    if (!trimmedLine || trimmedLine.startsWith(':')) continue;

                    // Parse SSE data
                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.slice(6); // Remove 'data: ' prefix

                        // Check for stream end
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);

                            // Extract token from different response formats
                            const delta = parsed.choices?.[0]?.delta;
                            if (delta?.content) {
                                const token = delta.content;
                                fullContent += token;

                                // Call token callback
                                if (onToken) {
                                    onToken(token);
                                }
                            }

                            // Capture usage info if available
                            if (parsed.usage) {
                                usage = parsed.usage;
                            }

                        } catch (parseError) {
                            // Skip unparseable lines
                            console.warn('Failed to parse SSE line:', data);
                        }
                    }
                }
            }

            return {
                content: fullContent,
                tool_calls: null,
                usage: usage
            };

        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Build request body based on provider
     */
    buildRequestBody(model, messages, tools, stream = false) {
        const body = {
            model: model.model,
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7
        };

        // Enable streaming if requested
        if (stream) {
            body.stream = true;
        }

        // Add tools if provided and provider supports them
        if (tools && tools.length > 0) {
            if (model.provider === 'openrouter' || model.provider === 'deepseek') {
                body.tools = tools;
                body.tool_choice = 'auto';
            }
        }

        return body;
    }

    /**
     * Build headers based on provider
     */
    buildHeaders(model) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (model.provider === 'openrouter') {
            headers['Authorization'] = `Bearer ${model.apiKey}`;
            headers['HTTP-Referer'] = 'https://sol.inoutconnect.com';
            headers['X-Title'] = 'Portfolio AI Chat';
        } else if (model.provider === 'deepseek') {
            headers['Authorization'] = `Bearer ${model.apiKey}`;
        } else if (model.provider === 'qwen') {
            headers['Authorization'] = `Bearer ${model.apiKey}`;
        }

        return headers;
    }

    /**
     * Check if error is permanent (model should be disabled)
     */
    isPermanentFailure(error) {
        // 401 - Invalid API key
        if (error.status === 401) return true;

        // 403 - Forbidden
        if (error.status === 403) return true;

        // 404 - Model not found
        if (error.status === 404) return true;

        // 503 - Service unavailable (might recover, but disable for now)
        if (error.status === 503) return true;

        // Check for quota/limit errors
        if (error.message && (
            error.message.includes('quota') ||
            error.message.includes('limit') ||
            error.message.includes('rate limit')
        )) {
            return true;
        }

        // Timeout is temporary
        if (error.timeout) return false;

        // Network errors are temporary
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') return false;

        // Default: treat as temporary
        return false;
    }

    /**
     * Mark model as failed
     */
    markFailed(modelId) {
        if (this.healthStatus[modelId]) {
            this.healthStatus[modelId].active = false;
            this.healthStatus[modelId].failCount++;
            this.healthStatus[modelId].lastFail = new Date();
        }
    }

    /**
     * Mark model as successful
     */
    markSuccess(modelId) {
        if (this.healthStatus[modelId]) {
            this.healthStatus[modelId].lastSuccess = new Date();
            this.healthStatus[modelId].failCount = 0;
        }
    }

    /**
     * Get health status of all models
     */
    getHealthStatus() {
        return this.models.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider,
            free: model.free,
            pricing: model.pricing,
            ...this.healthStatus[model.id]
        }));
    }

    /**
     * Check if any models are available
     */
    hasAvailableModels() {
        return this.models.some(m => this.healthStatus[m.id].active);
    }

    /**
     * Get Financial Datasets API key from config
     */
    getFinancialAPIKey() {
        return this.config.financial?.financialDatasetsApiKey || null;
    }

    /**
     * Get full configuration object
     */
    getConfig() {
        return this.config;
    }
}

module.exports = ModelManager;
