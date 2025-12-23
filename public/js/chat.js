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
            newChatBtn: document.getElementById('newChatBtn')
        };
    }

    attachEventListeners() {
        // Form submission
        this.elements.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
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
        if (!message || this.isStreaming) return;

        // Clear welcome message on first interaction
        const welcomeMsg = this.elements.chatMessages.querySelector('.chat-welcome');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        // Add user message to UI
        this.addUserMessage(message);

        // Clear input
        this.elements.chatInput.value = '';
        this.elements.chatInput.style.height = 'auto';
        this.updateCharCount();

        // Disable send button
        this.isStreaming = true;
        this.elements.sendBtn.disabled = true;

        // Show thinking indicator
        this.showThinkingIndicator();

        try {
            // Send message to API
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    history: this.messageHistory
                })
            });

            const data = await response.json();

            // Remove thinking indicator
            this.removeThinkingIndicator();

            if (data.success) {
                // Add assistant response
                this.addAssistantMessage(data.response);

                // Update message history
                this.messageHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
            } else {
                // Handle specific error cases
                if (data.maintenanceMode) {
                    this.showMaintenancePage();
                } else if (data.needsPayment) {
                    this.showError('Your credit balance is depleted. Please add more credits to continue chatting.');
                } else if (data.needsSetup) {
                    this.showError('The AI assistant is currently being set up. Please contact your administrator or try again later.');
                } else {
                    this.showError(data.message || 'Failed to get response');
                }
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeThinkingIndicator();

            // Try to parse error response
            if (error.message && error.message.includes('503')) {
                this.showError('The AI assistant is currently unavailable. Please contact your administrator.');
            } else {
                this.showError('Failed to connect to AI assistant. Please check your connection and try again.');
            }
        } finally {
            this.isStreaming = false;
            this.elements.sendBtn.disabled = false;
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
            </div>
        `;

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
            </div>
        `;

        this.elements.chatMessages.appendChild(messageEl);
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
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Thinking...</span>
                </div>
            </div>
        `;

        this.elements.chatMessages.appendChild(thinkingEl);
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

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.chatContainer.scrollTop = this.elements.chatContainer.scrollHeight;
        });
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
}

// Initialize chat when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PortfolioChat();
});
