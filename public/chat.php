<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistant - Portfolio AI</title>
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

    $chatCssFile = __DIR__ . '/css/chat.css';
    $chatCssVersion = file_exists($chatCssFile) ? filemtime($chatCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/chat.css?v={$chatCssVersion}\">";
    ?>

    <!-- Marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>

    <meta name="description" content="Chat with AI assistant for portfolio insights">
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>

    <main class="main-content chat-page">
        <!-- Chat Header -->
        <header class="chat-header">
            <div class="chat-header-left">
                <h1>AI Assistant</h1>
                <p>Get instant insights about your portfolios and clients</p>
            </div>
            <div class="chat-header-right">
                <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                <button class="btn btn-secondary btn-sm" id="newChatBtn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                </button>
            </div>
        </header>

        <!-- Chat Container -->
        <div class="chat-container" id="chatContainer">
            <div class="chat-messages" id="chatMessages">
                <!-- Welcome message -->
                <div class="chat-welcome">
                    <div class="welcome-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="48" height="48">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h2>Welcome to AI Assistant</h2>
                    <p>Ask me anything about your portfolio, clients, or financial analysis</p>
                </div>
            </div>
        </div>

        <!-- Chat Input -->
        <div class="chat-input-container">
            <!-- File Attachment Preview (hidden by default) -->
            <div class="chat-attachment-preview" id="attachmentPreview" style="display: none;">
                <div class="attachment-item">
                    <div class="attachment-icon"></div>
                    <div class="attachment-info">
                        <div class="attachment-name"></div>
                        <div class="attachment-size"></div>
                    </div>
                    <button type="button" class="attachment-remove" title="Remove attachment">&times;</button>
                </div>
            </div>

            <form class="chat-input-form" id="chatForm">
                <!-- Upload Button -->
                <button type="button" id="uploadBtn" class="chat-upload-btn" title="Upload file (CSV, Excel, PDF, images, Word, TXT)">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>

                <textarea
                    id="chatInput"
                    placeholder="Ask about your portfolios, clients, or financial insights..."
                    rows="1"
                    maxlength="4000"
                ></textarea>
                <button type="submit" id="sendBtn" class="chat-send-btn">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>

            <!-- Hidden File Input -->
            <input type="file" id="fileInput" accept=".csv,.xlsx,.xls,.pdf,.json,.docx,.doc,.txt,.jpg,.jpeg,.png,.tiff,.tif,.bmp" style="display: none;">

            <!-- Drag-Drop Overlay -->
            <div class="chat-drag-overlay" id="dragOverlay" style="display: none;">
                <div class="drag-overlay-content">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3>Drop file here</h3>
                    <p>Supports: CSV, Excel, PDF, JSON, images, Word, TXT</p>
                </div>
            </div>

            <div class="chat-input-footer">
                <span class="input-hint">AI can make mistakes. Verify important information.</span>
                <span class="char-count" id="charCount">0/4000</span>
            </div>
        </div>
    </main>

    <!-- Toast Notification -->
    <div class="toast" id="toast" style="display: none;"></div>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>

    <?php
    // Dynamically load JavaScript with cache busting
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";

    $chatJsFile = __DIR__ . '/js/chat.js';
    $chatJsVersion = file_exists($chatJsFile) ? filemtime($chatJsFile) : time();
    echo "<script src=\"/portai/public/js/chat.js?v={$chatJsVersion}\"></script>";
    ?>
</body>
</html>
