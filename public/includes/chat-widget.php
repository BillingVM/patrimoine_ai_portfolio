<!-- Chat Widget - Quick Prompt Interface -->
<div class="chat-widget" id="chatWidget">
    <button class="chat-widget-trigger" id="chatWidgetTrigger" title="Ask AI Assistant">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
    </button>

    <div class="chat-widget-popup" id="chatWidgetPopup">
        <div class="chat-widget-header">
            <div class="chat-widget-title">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI Assistant</span>
            </div>
            <button class="chat-widget-close" id="chatWidgetClose">&times;</button>
        </div>

        <div class="chat-widget-body">
            <p class="chat-widget-description">Ask me anything about your portfolio, clients, or financial analysis.</p>

            <div class="chat-suggestions">
                <button class="chat-suggestion" data-prompt="Analyze my recent portfolio performance">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span>Analyze portfolio performance</span>
                </button>
                <button class="chat-suggestion" data-prompt="Summarize my client activity this month">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span>Client activity summary</span>
                </button>
                <button class="chat-suggestion" data-prompt="What are the key metrics I should focus on?">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Key metrics to focus on</span>
                </button>
            </div>

            <form class="chat-widget-form" id="chatWidgetForm">
                <textarea
                    id="chatWidgetInput"
                    placeholder="Type your question here..."
                    rows="3"
                    maxlength="1000"
                ></textarea>
                <button type="submit" class="chat-widget-send">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                </button>
            </form>
        </div>
    </div>
</div>

<style>
/* Chat Widget Styling */
.chat-widget {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 1000;
}

.chat-widget-trigger {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%);
    border: none;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
    transition: all 0.3s ease;
}

.chat-widget-trigger:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 28px rgba(59, 130, 246, 0.5);
}

.chat-widget-popup {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 380px;
    max-height: 600px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-primary);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: all 0.3s ease;
}

.chat-widget-popup.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.chat-widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-primary);
}

.chat-widget-title {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.chat-widget-title svg {
    color: var(--accent-blue);
}

.chat-widget-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.chat-widget-close:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.chat-widget-body {
    padding: 1.5rem;
}

.chat-widget-description {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 1.25rem;
    line-height: 1.5;
}

.chat-suggestions {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
}

.chat-suggestion {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-primary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.chat-suggestion:hover {
    background: var(--bg-primary);
    border-color: var(--accent-blue);
    color: var(--text-primary);
}

.chat-suggestion svg {
    flex-shrink: 0;
    color: var(--accent-blue);
}

.chat-widget-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.chat-widget-form textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-primary);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    font-family: inherit;
    resize: none;
    transition: all 0.2s ease;
}

.chat-widget-form textarea:focus {
    outline: none;
    border-color: var(--accent-blue);
    background: var(--bg-primary);
}

.chat-widget-form textarea::placeholder {
    color: var(--text-muted);
}

.chat-widget-send {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.chat-widget-send:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.chat-widget-send svg {
    width: 18px;
    height: 18px;
}

/* Mobile responsive */
@media (max-width: 768px) {
    .chat-widget {
        bottom: 1rem;
        right: 1rem;
    }

    .chat-widget-popup {
        width: calc(100vw - 2rem);
        max-width: 380px;
    }
}
</style>

<script>
// Chat Widget functionality
document.addEventListener('DOMContentLoaded', () => {
    const chatWidgetTrigger = document.getElementById('chatWidgetTrigger');
    const chatWidgetPopup = document.getElementById('chatWidgetPopup');
    const chatWidgetClose = document.getElementById('chatWidgetClose');
    const chatWidgetForm = document.getElementById('chatWidgetForm');
    const chatWidgetInput = document.getElementById('chatWidgetInput');

    let isPopupOpen = false;

    // Toggle popup
    chatWidgetTrigger.addEventListener('click', () => {
        isPopupOpen = !isPopupOpen;
        if (isPopupOpen) {
            chatWidgetPopup.classList.add('show');
            chatWidgetInput.focus();
        } else {
            chatWidgetPopup.classList.remove('show');
        }
    });

    // Close popup
    chatWidgetClose.addEventListener('click', () => {
        isPopupOpen = false;
        chatWidgetPopup.classList.remove('show');
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
        if (isPopupOpen &&
            !chatWidgetPopup.contains(e.target) &&
            !chatWidgetTrigger.contains(e.target)) {
            isPopupOpen = false;
            chatWidgetPopup.classList.remove('show');
        }
    });

    // Handle suggestion clicks
    document.querySelectorAll('.chat-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            // Store prompt in sessionStorage and redirect to chat page
            sessionStorage.setItem('pendingPrompt', prompt);
            window.location.href = '/portai/public/chat.php';
        });
    });

    // Handle form submission
    chatWidgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const prompt = chatWidgetInput.value.trim();
        if (prompt) {
            // Store prompt in sessionStorage and redirect to chat page
            sessionStorage.setItem('pendingPrompt', prompt);
            window.location.href = '/portai/public/chat.php';
        }
    });

    // Enter to send (Shift+Enter for newline)
    chatWidgetInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatWidgetForm.dispatchEvent(new Event('submit'));
        }
    });
});
</script>
