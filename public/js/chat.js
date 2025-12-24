/**
 * Portfolio AI Chat Interface
 * Professional ChatGPT-inspired chat functionality
 */

const API_URL = 'https://sol.inoutconnect.com:11130/api';

class PortfolioChat {
    constructor() {
        this.messageHistory = [];
        this.isStreaming = false;
        this.currentThinkingId = null;
        this.currentEventSource = null; // Store EventSource for stopping
        this.userScrolledUp = false; // Track if user manually scrolled up
        this.currentFile = null; // Currently selected file
        this.currentFileData = null; // Uploaded file data (portfolioId, etc.)
        this.portfolioId = null; // Current portfolio ID (can be from URL, session, or upload)
        this.urlPortfolioId = null; // Portfolio ID from URL parameter (NEVER overwritten)
        this.portfolioData = null; // Portfolio and client data
        this.currentSessionId = null; // Current chat session ID
        this.isLoadingSession = false; // Flag to prevent double-saving when loading

        this.initializeElements();
        this.attachEventListeners();
        this.checkPortfolioContext();
        this.loadChatHistory();
        this.checkPendingPrompt();
    }

    initializeElements() {
        this.elements = {
            chatForm: document.getElementById('chatForm'),
            chatInput: document.getElementById('chatInput'),
            sendBtn: document.getElementById('sendBtn'),
            chatMessages: document.getElementById('chatMessages'),
            chatContainer: document.getElementById('chatContainer'),
            charCount: document.getElementById('charCount'),
            newChatBtn: document.getElementById('newChatBtn'),
            // Upload elements
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),
            attachmentPreview: document.getElementById('attachmentPreview'),
            dragOverlay: document.getElementById('dragOverlay'),
            // Portfolio context elements
            portfolioContext: document.getElementById('portfolioContext'),
            portfolioName: document.getElementById('portfolioName'),
            clientLink: document.getElementById('clientLink')
        };
    }

    attachEventListeners() {
        // Form submission or stop button
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // If streaming, stop it; otherwise send message
            if (this.isStreaming) {
                this.stopStreaming();
            } else {
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.chatInput.addEventListener('input', (e) => {
            this.autoResizeTextarea(e.target);
            this.updateCharCount();
        });

        // Enter to send (Shift+Enter for new line)
        this.elements.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // New chat button
        this.elements.newChatBtn.addEventListener('click', () => {
            this.startNewChat();
        });

        // Detect manual scrolling
        this.elements.chatContainer.addEventListener('scroll', () => {
            this.checkScrollPosition();
        });

        // ==================== UPLOAD EVENT LISTENERS ====================

        // Upload button click
        this.elements.uploadBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // File input change
        this.elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });

        // Drag and drop
        this.elements.chatContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.elements.dragOverlay.style.display = 'flex';
        });

        this.elements.dragOverlay.addEventListener('dragleave', (e) => {
            if (e.target === this.elements.dragOverlay) {
                this.elements.dragOverlay.style.display = 'none';
            }
        });

        this.elements.dragOverlay.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.elements.dragOverlay.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.dragOverlay.style.display = 'none';
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelection(e.dataTransfer.files[0]);
            }
        });

        // Remove attachment
        const removeBtn = this.elements.attachmentPreview.querySelector('.attachment-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.removeAttachment();
            });
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }

    updateCharCount() {
        const count = this.elements.chatInput.value.length;
        this.elements.charCount.textContent = `${count}/4000`;
    }

    /**
     * Check if portfolio context exists in URL and load it
     */
    async checkPortfolioContext() {
        const urlParams = new URLSearchParams(window.location.search);
        // Support both 'portfolio' and 'portfolio_id' parameter names
        const urlPortfolioId = urlParams.get('portfolio') || urlParams.get('portfolio_id');

        if (urlPortfolioId) {
            this.portfolioId = urlPortfolioId;
            this.urlPortfolioId = urlPortfolioId; // Store separately to prevent overwriting
        }

        if (!this.portfolioId) return;

        try {
            // Fetch portfolio details
            const response = await fetch(`${API_URL}/portfolio/${this.portfolioId}`);
            const data = await response.json();

            if (!data.success || !data.portfolio) return;

            this.portfolioData = data.portfolio;

            // Fetch client details if client_id exists
            if (this.portfolioData.client_id) {
                const clientResponse = await fetch(`${API_URL}/clients/${this.portfolioData.client_id}`);
                const clientData = await clientResponse.json();

                if (clientData.success) {
                    this.portfolioData.client = clientData.client;
                }
            }

            // Display portfolio context
            this.displayPortfolioContext();
        } catch (error) {
            console.error('Error loading portfolio context:', error);
        }
    }

    /**
     * Display portfolio context header
     */
    displayPortfolioContext() {
        if (!this.portfolioData) return;

        const portfolioName = this.portfolioData.portfolio_name || this.portfolioData.original_name;
        this.elements.portfolioName.textContent = portfolioName;

        if (this.portfolioData.client) {
            this.elements.clientLink.textContent = this.portfolioData.client.name;
            this.elements.clientLink.href = `client-detail.php?id=${this.portfolioData.client.id}`;
        } else {
            this.elements.clientLink.parentElement.style.display = 'none';
        }

        this.elements.portfolioContext.style.display = 'flex';

        // Set the portfolio context for file uploads (so it's included in chat)
        this.currentFileData = {
            portfolioId: this.portfolioData.id,
            filename: this.portfolioData.filename,
            originalName: portfolioName,
            fileType: this.portfolioData.file_type
        };
    }

    checkPendingPrompt() {
        const pendingPrompt = sessionStorage.getItem('pendingPrompt');
        if (pendingPrompt) {
            sessionStorage.removeItem('pendingPrompt');
            this.elements.chatInput.value = pendingPrompt;
            this.updateCharCount();
            this.sendMessage();
        }
    }

    async sendMessage() {
        const message = this.elements.chatInput.value.trim();

        // Allow sending with just a file attachment (no message required)
        if ((!message && !this.currentFileData) || this.isStreaming) return;

        // Use default message if only file is attached
        let messageText = message;
        if (!messageText && this.currentFileData) {
            messageText = `Analyze this file: ${this.currentFileData.filename || 'uploaded file'}`;
        }

        // Clear welcome message on first interaction
        const welcomeMsg = this.elements.chatMessages.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // Add user message to UI
        this.addUserMessage(messageText);

        // Clear input
        this.elements.chatInput.value = '';
        this.elements.chatInput.style.height = 'auto';
        this.updateCharCount();

        // Mark as streaming and update button to STOP
        this.isStreaming = true;
        this.userScrolledUp = false; // Reset scroll tracking for new message
        this.updateSendButton();

        // Show thinking indicator
        this.showThinkingIndicator();

        try {
            // Use Server-Sent Events for real-time progress
            const url = new URL(`${API_URL}/chat-stream`);
            url.searchParams.append('message', messageText);
            url.searchParams.append('history', JSON.stringify(this.messageHistory));

            // Include portfolio context if available (URL parameter takes priority)
            const portfolioId = this.urlPortfolioId || this.portfolioId || (this.currentFileData ? this.currentFileData.portfolioId : null);
            if (portfolioId) {
                url.searchParams.append('portfolio_id', portfolioId);
                console.log(`📎 Including portfolio_id=${portfolioId} in request (URL: ${this.urlPortfolioId}, Current: ${this.portfolioId})`);
            }

            const eventSource = new EventSource(url.toString());
            this.currentEventSource = eventSource; // Store for stopping
            let finalResult = null;
            let streamingMessageEl = null;
            let streamingContent = '';

            eventSource.onmessage = (event) => {
                if (event.data === '[DONE]') {
                    eventSource.close();
                    this.currentEventSource = null;
                    this.removeThinkingIndicator();

                    if (finalResult && finalResult.success) {
                        // If we were streaming, the message is already displayed
                        if (streamingMessageEl) {
                            // Show copy button now that streaming is complete
                            const copyBtn = streamingMessageEl.querySelector('.copy-button');
                            if (copyBtn) {
                                copyBtn.style.display = 'inline-flex';
                            }
                            // Remove streaming class
                            streamingMessageEl.classList.remove('streaming');
                        } else {
                            // No streaming occurred, add message normally
                            this.addAssistantMessage(finalResult.response);
                        }

                        // Update message history
                        this.messageHistory.push(
                            { role: 'user', content: messageText },
                            { role: 'assistant', content: streamingContent || finalResult.response }
                        );

                        // Create session if first message, then save messages
                        (async () => {
                            await this.createSession(messageText);
                            await this.saveMessage('user', messageText);
                            await this.saveMessage('assistant', streamingContent || finalResult.response);
                        })();
                    }

                    this.isStreaming = false;
                    this.updateSendButton();

                    // Clear attachment after successful send
                    if (this.currentFileData) {
                        this.removeAttachment();
                    }

                    this.elements.chatInput.focus();
                    return;
                }

                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'insufficient_credits') {
                        // Handle insufficient credits - show topup modal
                        eventSource.close();
                        this.currentEventSource = null;
                        this.removeThinkingIndicator();
                        this.showInsufficientCreditsModal(data.balance);
                        this.isStreaming = false;
                        this.updateSendButton();
                        this.elements.chatInput.focus();
                    } else if (data.type === 'progress') {
                        // Update thinking indicator with progress
                        this.updateThinkingIndicator(data.message, data.progress);
                    } else if (data.type === 'token') {
                        // Handle streaming token
                        if (!streamingMessageEl) {
                            // Create streaming message element on first token
                            this.removeThinkingIndicator();
                            streamingMessageEl = this.createStreamingMessage();
                        }

                        // Append token to streaming content
                        streamingContent += data.token;
                        this.appendToStreamingMessage(streamingMessageEl, streamingContent);
                    } else if (data.type === 'result') {
                        // Store final result
                        finalResult = data;
                    } else if (data.type === 'error') {
                        eventSource.close();
                        this.currentEventSource = null;
                        this.removeThinkingIndicator();
                        this.showError(data.message || 'Failed to get response');
                        this.isStreaming = false;
                        this.updateSendButton();
                        this.elements.chatInput.focus();
                    }
                } catch (parseError) {
                    console.error('Error parsing SSE data:', parseError);
                }
            };

            eventSource.onerror = (error) => {
                console.error('SSE error:', error);
                eventSource.close();
                this.currentEventSource = null;
                this.removeThinkingIndicator();
                this.showError('Connection lost. Please try again.');
                this.isStreaming = false;
                this.updateSendButton();
                this.elements.chatInput.focus();
            };

        } catch (error) {
            console.error('Chat error:', error);
            this.currentEventSource = null;
            this.removeThinkingIndicator();
            this.showError('Failed to connect to AI assistant. Please check your connection and try again.');
            this.isStreaming = false;
            this.updateSendButton();
            this.elements.chatInput.focus();
        }
    }

    addUserMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message user';
        messageEl.innerHTML = `
            <div class="chat-message-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${this.escapeHtml(text)}</div>
                <button class="copy-button" title="Copy to clipboard">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
        `;

        // Add copy functionality
        const copyBtn = messageEl.querySelector('.copy-button');
        copyBtn.addEventListener('click', () => this.copyToClipboard(text, copyBtn));

        this.elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    addAssistantMessage(text) {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message assistant';
        messageEl.innerHTML = `
            <div class="chat-message-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text">${this.formatMessage(text)}</div>
                <button class="copy-button" title="Copy to clipboard">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
        `;

        // Add copy functionality
        const copyBtn = messageEl.querySelector('.copy-button');
        copyBtn.addEventListener('click', () => this.copyToClipboard(text, copyBtn));

        this.elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
    }

    createStreamingMessage() {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message assistant streaming';
        messageEl.innerHTML = `
            <div class="chat-message-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text"></div>
                <button class="copy-button" title="Copy to clipboard" style="display: none;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy</span>
                </button>
            </div>
        `;

        this.elements.chatMessages.appendChild(messageEl);
        this.scrollToBottom();
        return messageEl;
    }

    appendToStreamingMessage(messageEl, fullContent) {
        const textEl = messageEl.querySelector('.chat-message-text');
        const copyBtn = messageEl.querySelector('.copy-button');

        // Update content with formatted markdown
        textEl.innerHTML = this.formatMessage(fullContent);

        // Show copy button once streaming is complete (handled by final result)
        // For now, just update the copy button event listener
        copyBtn.onclick = () => this.copyToClipboard(fullContent, copyBtn);

        // Auto-scroll to bottom
        this.scrollToBottom();
    }

    showThinkingIndicator() {
        // CRITICAL FIX: Remove any existing thinking indicator first
        this.removeThinkingIndicator();

        // Create unique ID for this thinking indicator
        this.currentThinkingId = `thinking-${Date.now()}`;

        const thinkingEl = document.createElement('div');
        thinkingEl.id = this.currentThinkingId;
        thinkingEl.className = 'chat-message assistant';
        thinkingEl.innerHTML = `
            <div class="chat-message-avatar">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="thinking-indicator">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="thinking-spinner">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <div class="thinking-content">
                        <span class="thinking-status">Starting AI pipeline...</span>
                        <div class="thinking-progress">
                            <div class="thinking-progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(thinkingEl);
        this.scrollToBottom();
    }

    updateThinkingIndicator(message, progress = 0) {
        if (!this.currentThinkingId) return;

        const thinkingEl = document.getElementById(this.currentThinkingId);
        if (!thinkingEl) return;

        const statusEl = thinkingEl.querySelector('.thinking-status');
        const progressBar = thinkingEl.querySelector('.thinking-progress-bar');

        if (statusEl) {
            statusEl.textContent = message;
        }

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        this.scrollToBottom();
    }

    removeThinkingIndicator() {
        // CRITICAL FIX: Remove by ID to ensure only current thinking indicator is removed
        if (this.currentThinkingId) {
            const indicator = document.getElementById(this.currentThinkingId);
            if (indicator) {
                indicator.remove();
            }
            this.currentThinkingId = null;
        }

        // Also remove any orphaned thinking indicators (safety cleanup)
        const orphanedIndicators = this.elements.chatMessages.querySelectorAll('[id^="thinking-"]');
        orphanedIndicators.forEach(el => el.remove());
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'chat-message assistant';
        errorEl.innerHTML = `
            <div class="chat-message-avatar" style="background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="chat-error">
                    <strong>Error:</strong> ${this.escapeHtml(message)}
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(errorEl);
        this.scrollToBottom();
    }

    showMaintenancePage() {
        this.elements.chatMessages.innerHTML = `
            <div class="maintenance-page">
                <div class="maintenance-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="80" height="80">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
                <h2>Under Maintenance</h2>
                <p>Our AI assistant is currently undergoing maintenance.</p>
                <p class="maintenance-subtext">We're working hard to get things back online. Please check back in a few minutes.</p>
                <button class="btn btn-primary maintenance-refresh-btn" onclick="window.location.reload()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Page
                </button>
            </div>
        `;
        this.scrollToBottom();
    }

    startNewChat() {
        // Clear messages and history
        this.messageHistory = [];
        this.currentSessionId = null; // Clear current session
        this.elements.chatMessages.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <h2>Welcome to AI Assistant</h2>
                <p>Ask me anything about your portfolio, clients, or financial analysis</p>
            </div>
        `;

        this.elements.chatInput.value = '';
        this.updateCharCount();
        this.elements.chatInput.focus();

        // Reload chat history to refresh UI
        this.loadChatHistory();
    }

    checkScrollPosition() {
        const container = this.elements.chatContainer;
        const threshold = 100; // pixels from bottom

        // Check if user is near the bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

        // If user scrolled up from bottom, mark it
        this.userScrolledUp = !isNearBottom;
    }

    scrollToBottom(force = false) {
        // Only auto-scroll if user hasn't scrolled up OR if forced
        if (force || !this.userScrolledUp) {
            requestAnimationFrame(() => {
                this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
            });
        }
    }

    formatMessage(text) {
        // Use marked.js to render markdown
        if (typeof marked !== 'undefined') {
            // Configure marked for better rendering
            marked.setOptions({
                breaks: true,
                gfm: true, // GitHub Flavored Markdown
                tables: true
            });
            return marked.parse(text);
        }

        // Fallback: Basic formatting if marked.js not available
        return text
            .split('\n\n')
            .map(para => `<p>${this.escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateSendButton() {
        if (this.isStreaming) {
            // Show STOP button
            this.elements.sendBtn.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <rect x="6" y="6" width="12" height="12" stroke-width="2" rx="2" />
                </svg>
            `;
            this.elements.sendBtn.title = 'Stop generating';
            this.elements.sendBtn.classList.add('stop-mode');
            this.elements.sendBtn.disabled = false;
        } else {
            // Show SEND button
            this.elements.sendBtn.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            `;
            this.elements.sendBtn.title = 'Send message';
            this.elements.sendBtn.classList.remove('stop-mode');
            this.elements.sendBtn.disabled = false;
        }
    }

    stopStreaming() {
        if (!this.isStreaming || !this.currentEventSource) return;

        console.log('🛑 User stopped streaming');

        // Close EventSource connection
        this.currentEventSource.close();
        this.currentEventSource = null;

        // Clean up UI
        this.removeThinkingIndicator();

        // Reset state
        this.isStreaming = false;
        this.updateSendButton();
        this.elements.chatInput.focus();

        // Show message that streaming was stopped
        const stopMessage = document.createElement('div');
        stopMessage.className = 'chat-message assistant';
        stopMessage.innerHTML = `
            <div class="chat-message-avatar" style="background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" stroke-width="2" rx="2" />
                </svg>
            </div>
            <div class="chat-message-content">
                <div class="chat-message-text" style="color: var(--text-muted); font-style: italic;">
                    Response stopped by user
                </div>
            </div>
        `;
        this.elements.chatMessages.appendChild(stopMessage);
        this.scrollToBottom(true);
    }

    async copyToClipboard(text, button) {
        try {
            // Use Clipboard API to copy text
            await navigator.clipboard.writeText(text);

            // Store original button content
            const originalHTML = button.innerHTML;

            // Show success feedback
            button.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Copied!</span>
            `;
            button.classList.add('copied');

            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);

            // Show error feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Failed</span>
            `;
            button.classList.add('copy-failed');

            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copy-failed');
            }, 2000);
        }
    }

    // ==================== FILE UPLOAD METHODS ====================

    async handleFileSelection(file) {
        // Validate file type
        const allowedTypes = ['csv', 'xlsx', 'xls', 'pdf', 'json', 'docx', 'doc', 'txt', 'jpg', 'jpeg', 'png', 'tiff', 'tif', 'bmp'];
        const fileExt = file.name.split('.').pop().toLowerCase();

        if (!allowedTypes.includes(fileExt)) {
            this.showError(`File type .${fileExt} is not supported`);
            return;
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size exceeds 10MB limit');
            return;
        }

        this.currentFile = file;
        this.showAttachmentPreview(file);
        await this.uploadFile(file);
    }

    showAttachmentPreview(file) {
        const preview = this.elements.attachmentPreview;
        preview.style.display = 'block';
        preview.classList.remove('success', 'error');
        preview.classList.add('uploading');

        const nameEl = preview.querySelector('.attachment-name');
        const sizeEl = preview.querySelector('.attachment-size');
        const iconEl = preview.querySelector('.attachment-icon');

        nameEl.textContent = file.name;
        sizeEl.textContent = this.formatFileSize(file.size);

        // Show thumbnail for images
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
            const reader = new FileReader();
            reader.onload = (e) => {
                iconEl.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
            };
            reader.readAsDataURL(file);
        } else {
            iconEl.innerHTML = this.getFileIcon(fileExt);
        }
    }

    async uploadFile(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.currentFileData = {
                    portfolioId: data.portfolio.id,
                    filename: data.portfolio.filename,
                    originalName: data.portfolio.fileType,
                    fileType: data.portfolio.fileType
                };

                // Show success
                this.elements.attachmentPreview.classList.remove('uploading');
                this.elements.attachmentPreview.classList.add('success');

                // Trigger portfolio detection
                await this.detectPortfolio(data.portfolio.id);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError(`Upload failed: ${error.message}`);
            this.elements.attachmentPreview.classList.remove('uploading');
            this.elements.attachmentPreview.classList.add('error');
        }
    }

    async detectPortfolio(portfolioId) {
        try {
            const response = await fetch(`${API_URL}/portfolio/detect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolioId })
            });

            const data = await response.json();

            if (data.success && data.detection.isPortfolio) {
                this.showPortfolioDialog(data);
            }
        } catch (error) {
            console.error('Portfolio detection error:', error);
            // Fail silently - file already uploaded
        }
    }

    showPortfolioDialog(detectionData) {
        const detection = detectionData.detection;

        const dialog = document.createElement('div');
        dialog.className = 'portfolio-dialog-overlay';
        dialog.innerHTML = `
            <div class="portfolio-dialog">
                <div class="portfolio-dialog-header">
                    <h3>📊 Portfolio Detected!</h3>
                    <button class="portfolio-dialog-close" type="button">&times;</button>
                </div>
                <div class="portfolio-dialog-body">
                    <p>This appears to be a <strong>${detection.portfolioType}</strong>.</p>

                    <div class="form-group">
                        <label>Portfolio Name</label>
                        <input type="text" id="portfolioNameInput" class="form-input" value="${this.escapeHtml(detection.suggestedTitle)}">
                    </div>

                    <div class="form-group">
                        <label>Assign to Client (Optional)</label>
                        <select id="portfolioClientSelect" class="form-select">
                            <option value="">No client</option>
                        </select>
                    </div>
                </div>
                <div class="portfolio-dialog-footer">
                    <button class="btn btn-secondary portfolio-dialog-cancel" type="button">Skip</button>
                    <button class="btn btn-primary portfolio-dialog-save" type="button">Save Portfolio</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Load clients
        this.loadClientsForDialog();

        // Event listeners
        dialog.querySelector('.portfolio-dialog-close').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.portfolio-dialog-cancel').addEventListener('click', () => dialog.remove());

        dialog.querySelector('.portfolio-dialog-save').addEventListener('click', async () => {
            const name = document.getElementById('portfolioNameInput').value.trim();
            const clientId = document.getElementById('portfolioClientSelect').value;

            if (name) {
                await this.savePortfolioMetadata(detectionData.portfolio.id, name, clientId);
                dialog.remove();
            }
        });
    }

    async loadClientsForDialog() {
        try {
            const response = await fetch(`${API_URL}/clients`);
            const data = await response.json();

            if (data.success) {
                const select = document.getElementById('portfolioClientSelect');
                data.clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load clients:', error);
        }
    }

    async savePortfolioMetadata(portfolioId, name, clientId) {
        try {
            const response = await fetch(`${API_URL}/portfolio/${portfolioId}/metadata`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, clientId: clientId || null })
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccess(`Portfolio "${name}" saved successfully!`);
            }
        } catch (error) {
            this.showError('Failed to save portfolio');
        }
    }

    removeAttachment() {
        this.currentFile = null;
        this.currentFileData = null;
        this.elements.attachmentPreview.style.display = 'none';
        this.elements.attachmentPreview.classList.remove('uploading', 'success', 'error');
        this.elements.fileInput.value = '';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    getFileIcon(fileExt) {
        return `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccess(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.background = '#10b981';
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    showError(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.background = '#ef4444';
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Show insufficient credits modal with topup option
     */
    showInsufficientCreditsModal(balance) {
        // Show the add credits modal
        const modal = document.getElementById('addCreditsModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');

            // Update modal header to show depletion message
            const modalHeader = modal.querySelector('.modal-header h2');
            if (modalHeader) {
                modalHeader.innerHTML = `
                    <span style="color: #ef4444;">⚠️ Insufficient Credits</span>
                `;
            }

            // Add/update depletion message
            const modalBody = modal.querySelector('.modal-body');
            let depletionMsg = modalBody.querySelector('.credits-depletion-message');

            if (!depletionMsg) {
                depletionMsg = document.createElement('div');
                depletionMsg.className = 'credits-depletion-message';
                modalBody.insertBefore(depletionMsg, modalBody.firstChild);
            }

            depletionMsg.innerHTML = `
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px;">
                    <strong>Your credit balance is depleted (${balance} credits remaining).</strong><br>
                    Please purchase credits to continue using the AI assistant.
                </p>
            `;

            // Show error toast as well
            this.showError('Insufficient credits. Please purchase credits to continue.');
        } else {
            // Fallback if modal doesn't exist
            this.showError('Insufficient credits. Please add credits to continue using the AI assistant.');
        }
    }

    // ==================== CHAT SESSION MANAGEMENT ====================

    /**
     * Placeholder for backward compatibility
     */
    async loadChatHistory() {
        // Modal-based history, no sidebar to load
        console.log('Chat history uses modal (opened via sidebar button)');
    }

    /**
     * Open chat history modal and load tabs
     */
    async openChatHistoryModal() {
        const modal = document.getElementById('chatHistoryModal');
        if (!modal) return;

        modal.style.display = 'flex';

        // Load all sessions grouped by portfolio
        try {
            const response = await fetch(`${API_URL}/chat/sessions`);
            const data = await response.json();

            if (data.success) {
                this.renderHistoryTabs(data.sessions);
                this.loadTabContent('general', null); // Load first tab (General)
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
            document.getElementById('historyTabContent').innerHTML = `
                <div class="history-error">Failed to load chat history. Please try again.</div>
            `;
        }
    }

    /**
     * Close chat history modal
     */
    closeChatHistoryModal() {
        const modal = document.getElementById('chatHistoryModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Render tabs for General + Portfolio chats
     */
    renderHistoryTabs(sessions) {
        const tabsContainer = document.getElementById('historyTabs');
        if (!tabsContainer) return;

        let tabsHtml = `
            <div class="history-tab active" data-tab="general" data-portfolio-id="null">
                💬 General Chats
                ${sessions.general && sessions.general.length > 0 ? `<span class="tab-badge">${sessions.general.length}</span>` : ''}
            </div>
        `;

        // Add portfolio tabs
        if (sessions.byPortfolio && sessions.byPortfolio.length > 0) {
            sessions.byPortfolio.forEach(portfolio => {
                tabsHtml += `
                    <div class="history-tab" data-tab="portfolio" data-portfolio-id="${portfolio.portfolioId}">
                        📊 ${this.escapeHtml(portfolio.portfolioName)}
                        <span class="tab-badge">${portfolio.sessions.length}</span>
                    </div>
                `;
            });
        }

        tabsContainer.innerHTML = tabsHtml;

        // Add click handlers to tabs
        const tabs = tabsContainer.querySelectorAll('.history-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add active to clicked tab
                tab.classList.add('active');

                // Load tab content
                const tabType = tab.dataset.tab;
                const portfolioIdStr = tab.dataset.portfolioId;

                // Handle null/general case properly
                let portfolioId = null;
                if (portfolioIdStr && portfolioIdStr !== 'null') {
                    const parsed = parseInt(portfolioIdStr);
                    if (!isNaN(parsed)) {
                        portfolioId = parsed;
                    }
                }

                this.loadTabContent(tabType, portfolioId);
            });
        });
    }

    /**
     * Load paginated sessions for a specific tab
     */
    async loadTabContent(tabType, portfolioId, page = 1) {
        const contentContainer = document.getElementById('historyTabContent');
        const paginationContainer = document.getElementById('historyPagination');

        if (!contentContainer) return;

        // Show loading
        contentContainer.innerHTML = '<div class="history-loading">Loading chat history...</div>';
        paginationContainer.style.display = 'none';

        try {
            const limit = 20;
            const offset = (page - 1) * limit;

            // Build query string
            const params = new URLSearchParams({
                limit: limit,
                offset: offset
            });

            // Only add portfolio_id if it's a valid number
            if (portfolioId !== null && portfolioId !== undefined && !isNaN(portfolioId) && portfolioId > 0) {
                params.append('portfolio_id', portfolioId);
            } else {
                params.append('general', 'true'); // Flag for general chats
            }

            const response = await fetch(`${API_URL}/chat/sessions/paginated?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                this.renderSessionList(data.sessions, contentContainer);
                this.renderPagination(data, page, tabType, portfolioId, paginationContainer);
            } else {
                contentContainer.innerHTML = '<div class="history-error">Failed to load chat history.</div>';
            }
        } catch (error) {
            console.error('Error loading tab content:', error);
            contentContainer.innerHTML = '<div class="history-error">Failed to load chat history. Please try again.</div>';
        }
    }

    /**
     * Render list of chat sessions
     */
    renderSessionList(sessions, container) {
        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>No chat history yet</p>
                    <p class="history-empty-hint">Start a conversation to see it here!</p>
                </div>
            `;
            return;
        }

        let html = '<div class="history-list">';

        sessions.forEach(session => {
            const date = new Date(session.last_message_at || session.created_at);
            const timeAgo = this.formatTimeAgo(date);
            const isActive = session.id === this.currentSessionId;

            html += `
                <div class="history-chat-item ${isActive ? 'active' : ''}" data-session-id="${session.id}">
                    <div class="history-chat-content">
                        <div class="history-chat-title">${this.escapeHtml(session.title)}</div>
                        <div class="history-chat-meta">
                            <span>${session.message_count || 0} messages</span>
                            <span>•</span>
                            <span>${timeAgo}</span>
                        </div>
                        ${session.last_message_preview ? `
                            <div class="history-chat-preview">${this.escapeHtml(session.last_message_preview.substring(0, 80))}${session.last_message_preview.length > 80 ? '...' : ''}</div>
                        ` : ''}
                    </div>
                    <button class="history-delete-btn" data-session-id="${session.id}" title="Delete chat">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.history-chat-item').forEach(item => {
            const sessionId = parseInt(item.dataset.sessionId);

            // Click on chat item to load
            item.querySelector('.history-chat-content').addEventListener('click', () => {
                this.loadSession(sessionId);
                this.closeChatHistoryModal();
            });

            // Click on delete button
            item.querySelector('.history-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent loading session
                this.showDeleteConfirmation(sessionId);
            });
        });
    }

    /**
     * Render pagination controls
     */
    renderPagination(data, currentPage, tabType, portfolioId, container) {
        if (data.totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        const prevBtn = document.getElementById('historyPrevPage');
        const nextBtn = document.getElementById('historyNextPage');
        const pageInfo = document.getElementById('historyPageInfo');

        if (pageInfo) {
            pageInfo.textContent = `Page ${currentPage} of ${data.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => {
                if (currentPage > 1) {
                    this.loadTabContent(tabType, portfolioId, currentPage - 1);
                }
            };
        }

        if (nextBtn) {
            nextBtn.disabled = currentPage >= data.totalPages;
            nextBtn.onclick = () => {
                if (currentPage < data.totalPages) {
                    this.loadTabContent(tabType, portfolioId, currentPage + 1);
                }
            };
        }
    }

    /**
     * Show delete confirmation dialog
     */
    showDeleteConfirmation(sessionId) {
        const dialog = document.createElement('div');
        dialog.className = 'delete-confirm-overlay';
        dialog.innerHTML = `
            <div class="delete-confirm-dialog">
                <h3>Delete Chat?</h3>
                <p>This action cannot be undone. All messages in this chat will be permanently deleted.</p>
                <div class="delete-confirm-actions">
                    <button class="btn btn-secondary" id="deleteCancelBtn">Cancel</button>
                    <button class="btn btn-danger" id="deleteConfirmBtn">Delete</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Cancel button
        dialog.querySelector('#deleteCancelBtn').addEventListener('click', () => {
            dialog.remove();
        });

        // Confirm delete button
        dialog.querySelector('#deleteConfirmBtn').addEventListener('click', async () => {
            dialog.remove();
            await this.deleteSession(sessionId);
        });

        // Click outside to close
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    /**
     * Delete a chat session
     */
    async deleteSession(sessionId) {
        try {
            const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Chat deleted successfully');

                // If deleted chat was current session, reset
                if (sessionId === this.currentSessionId) {
                    this.startNewChat();
                }

                // Reload modal content
                this.openChatHistoryModal();
            } else {
                this.showError('Failed to delete chat');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showError('Failed to delete chat. Please try again.');
        }
    }

    /**
     * Format time ago string
     */
    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    /**
     * Create a new session or use existing one
     */
    async createSession(firstMessage) {
        if (this.currentSessionId) {
            return this.currentSessionId; // Already have a session
        }

        try {
            const title = firstMessage.substring(0, 50);
            const response = await fetch(`${API_URL}/chat/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    portfolioId: this.portfolioId || null
                })
            });

            const data = await response.json();

            if (data.success) {
                this.currentSessionId = data.session.id;
                console.log(`✅ Created session #${this.currentSessionId}`);

                // Reload history to show new session
                this.loadChatHistory();

                return this.currentSessionId;
            }
        } catch (error) {
            console.error('Error creating session:', error);
        }

        return null;
    }

    /**
     * Save a message to the current session
     */
    async saveMessage(role, content, metadata = {}) {
        if (!this.currentSessionId || this.isLoadingSession) {
            return; // No session yet or loading existing session
        }

        try {
            await fetch(`${API_URL}/chat/sessions/${this.currentSessionId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role,
                    content,
                    metadata
                })
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    /**
     * Load an existing session
     */
    async loadSession(sessionId) {
        try {
            this.isLoadingSession = true;

            const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`);
            const data = await response.json();

            if (data.success) {
                const session = data.session;

                // Clear current chat
                this.elements.chatMessages.innerHTML = '';
                this.messageHistory = [];
                this.currentSessionId = session.id;

                // Set portfolio context if session has one (but don't overwrite URL parameter)
                if (session.portfolio_id && !this.urlPortfolioId) {
                    this.portfolioId = session.portfolio_id;
                }

                // Render all messages
                session.messages.forEach(msg => {
                    if (msg.role === 'user') {
                        this.addUserMessage(msg.content);
                    } else if (msg.role === 'assistant') {
                        this.addAssistantMessage(msg.content);
                    }

                    // Add to history for context
                    this.messageHistory.push({
                        role: msg.role,
                        content: msg.content
                    });
                });

                // Reload history to update active state
                this.loadChatHistory();

                this.scrollToBottom();
                console.log(`✅ Loaded session #${sessionId} with ${session.messages.length} messages`);
            }

            this.isLoadingSession = false;

        } catch (error) {
            console.error('Error loading session:', error);
            this.isLoadingSession = false;
        }
    }
}

// Global function to open chat history modal (called from sidebar button)
function openChatHistoryModal() {
    if (window.chatInstance) {
        window.chatInstance.openChatHistoryModal();
    }
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatInstance = new PortfolioChat();

    // Modal close button event listener
    const modalCloseBtn = document.getElementById('chatHistoryModalClose');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            window.chatInstance.closeChatHistoryModal();
        });
    }

    // Close modal when clicking outside
    const modal = document.getElementById('chatHistoryModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.chatInstance.closeChatHistoryModal();
            }
        });
    }
});
