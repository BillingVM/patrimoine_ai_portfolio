<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clients - Portfolio AI</title>
    <link rel="icon" type="image/svg+xml" href="/portai/public/favicon.svg">
    <link rel="alternate icon" href="/portai/public/favicon.ico">

    <?php
    // Dynamic asset loading with cache busting
    $cssFile = __DIR__ . '/css/style.css';
    $cssVersion = file_exists($cssFile) ? filemtime($cssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/style.css?v={$cssVersion}\">";

    $sidebarCssFile = __DIR__ . '/css/sidebar.css';
    $sidebarCssVersion = file_exists($sidebarCssFile) ? filemtime($sidebarCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/sidebar.css?v={$sidebarCssVersion}\">";

    $creditsWidgetCssFile = __DIR__ . '/css/credits-widget.css';
    $creditsWidgetCssVersion = file_exists($creditsWidgetCssFile) ? filemtime($creditsWidgetCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";

    $luxuryCssFile = __DIR__ . '/css/theme-luxury.css';
    $luxuryCssVersion = file_exists($luxuryCssFile) ? filemtime($luxuryCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/theme-luxury.css?v={$luxuryCssVersion}\">";
    ?>

    <meta name="description" content="Manage your clients and their portfolios">

    <!-- Marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>

    <style>
    /* Multi-Client Chat Section */
    .multiclient-chat-section {
        margin-top: 3rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 12px;
        overflow: hidden;
    }

    .chat-section-header {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%);
    }

    .chat-section-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .chat-section-title h3 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary);
    }

    .chat-section-title svg {
        color: var(--accent-blue);
    }

    .chat-section-subtitle {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .multiclient-chat-container {
        padding: 2rem;
    }

    .multiclient-chat-messages {
        min-height: 120px;
        max-height: 500px;
        overflow-y: auto;
        margin-bottom: 1.5rem;
    }

    .chat-help-btn {
        width: 44px;
        height: 44px;
        background: transparent;
        border: 2px solid var(--border);
        border-radius: 10px;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .chat-help-btn:hover {
        border-color: var(--accent-blue);
        color: var(--accent-blue);
        background: rgba(59, 130, 246, 0.05);
    }

    .chat-help-tooltip {
        position: absolute;
        bottom: 100%;
        left: 0;
        margin-bottom: 0.5rem;
        background: var(--bg-primary);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        width: 350px;
        z-index: 1000;
    }

    .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--border);
    }

    .tooltip-header span {
        font-weight: 600;
        color: var(--text-primary);
    }

    .tooltip-close {
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .tooltip-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-primary);
    }

    .tooltip-examples {
        padding: 0.5rem;
    }

    .example-query {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-bottom: 0.25rem;
    }

    .example-query:hover {
        background: var(--bg-tertiary);
        border-color: var(--accent-blue);
    }

    .example-query svg {
        color: var(--accent-blue);
        flex-shrink: 0;
    }

    .multiclient-chat-input-form {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
    }

    .multiclient-chat-input-form textarea {
        flex: 1;
        padding: 0.75rem;
        background: var(--bg-tertiary);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 0.9375rem;
        resize: vertical;
        font-family: inherit;
    }

    .multiclient-chat-input-form textarea:focus {
        outline: none;
        border-color: var(--accent-blue);
    }

    .context-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid var(--accent-blue);
        border-radius: 12px;
        font-size: 0.75rem;
        color: var(--accent-blue);
    }

    .chat-message-user,
    .chat-message-assistant {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border-radius: 8px;
    }

    .chat-message-user {
        background: rgba(59, 130, 246, 0.05);
        border-left: 3px solid var(--accent-blue);
    }

    .chat-message-assistant {
        background: var(--bg-tertiary);
    }

    .chat-message-assistant .markdown-content {
        line-height: 1.6;
    }

    .chat-message-assistant .markdown-content h1,
    .chat-message-assistant .markdown-content h2,
    .chat-message-assistant .markdown-content h3 {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .chat-message-assistant .markdown-content ul,
    .chat-message-assistant .markdown-content ol {
        margin-left: 1.5rem;
    }

    .chat-message-assistant .markdown-content code {
        background: rgba(0, 0, 0, 0.2);
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
        font-size: 0.875em;
    }

    .chat-thinking {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--bg-tertiary);
        border-radius: 8px;
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .chat-thinking-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border);
        border-top-color: var(--accent-blue);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    </style>
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="container">
            <!-- Header -->
            <header class="header">
                <div class="header-left">
                    <h1>Clients</h1>
                    <p>Manage your clients and their investment portfolios</p>
                </div>
                <div class="header-actions">
                    <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                    <button class="btn btn-primary" id="addClientBtn">+ Add Client</button>
                </div>
            </header>

            <!-- Stats Summary -->
            <section class="stats-section" id="statsSection" style="display: none;">
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="totalClients">0</div>
                        <div class="stat-label">Total Clients</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="totalPortfolios">0</div>
                        <div class="stat-label">Total Portfolios</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="totalAUM">$0</div>
                        <div class="stat-label">Total AUM</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="avgPortfolioValue">$0</div>
                        <div class="stat-label">Avg Portfolio Value</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="totalHoldings">0</div>
                        <div class="stat-label">Total Holdings</div>
                    </div>
                </div>
            </section>

            <!-- Clients List -->
            <section class="clients-section">
                <div class="clients-grid" id="clientsGrid">
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3>No clients yet</h3>
                        <p>Add your first client to get started</p>
                    </div>
                </div>
            </section>

            <!-- Multi-Client Chat Section -->
            <section class="multiclient-chat-section">
                <div class="chat-section-header">
                    <div class="chat-section-title">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <h3>Ask About Your Clients</h3>
                    </div>
                    <p class="chat-section-subtitle">Query across all clients, specific portfolios, or compare performance</p>
                </div>

                <div class="multiclient-chat-container">
                    <div class="multiclient-chat-messages" id="multiClientChatMessages">
                        <!-- Messages will appear here -->
                    </div>

                    <form class="multiclient-chat-input-form" id="multiClientChatForm">
                        <button type="button" class="chat-help-btn" id="chatHelpBtn" title="Example queries">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                                <circle cx="12" cy="12" r="10" stroke-width="2"/>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-width="2" stroke-linecap="round"/>
                                <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>
                            </svg>
                        </button>
                        <textarea
                            id="multiClientChatInput"
                            placeholder="Ask about clients, portfolios, or compare performance..."
                            rows="2"
                            maxlength="2000"
                        ></textarea>
                        <button type="submit" id="multiClientSendBtn" class="chat-send-btn">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                        </button>
                    </form>

                    <!-- Help Tooltip -->
                    <div class="chat-help-tooltip" id="chatHelpTooltip" style="display: none;">
                        <div class="tooltip-header">
                            <span>Example Queries</span>
                            <button class="tooltip-close" onclick="document.getElementById('chatHelpTooltip').style.display='none'">&times;</button>
                        </div>
                        <div class="tooltip-examples">
                            <button class="example-query" data-query="What is my total AUM across all clients?">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                What is my total AUM?
                            </button>
                            <button class="example-query" data-query="Which client has the best performing portfolio?">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                </svg>
                                Best performing portfolio
                            </button>
                            <button class="example-query" data-query="Show me all portfolios with Tesla stock">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                </svg>
                                Portfolios with specific stock
                            </button>
                            <button class="example-query" data-query="Compare AAPL holdings across clients">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                </svg>
                                Compare holdings
                            </button>
                        </div>
                    </div>

                    <div class="chat-input-footer">
                        <span class="context-badge" id="contextBadge" style="display: none;"></span>
                        <span class="char-count" id="multiClientCharCount">0/2000</span>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Add/Edit Client Modal -->
    <div class="modal" id="clientModal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add New Client</h2>
                <button class="modal-close" id="modalClose">&times;</button>
            </div>
            <div class="modal-body">
            <form id="clientForm">
                <input type="hidden" id="clientId" value="">

                <div class="form-group">
                    <label for="clientName">Client Name *</label>
                    <input type="text" id="clientName" required placeholder="John Doe" autocomplete="name">
                </div>

                <div class="form-group">
                    <label for="clientEntity">Entity Type</label>
                    <select id="clientEntity">
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                        <option value="trust">Trust</option>
                        <option value="family">Family Office</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="clientEmail">Email</label>
                    <input type="email" id="clientEmail" placeholder="john@example.com" autocomplete="email">
                </div>

                <div class="form-group">
                    <label for="clientPhone">Phone</label>
                    <input type="tel" id="clientPhone" placeholder="555-0123" autocomplete="tel">
                </div>

            </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                <button type="submit" form="clientForm" class="btn btn-primary" id="submitBtn">Create Client</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast" id="toast" style="display: none;"></div>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>

    <?php
    // Dynamically load JavaScript with cache busting
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";

    $jsFile = __DIR__ . '/js/clients.js';
    $jsVersion = file_exists($jsFile) ? filemtime($jsFile) : time();
    echo "<script src=\"/portai/public/js/clients.js?v={$jsVersion}\"></script>";
    ?>

    <script>
    // Multi-Client Chat Handler
    const API_URL = 'https://sol.inoutconnect.com:11130/api';

    document.addEventListener('DOMContentLoaded', () => {
        const chatForm = document.getElementById('multiClientChatForm');
        const chatInput = document.getElementById('multiClientChatInput');
        const chatMessages = document.getElementById('multiClientChatMessages');
        const charCount = document.getElementById('multiClientCharCount');
        const contextBadge = document.getElementById('contextBadge');
        const sendBtn = document.getElementById('multiClientSendBtn');

        let isProcessing = false;

        // Update character count
        chatInput.addEventListener('input', () => {
            const length = chatInput.value.length;
            charCount.textContent = `${length}/2000`;
        });

        // Help button functionality
        const chatHelpBtn = document.getElementById('chatHelpBtn');
        const chatHelpTooltip = document.getElementById('chatHelpTooltip');

        // Toggle tooltip on help button click
        chatHelpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = chatHelpTooltip.style.display !== 'none';
            chatHelpTooltip.style.display = isVisible ? 'none' : 'block';
        });

        // Hide tooltip when clicking outside
        document.addEventListener('click', (e) => {
            if (!chatHelpTooltip.contains(e.target) && !chatHelpBtn.contains(e.target)) {
                chatHelpTooltip.style.display = 'none';
            }
        });

        // Handle example query clicks
        document.querySelectorAll('.example-query').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.dataset.query;
                chatInput.value = query;
                chatInput.focus();
                chatHelpTooltip.style.display = 'none';
                // Update character count
                charCount.textContent = `${query.length}/2000`;
            });
        });

        // Handle form submission
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const message = chatInput.value.trim();
            if (!message || isProcessing) return;

            isProcessing = true;
            sendBtn.disabled = true;

            // Add user message to chat
            addUserMessage(message);

            // Clear input
            chatInput.value = '';
            charCount.textContent = '0/2000';

            // Create thinking indicator
            const thinkingId = addThinkingMessage('Analyzing your query...');

            try {
                // Stream response from API
                const url = new URL(`${API_URL}/chat-multiclient-stream`);
                url.searchParams.append('message', message);

                const eventSource = new EventSource(url);

                eventSource.addEventListener('status', (e) => {
                    const data = JSON.parse(e.data);
                    updateThinkingMessage(thinkingId, data.message);
                });

                eventSource.addEventListener('context', (e) => {
                    const data = JSON.parse(e.data);
                    console.log('Context detected:', data);

                    // Show context badge
                    contextBadge.textContent = formatScope(data.scope);
                    contextBadge.style.display = 'inline-block';

                    updateThinkingMessage(thinkingId, `Analyzing ${formatScope(data.scope)}...`);
                });

                eventSource.addEventListener('response', (e) => {
                    const data = JSON.parse(e.data);
                    removeThinkingMessage(thinkingId);
                    addAssistantMessage(data.content, data.scope, data.entities);
                });

                eventSource.addEventListener('done', (e) => {
                    eventSource.close();
                    isProcessing = false;
                    sendBtn.disabled = false;
                });

                eventSource.addEventListener('error', (e) => {
                    console.error('SSE Error:', e);
                    eventSource.close();
                    removeThinkingMessage(thinkingId);
                    addErrorMessage('Failed to process your request. Please try again.');
                    isProcessing = false;
                    sendBtn.disabled = false;
                });

            } catch (error) {
                console.error('Chat error:', error);
                removeThinkingMessage(thinkingId);
                addErrorMessage('Failed to send message. Please try again.');
                isProcessing = false;
                sendBtn.disabled = false;
            }
        });

        // Helper functions
        function addUserMessage(content) {
            // Remove welcome message if exists
            const welcome = chatMessages.querySelector('.chat-welcome-small');
            if (welcome) welcome.remove();

            const div = document.createElement('div');
            div.className = 'chat-message-user';
            div.textContent = content;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function addAssistantMessage(content, scope, entities) {
            const div = document.createElement('div');
            div.className = 'chat-message-assistant';

            const markdownContent = document.createElement('div');
            markdownContent.className = 'markdown-content';
            markdownContent.innerHTML = marked.parse(content);

            div.appendChild(markdownContent);
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function addThinkingMessage(message) {
            const id = 'thinking-' + Date.now();
            const div = document.createElement('div');
            div.id = id;
            div.className = 'chat-thinking';
            div.innerHTML = `
                <div class="chat-thinking-spinner"></div>
                <span>${message}</span>
            `;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            return id;
        }

        function updateThinkingMessage(id, message) {
            const div = document.getElementById(id);
            if (div) {
                div.querySelector('span').textContent = message;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        function removeThinkingMessage(id) {
            const div = document.getElementById(id);
            if (div) div.remove();
        }

        function addErrorMessage(message) {
            const div = document.createElement('div');
            div.className = 'chat-message-assistant';
            div.style.borderLeft = '3px solid var(--danger)';
            div.innerHTML = `<p style="color: var(--danger);">Error: ${message}</p>`;
            chatMessages.appendChild(div);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function formatScope(scope) {
            const scopeMap = {
                'all_clients': 'All Clients',
                'specific_client': 'Specific Client',
                'specific_portfolio': 'Specific Portfolio',
                'comparison': 'Comparison',
                'multiple_clients': 'Multiple Clients',
                'solo': 'Solo Portfolios'
            };
            return scopeMap[scope] || scope;
        }
    });
    </script>
</body>
</html>
