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

        this.initializeElements();
        this.attachEventListeners();
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
            dragOverlay: document.getElementById('dragOverlay')
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

            // Include portfolio context if file is attached
            if (this.currentFileData) {
                url.searchParams.append('portfolio_id', this.currentFileData.portfolioId);
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

                    if (data.type === 'progress') {
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
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PortfolioChat();
});
